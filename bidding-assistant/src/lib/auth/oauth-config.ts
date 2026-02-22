/**
 * Google OAuth 配置（SaaS Phase 1B）
 *
 * 用途：
 * - Google Workspace OAuth 登入流程
 * - 員工身份驗證
 * - 多租戶租賃識別
 */

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  workspaceDomain: string;
  redirectUri: string;
}

/**
 * 取得 OAuth 配置
 */
export function getOAuthConfig(baseUrl?: string): OAuthConfig {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const workspaceDomain = process.env.NEXT_PUBLIC_WORKSPACE_DOMAIN;

  if (!clientId || !clientSecret || !workspaceDomain) {
    throw new Error(
      '缺少 Google OAuth 環境變數。' +
      '需要設定：NEXT_PUBLIC_GOOGLE_CLIENT_ID、GOOGLE_CLIENT_SECRET、NEXT_PUBLIC_WORKSPACE_DOMAIN'
    );
  }

  // 如果沒有提供 baseUrl，從環境變數推導
  const base = baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  return {
    clientId,
    clientSecret,
    workspaceDomain,
    redirectUri: `${base}/api/auth/callback`,
  };
}

/**
 * 生成 Google OAuth 授權 URL
 * 使用 Authorization Code Flow (OAuth 2.0)
 */
export function getAuthorizationUrl(baseUrl?: string): string {
  const config = getOAuthConfig(baseUrl);
  const scope = [
    'openid',
    'profile',
    'email',
  ].join(' ');

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope,
    // hd 參數限制登入域名
    hd: config.workspaceDomain,
    // 要求使用帳號選擇器
    prompt: 'select_account',
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * 交換授權碼換取 access token 和 ID token
 */
export async function exchangeAuthCode(
  code: string,
  baseUrl?: string,
): Promise<{
  accessToken: string;
  idToken: string;
  expiresIn: number;
}> {
  const config = getOAuthConfig(baseUrl);

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: config.redirectUri,
    }).toString(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OAuth token 交換失敗：${error.error_description || error.error}`);
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    idToken: data.id_token,
    expiresIn: data.expires_in,
  };
}

/**
 * 解析 ID Token（不驗證簽名，用於開發）
 * 注意：生產環境應驗證 JWT 簽名
 */
export function parseIdToken(idToken: string): {
  iss: string;
  sub: string;
  email: string;
  email_verified: boolean;
  hd: string;
  [key: string]: unknown;
} {
  const parts = idToken.split('.');
  if (parts.length !== 3) {
    throw new Error('無效的 JWT token');
  }

  try {
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64').toString('utf-8')
    );
    return payload;
  } catch (e) {
    throw new Error('無法解析 ID Token payload');
  }
}

/**
 * 驗證用戶是否來自允許的 Google Workspace 域名
 */
export function validateWorkspaceDomain(
  idTokenPayload: Record<string, unknown>,
  expectedDomain: string,
): boolean {
  const hd = idTokenPayload.hd as string | undefined;
  if (!hd) {
    return false;
  }
  return hd === expectedDomain;
}

/**
 * 從 ID Token 提取用戶信息
 */
export interface UserInfo {
  googleId: string;
  email: string;
  name?: string;
  picture?: string;
  domain: string;
}

export function extractUserInfo(
  idTokenPayload: Record<string, unknown>,
): UserInfo {
  return {
    googleId: idTokenPayload.sub as string,
    email: idTokenPayload.email as string,
    name: idTokenPayload.name as string | undefined,
    picture: idTokenPayload.picture as string | undefined,
    domain: idTokenPayload.hd as string,
  };
}
