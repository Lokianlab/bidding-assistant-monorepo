/**
 * Google OAuth2 認證
 *
 * 用 refresh token 自動換取 access token。
 * Access token 有效期 1 小時，這裡做簡單的記憶體快取。
 */

let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * 取得有效的 Google OAuth2 access token
 *
 * 自動用 refresh token 換新的 access token，並快取到過期前 5 分鐘。
 */
export async function getGoogleAccessToken(): Promise<string> {
  // 快取還沒過期就直接用
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      '缺少 Google OAuth 環境變數（GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN）',
    );
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const data = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };

  if (!res.ok || !data.access_token) {
    throw new Error(
      data.error_description ?? data.error ?? `Google token 換取失敗 (${res.status})`,
    );
  }

  // 快取，提前 5 分鐘過期以留緩衝
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 - 5 * 60 * 1000,
  };

  return data.access_token;
}

/** 清除快取（測試用） */
export function clearTokenCache(): void {
  cachedToken = null;
}
