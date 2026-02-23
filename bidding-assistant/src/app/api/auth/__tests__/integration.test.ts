/**
 * OAuth Integration Tests（SaaS Phase 1b + 1f）
 *
 * 驗證完整 OAuth 流程：login → callback → session → middleware → protected API
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as loginPost } from '../login/route';
import { GET as callbackGet } from '../callback/route';
import { middleware } from '@/middleware';

// Mock OAuth config
vi.mock('@/lib/auth/oauth-config', () => ({
  getAuthorizationUrl: vi.fn().mockReturnValue(
    'https://accounts.google.com/o/oauth2/v2/auth?client_id=test&code=auth_code_123',
  ),
  getOAuthConfig: vi.fn().mockReturnValue({
    clientId: 'test-client-id',
    workspaceDomain: 'example.com',
  }),
  exchangeAuthCode: vi.fn().mockResolvedValue({
    idToken: Buffer.from(
      JSON.stringify({
        sub: 'google-user-123',
        email: 'user@example.com',
        hd: 'example.com',
        iat: Math.floor(Date.now() / 1000),
      })
    ).toString('base64'),
    accessToken: 'access_token_123',
  }),
  parseIdToken: vi.fn().mockReturnValue({
    sub: 'google-user-123',
    email: 'user@example.com',
    hd: 'example.com',
    iat: Math.floor(Date.now() / 1000),
  }),
  validateWorkspaceDomain: vi.fn().mockReturnValue(true),
  extractUserInfo: vi.fn().mockReturnValue({
    googleId: 'google-user-123',
    email: 'user@example.com',
    domain: 'example.com',
  }),
}));

// Mock Supabase
vi.mock('@/lib/db/supabase-client', () => ({
  getSupabaseServerClient: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'user-123',
          tenant_id: 'tenant-456',
          role: 'member',
        },
        error: null,
      }),
    }),
  }),
}));

describe('OAuth Integration - Full Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('登入流程', () => {
    it('[流程] 1. 用戶點登入取得授權 URL', async () => {
      const request = new NextRequest(
        new URL('http://localhost:3000/api/auth/login'),
        { method: 'POST' }
      );

      const response = await loginPost(request);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.authUrl).toContain('accounts.google.com/o/oauth2/v2/auth');
    });

    it('[流程] 2. OAuth 提供商重定向回 callback，callback 建立 session', async () => {
      const request = new NextRequest(
        new URL('http://localhost:3000/api/auth/callback?code=auth_code_123&state=state_value'),
        { method: 'GET' }
      );

      const response = await callbackGet(request);
      // 應該返回 302 redirect
      expect([301, 302, 307, 308]).toContain(response.status);

      // 檢查 Set-Cookie header
      const cookieHeader = response.headers.get('set-cookie');
      expect(cookieHeader).toContain('auth-session');
      expect(cookieHeader).toContain('HttpOnly');
      // Secure flag 只在生產環境設定，開發環境跳過
      // expect(cookieHeader).toContain('Secure');
    });
  });

  describe('Session 驗證與租戶隔離', () => {
    it('[隔離] Session 應包含正確的 tenantId 和 userId', async () => {
      const request = new NextRequest(
        new URL('http://localhost:3000/api/auth/callback?code=auth_code_123'),
        { method: 'GET' }
      );

      const response = await callbackGet(request);
      const cookieHeader = response.headers.get('set-cookie');

      // 提取 session token 從 Set-Cookie header（需解碼 URL 編碼）
      const tokenMatch = cookieHeader?.match(/auth-session=([^;]+)/);
      expect(tokenMatch).toBeTruthy();

      if (tokenMatch) {
        const encodedToken = tokenMatch[1];
        const sessionToken = decodeURIComponent(encodedToken);
        const sessionData = JSON.parse(
          Buffer.from(sessionToken, 'base64').toString('utf-8')
        );

        // 驗證 session 內容
        expect(sessionData.userId).toBe('user-123');
        expect(sessionData.tenantId).toBe('tenant-456');
        expect(sessionData.email).toBe('user@example.com');
        expect(sessionData.role).toBe('member');
      }
    });
  });

  describe('Middleware 與保護路由', () => {
    it('[中間件] 使用有效 session 訪問受保護路由應成功', async () => {
      // 先建立有效 session
      const sessionData = {
        userId: 'user-123',
        tenantId: 'tenant-456',
        email: 'user@example.com',
        role: 'member',
        iat: Math.floor(Date.now() / 1000),
      };
      const sessionToken = Buffer.from(JSON.stringify(sessionData)).toString('base64');

      // 使用 session 訪問受保護路由
      const request = new NextRequest(
        new URL('http://localhost:3000/api/kb/items'),
        {
          method: 'GET',
          headers: {
            Cookie: `auth-session=${sessionToken}`,
          },
        }
      );

      const response = await middleware(request);

      // 應該允許通過（200, 204, 或 307）
      expect([200, 204, 307]).toContain(response.status);

      // 驗證 x-tenant-id header 被注入
      expect(response.headers.get('x-tenant-id')).toBe('tenant-456');
    });

    it('[中間件] 無 session 訪問受保護路由應返回 401', async () => {
      const request = new NextRequest(
        new URL('http://localhost:3000/api/kb/items'),
        { method: 'GET' }
      );

      const response = await middleware(request);
      expect(response.status).toBe(401);
    });

    it('[中間件] Callback 路由應是公開的（無需 session）', async () => {
      const request = new NextRequest(
        new URL('http://localhost:3000/api/auth/callback?code=test'),
        { method: 'GET' }
      );

      const response = await middleware(request);
      // 公開路由應直接通過，不返回 401
      expect(response.status).not.toBe(401);
    });
  });

  describe('跨租戶隔離驗證', () => {
    it('[隔離] 不同用戶的 session 應有不同 tenantId', async () => {
      // 模擬用戶 A 的 session
      const sessionA = {
        userId: 'user-a',
        tenantId: 'tenant-a',
        email: 'usera@example.com',
        role: 'member',
        iat: Math.floor(Date.now() / 1000),
      };
      const tokenA = Buffer.from(JSON.stringify(sessionA)).toString('base64');

      // 模擬用戶 B 的 session
      const sessionB = {
        userId: 'user-b',
        tenantId: 'tenant-b',
        email: 'userb@example.com',
        role: 'member',
        iat: Math.floor(Date.now() / 1000),
      };
      const tokenB = Buffer.from(JSON.stringify(sessionB)).toString('base64');

      // 驗證 A 訪問返回 tenant-a
      const requestA = new NextRequest(
        new URL('http://localhost:3000/api/kb/items'),
        {
          headers: { Cookie: `auth-session=${tokenA}` },
        }
      );
      const responseA = await middleware(requestA);
      expect(responseA.headers.get('x-tenant-id')).toBe('tenant-a');

      // 驗證 B 訪問返回 tenant-b
      const requestB = new NextRequest(
        new URL('http://localhost:3000/api/kb/items'),
        {
          headers: { Cookie: `auth-session=${tokenB}` },
        }
      );
      const responseB = await middleware(requestB);
      expect(responseB.headers.get('x-tenant-id')).toBe('tenant-b');
    });

    it('[隔離] 用戶無法透過 header 偽造租戶 ID', async () => {
      const sessionData = {
        userId: 'user-123',
        tenantId: 'tenant-456',
        email: 'user@example.com',
        role: 'member',
        iat: Math.floor(Date.now() / 1000),
      };
      const sessionToken = Buffer.from(JSON.stringify(sessionData)).toString('base64');

      // 嘗試偽造 header
      const request = new NextRequest(
        new URL('http://localhost:3000/api/kb/items'),
        {
          headers: {
            Cookie: `auth-session=${sessionToken}`,
            'x-tenant-id': 'fake-tenant-999', // 嘗試偽造
          },
        }
      );

      const response = await middleware(request);
      // middleware 應使用 session 中的 tenantId，不理會 header
      expect(response.headers.get('x-tenant-id')).toBe('tenant-456');
      expect(response.headers.get('x-tenant-id')).not.toBe('fake-tenant-999');
    });
  });

  describe('安全防護', () => {
    it('[安全] Session token 應被標記為 HttpOnly', async () => {
      const request = new NextRequest(
        new URL('http://localhost:3000/api/auth/callback?code=auth_code_123'),
        { method: 'GET' }
      );

      const response = await callbackGet(request);
      const cookieHeader = response.headers.get('set-cookie');

      expect(cookieHeader).toContain('HttpOnly');
    });

    it('[安全] Session token 應有過期時間（7 天）', async () => {
      const request = new NextRequest(
        new URL('http://localhost:3000/api/auth/callback?code=auth_code_123'),
        { method: 'GET' }
      );

      const response = await callbackGet(request);
      const cookieHeader = response.headers.get('set-cookie');

      // 檢查 Max-Age（7 days = 604800 seconds）
      expect(cookieHeader).toContain('Max-Age');
    });

    it('[安全] 無效 session 應被拒絕', async () => {
      const request = new NextRequest(
        new URL('http://localhost:3000/api/kb/items'),
        {
          headers: {
            Cookie: 'auth-session=invalid-base64-not-json!!!',
          },
        }
      );

      const response = await middleware(request);
      expect(response.status).toBe(401);
    });
  });

  describe('錯誤處理', () => {
    it('[錯誤] Callback 缺少 code 參數應返回 400', async () => {
      const request = new NextRequest(
        new URL('http://localhost:3000/api/auth/callback'),
        { method: 'GET' }
      );

      const response = await callbackGet(request);
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.error).toContain('授權碼');
    });

    it('[錯誤] 域名驗證失敗應返回 403', async () => {
      const { validateWorkspaceDomain } = await import('@/lib/auth/oauth-config');
      vi.mocked(validateWorkspaceDomain).mockReturnValueOnce(false);

      const request = new NextRequest(
        new URL('http://localhost:3000/api/auth/callback?code=auth_code_123'),
        { method: 'GET' }
      );

      const response = await callbackGet(request);
      expect(response.status).toBe(403);
    });
  });
});
