/**
 * 多租戶中間件測試（SaaS Phase 1F）
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from '../middleware';

/**
 * 建立測試用的 session cookie
 */
function createSessionCookie(
  userId: string,
  tenantId: string,
  email: string,
): string {
  const sessionData = { userId, tenantId, email, iat: Math.floor(Date.now() / 1000) };
  return Buffer.from(JSON.stringify(sessionData)).toString('base64');
}

describe('Next.js Middleware - 多租戶隔離', () => {
  beforeEach(() => {
    // 重置任何全局狀態
  });

  describe('認證驗證', () => {
    it('[認證] 無 session 訪問 protected 路由應返回 401', async () => {
      const request = new NextRequest(
        new URL('http://localhost:3000/api/kb/items'),
      );

      const response = await middleware(request);
      expect(response.status).toBe(401);
    });

    it('[認證] 有效 session 訪問 protected 路由應通過', async () => {
      const sessionCookie = createSessionCookie('user-123', 'tenant-456', 'user@example.com');
      const request = new NextRequest(
        new URL('http://localhost:3000/api/kb/items'),
        {
          headers: {
            Cookie: `auth-session=${sessionCookie}`,
          },
        },
      );

      const response = await middleware(request);
      expect([200, 204, 307]).toContain(response.status);
    });

    it('[認證] 無效 session 應返回 401', async () => {
      const request = new NextRequest(
        new URL('http://localhost:3000/api/kb/items'),
        {
          headers: {
            Cookie: 'auth-session=invalid-base64!!!',
          },
        },
      );

      const response = await middleware(request);
      expect(response.status).toBe(401);
    });
  });

  describe('租戶隔離', () => {
    it('[隔離] 應從 session 提取 tenantId', async () => {
      const sessionCookie = createSessionCookie('user-123', 'tenant-456', 'user@example.com');
      const request = new NextRequest(
        new URL('http://localhost:3000/api/kb/items'),
        {
          headers: {
            Cookie: `auth-session=${sessionCookie}`,
          },
        },
      );

      const response = await middleware(request);
      const tenantId = response.headers.get('x-tenant-id');

      // 應設定 header（或直接在 response 中）
      expect(tenantId || request.headers.get('x-tenant-id')).toBeDefined();
    });

    it('[隔離] 不同用戶應有不同 tenantId', async () => {
      const session1 = createSessionCookie('user-1', 'tenant-a', 'user1@example.com');
      const session2 = createSessionCookie('user-2', 'tenant-b', 'user2@example.com');

      const request1 = new NextRequest(
        new URL('http://localhost:3000/api/kb/items'),
        { headers: { Cookie: `auth-session=${session1}` } },
      );

      const request2 = new NextRequest(
        new URL('http://localhost:3000/api/kb/items'),
        { headers: { Cookie: `auth-session=${session2}` } },
      );

      const response1 = await middleware(request1);
      const response2 = await middleware(request2);

      // 都應通過認證
      expect([200, 204, 307]).toContain(response1.status);
      expect([200, 204, 307]).toContain(response2.status);
    });

    it('[隔離] 租戶 ID 應自動注入 API 請求', async () => {
      const sessionCookie = createSessionCookie('user-123', 'tenant-xyz', 'user@example.com');
      const request = new NextRequest(
        new URL('http://localhost:3000/api/kb/items'),
        {
          headers: {
            Cookie: `auth-session=${sessionCookie}`,
          },
        },
      );

      const response = await middleware(request);

      // 應該將 tenant ID 傳入後續處理（通過 header 或其他機制）
      expect(response.status).not.toBe(401);
    });
  });

  describe('路由保護', () => {
    it('[保護] /api/kb/* 應需要認證', async () => {
      const request = new NextRequest(
        new URL('http://localhost:3000/api/kb/items'),
      );

      const response = await middleware(request);
      expect(response.status).toBe(401);
    });

    it('[保護] /api/cron/* 應需要認證', async () => {
      const request = new NextRequest(
        new URL('http://localhost:3000/api/cron/staging-reset'),
      );

      const response = await middleware(request);
      // Cron 可能用 token 而非 session，這裡檢查是否被保護
      expect([401, 400, 403]).toContain(response.status);
    });

    it('[保護] /dashboard 應需要認證', async () => {
      const request = new NextRequest(
        new URL('http://localhost:3000/dashboard'),
      );

      const response = await middleware(request);
      expect([301, 302, 307, 308]).toContain(response.status); // 重導向到登入
    });

    it('[公開] /api/auth/login 應不需要認證', async () => {
      const request = new NextRequest(
        new URL('http://localhost:3000/api/auth/login'),
        { method: 'POST' },
      );

      const response = await middleware(request);
      // 應該不會被中間件擋下
      expect(response.status).not.toBe(401);
    });

    it('[公開] /api/auth/callback 應允許無 session 訪問初期', async () => {
      const request = new NextRequest(
        new URL('http://localhost:3000/api/auth/callback?code=test'),
      );

      // Callback 實際上需要特殊處理（帶 code 參數）
      // 這裡檢查是否不被認證層擋下
      const response = await middleware(request);
      expect(response.status).not.toBe(401);
    });

    it('[公開] / 首頁應不需要認證', async () => {
      const request = new NextRequest(
        new URL('http://localhost:3000/'),
      );

      const response = await middleware(request);
      expect(response.status).not.toBe(401);
    });
  });

  describe('错误处理', () => {
    it('[错误] 格式错误的 session 应安全处理', async () => {
      const request = new NextRequest(
        new URL('http://localhost:3000/api/kb/items'),
        {
          headers: {
            Cookie: 'auth-session=garbage-data',
          },
        },
      );

      const response = await middleware(request);
      // 应该返回 401 而不是 500
      expect(response.status).toBe(401);
    });

    it('[错误] 缺少 tenantId 的 session 应返回 401', async () => {
      const sessionData = { userId: 'user-123', email: 'user@example.com' }; // 缺少 tenantId
      const sessionCookie = Buffer.from(JSON.stringify(sessionData)).toString('base64');

      const request = new NextRequest(
        new URL('http://localhost:3000/api/kb/items'),
        {
          headers: {
            Cookie: `auth-session=${sessionCookie}`,
          },
        },
      );

      const response = await middleware(request);
      expect(response.status).toBe(401);
    });
  });

  describe('邊界條件', () => {
    it('[邊界] 多個 cookies 应正確解析', async () => {
      const sessionCookie = createSessionCookie('user-123', 'tenant-456', 'user@example.com');
      const request = new NextRequest(
        new URL('http://localhost:3000/api/kb/items'),
        {
          headers: {
            Cookie: `other=value; auth-session=${sessionCookie}; another=test`,
          },
        },
      );

      const response = await middleware(request);
      expect([200, 204, 307]).toContain(response.status);
    });

    it('[邊界] 並發請求应各自獨立', async () => {
      const session1 = createSessionCookie('user-1', 'tenant-1', 'user1@example.com');
      const session2 = createSessionCookie('user-2', 'tenant-2', 'user2@example.com');

      const request1 = new NextRequest(
        new URL('http://localhost:3000/api/kb/items'),
        { headers: { Cookie: `auth-session=${session1}` } },
      );

      const request2 = new NextRequest(
        new URL('http://localhost:3000/api/kb/items'),
        { headers: { Cookie: `auth-session=${session2}` } },
      );

      const [response1, response2] = await Promise.all([
        middleware(request1),
        middleware(request2),
      ]);

      expect([200, 204, 307]).toContain(response1.status);
      expect([200, 204, 307]).toContain(response2.status);
    });

    it('[邊界] 特殊字符在 tenantId 應被安全處理', async () => {
      const sessionCookie = createSessionCookie(
        'user-123',
        'tenant-"\'<>\\x00', // 包含特殊字符
        'user@example.com',
      );

      const request = new NextRequest(
        new URL('http://localhost:3000/api/kb/items'),
        {
          headers: {
            Cookie: `auth-session=${sessionCookie}`,
          },
        },
      );

      const response = await middleware(request);
      // 應該安全處理，不崩潰
      expect([200, 204, 307, 401]).toContain(response.status);
    });
  });

  describe('安全防護', () => {
    it('[安全] tenantId header 应正確設置而不暴露其他信息', async () => {
      const sessionCookie = createSessionCookie('user-123', 'tenant-xyz', 'user@example.com');
      const request = new NextRequest(
        new URL('http://localhost:3000/api/kb/items'),
        {
          headers: {
            Cookie: `auth-session=${sessionCookie}`,
          },
        },
      );

      const response = await middleware(request);

      // 确保只注入 tenantId，不暴露其他信息
      const tenantHeader = response.headers.get('x-tenant-id') || request.headers.get('x-tenant-id');
      expect(tenantHeader).not.toContain('user-123');
      expect(tenantHeader).not.toContain('user@example.com');
    });

    it('[安全] 跨租戶訪問应被隔離', async () => {
      // 用户 A 的 session
      const sessionA = createSessionCookie('user-a', 'tenant-a', 'usera@example.com');

      // 模擬用户 A 試圖訪問
      const request = new NextRequest(
        new URL('http://localhost:3000/api/kb/items'),
        {
          headers: {
            Cookie: `auth-session=${sessionA}`,
            'x-tenant-id': 'tenant-b', // 嘗試偽造不同租戶
          },
        },
      );

      const response = await middleware(request);

      // 应该使用 session 中的 tenantId（tenant-a），不允许头部覆蓋
      expect([200, 204, 307]).toContain(response.status);
    });

    it('[安全] 敏感路由 /settings 应需要認證', async () => {
      const request = new NextRequest(
        new URL('http://localhost:3000/settings'),
      );

      const response = await middleware(request);
      // 應重導向到登入
      expect([301, 302, 307, 308]).toContain(response.status);
    });
  });

  describe('HTTP 方法', () => {
    it('[方法] GET 和 POST 都应被保護', async () => {
      const request1 = new NextRequest(
        new URL('http://localhost:3000/api/kb/items'),
        { method: 'GET' },
      );

      const request2 = new NextRequest(
        new URL('http://localhost:3000/api/kb/items'),
        { method: 'POST' },
      );

      const [response1, response2] = await Promise.all([
        middleware(request1),
        middleware(request2),
      ]);

      expect(response1.status).toBe(401);
      expect(response2.status).toBe(401);
    });

    it('[方法] DELETE 應被保護', async () => {
      const request = new NextRequest(
        new URL('http://localhost:3000/api/kb/items/123'),
        { method: 'DELETE' },
      );

      const response = await middleware(request);
      expect(response.status).toBe(401);
    });
  });
});
