/**
 * GET /api/auth/callback
 *
 * Google OAuth 回調處理
 * 1. 交換授權碼換取 token
 * 2. 驗證用戶域名
 * 3. 在 Supabase 建立或更新用戶
 * 4. 設定 session 並重定向
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  exchangeAuthCode,
  parseIdToken,
  validateWorkspaceDomain,
  extractUserInfo,
  getOAuthConfig,
} from '@/lib/auth/oauth-config';
import { getSupabaseServerClient } from '@/lib/db/supabase-client';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. 取得授權碼
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code) {
      return NextResponse.json(
        { error: '缺少授權碼' },
        { status: 400 }
      );
    }

    // 2. 交換 token
    const baseUrl = new URL(request.url).origin;
    const config = getOAuthConfig(baseUrl);
    const { idToken } = await exchangeAuthCode(code, baseUrl);

    // 3. 解析 ID token
    const idTokenPayload = parseIdToken(idToken);

    // 4. 驗證域名
    if (!validateWorkspaceDomain(idTokenPayload, config.workspaceDomain)) {
      return NextResponse.json(
        {
          error: `只允許 ${config.workspaceDomain} 域名登入`,
        },
        { status: 403 }
      );
    }

    // 5. 提取用戶信息
    const userInfo = extractUserInfo(idTokenPayload);

    // 6. 在 Supabase 中建立或更新用戶
    let supabase: ReturnType<typeof getSupabaseServerClient>;
    try {
      supabase = getSupabaseServerClient();
    } catch (err) {
      return NextResponse.json(
        { error: '資料庫配置錯誤，請聯繫管理員' },
        { status: 500 }
      );
    }

    // 先查詢是否存在此用戶
    const { data: existingUser, error: queryError } = await supabase
      .from('users')
      .select('id, tenant_id, role')
      .eq('google_email', userInfo.email)
      .single();

    if (queryError && queryError.code !== 'PGRST116') {
      // PGRST116 = no rows returned
      throw new Error(`查詢用戶失敗：${queryError.message}`);
    }

    let userId: string;
    let tenantId: string;
    let role: 'admin' | 'member' | 'viewer';

    if (existingUser) {
      // 用戶已存在，直接使用
      userId = existingUser.id;
      tenantId = existingUser.tenant_id;
      role = existingUser.role || 'member';
    } else {
      // 新用戶，需要建立租戶和用戶
      // 首先建立租戶（以 domain 為識別）
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .insert({
          name: userInfo.domain,
          google_workspace_domain: userInfo.domain,
        })
        .select('id')
        .single();

      if (tenantError) {
        throw new Error(`建立租戶失敗：${tenantError.message}`);
      }

      tenantId = tenantData.id;

      // 建立用戶
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          tenant_id: tenantId,
          google_email: userInfo.email,
          role: 'member', // Phase 1 預設角色
        })
        .select('id')
        .single();

      if (userError) {
        throw new Error(`建立用戶失敗：${userError.message}`);
      }

      userId = newUser.id;
      role = 'member';
    }

    // 7. 建立 session（簡單實現：存放 JWT-like token）
    // 實際應用應使用更安全的 session 機制
    const sessionData = {
      userId,
      tenantId,
      email: userInfo.email,
      googleId: userInfo.googleId,
      role,
      iat: Math.floor(Date.now() / 1000),
    };

    // 簽名 session（簡單 base64 編碼，生產應使用真實 JWT）
    const sessionToken = Buffer.from(JSON.stringify(sessionData)).toString(
      'base64'
    );

    // 8. 設定 cookie 並重定向
    const response = NextResponse.redirect(new URL('/', request.url), {
      status: 302,
    });

    response.cookies.set('auth-session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    // 同時在 URL 中傳遞租戶 ID（用於初始化）
    const redirectUrl = new URL('/', request.url);
    redirectUrl.searchParams.set('tenant', tenantId);
    response.headers.set('location', redirectUrl.toString());

    return response;
  } catch (error) {
    console.error('OAuth callback error:', error);
    const message = error instanceof Error ? error.message : '登入失敗';
    const errorUrl = new URL('/auth/error', request.url);
    errorUrl.searchParams.set('error', message);
    return NextResponse.redirect(errorUrl, {
      status: 302,
    });
  }
}
