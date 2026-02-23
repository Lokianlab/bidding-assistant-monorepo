/**
 * Session 管理測試 (P1F)
 *
 * 驗證：
 * - Session 從 cookie 提取
 * - 租戶上下文從 headers 提取
 * - 型別驗證
 */

import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import {
  getSessionFromRequest,
  getContextFromHeaders,
  SessionData,
  TenantContext,
} from '@/lib/auth/session';

describe('Session Management - P1F', () => {
  describe('getSessionFromRequest - 從 cookie 提取 session', () => {
    it('應從 auth-session cookie 解析 session', async () => {
      const sessionData: SessionData = {
        userId: 'user-123',
        tenantId: 'tenant-456',
        email: 'user@example.com',
        googleId: 'google-123',
        role: 'member',
        iat: 1000,
      };

      const sessionToken = Buffer.from(JSON.stringify(sessionData)).toString(
        'base64'
      );

      const request = new NextRequest(new URL('http://localhost:3000/api/test'), {
        headers: {
          cookie: `auth-session=${sessionToken}`,
        },
      });

      const session = await getSessionFromRequest(request);

      expect(session).not.toBeNull();
      expect(session?.userId).toBe('user-123');
      expect(session?.tenantId).toBe('tenant-456');
      expect(session?.email).toBe('user@example.com');
      expect(session?.role).toBe('member');
    });

    it('無 cookie 時應返回 null', async () => {
      const request = new NextRequest(new URL('http://localhost:3000/api/test'));

      const session = await getSessionFromRequest(request);

      expect(session).toBeNull();
    });

    it('無 auth-session cookie 時應返回 null', async () => {
      const request = new NextRequest(new URL('http://localhost:3000/api/test'), {
        headers: {
          cookie: 'other-cookie=value',
        },
      });

      const session = await getSessionFromRequest(request);

      expect(session).toBeNull();
    });

    it('無效 base64 時應返回 null', async () => {
      const request = new NextRequest(new URL('http://localhost:3000/api/test'), {
        headers: {
          cookie: 'auth-session=invalid-base64!!!',
        },
      });

      const session = await getSessionFromRequest(request);

      expect(session).toBeNull();
    });

    it('缺少必填欄位（userId）時應返回 null', async () => {
      const incompleteSession = {
        tenantId: 'tenant-456',
        email: 'user@example.com',
        googleId: 'google-123',
        role: 'member',
        iat: 1000,
      };

      const sessionToken = Buffer.from(
        JSON.stringify(incompleteSession)
      ).toString('base64');

      const request = new NextRequest(new URL('http://localhost:3000/api/test'), {
        headers: {
          cookie: `auth-session=${sessionToken}`,
        },
      });

      const session = await getSessionFromRequest(request);

      expect(session).toBeNull();
    });

    it('缺少必填欄位（email）時應返回 null', async () => {
      const incompleteSession = {
        userId: 'user-123',
        tenantId: 'tenant-456',
        googleId: 'google-123',
        role: 'member',
        iat: 1000,
      };

      const sessionToken = Buffer.from(
        JSON.stringify(incompleteSession)
      ).toString('base64');

      const request = new NextRequest(new URL('http://localhost:3000/api/test'), {
        headers: {
          cookie: `auth-session=${sessionToken}`,
        },
      });

      const session = await getSessionFromRequest(request);

      expect(session).toBeNull();
    });

    it('應包含 role 欄位（用於 P1F 權限檢查）', async () => {
      const sessionData: SessionData = {
        userId: 'user-123',
        tenantId: 'tenant-456',
        email: 'user@example.com',
        googleId: 'google-123',
        role: 'admin',
        iat: 1000,
      };

      const sessionToken = Buffer.from(JSON.stringify(sessionData)).toString(
        'base64'
      );

      const request = new NextRequest(new URL('http://localhost:3000/api/test'), {
        headers: {
          cookie: `auth-session=${sessionToken}`,
        },
      });

      const session = await getSessionFromRequest(request);

      expect(session?.role).toBe('admin');
    });
  });

  describe('多租戶 Session 隔離', () => {
    it('租戶 A 的 session 應包含 tenant-a', async () => {
      const sessionData: SessionData = {
        userId: 'user-a',
        tenantId: 'tenant-a',
        email: 'user-a@company.com',
        googleId: 'google-a',
        role: 'member',
        iat: 1000,
      };

      const sessionToken = Buffer.from(JSON.stringify(sessionData)).toString(
        'base64'
      );

      const request = new NextRequest(new URL('http://localhost:3000/api/test'), {
        headers: {
          cookie: `auth-session=${sessionToken}`,
        },
      });

      const session = await getSessionFromRequest(request);

      expect(session?.tenantId).toBe('tenant-a');
    });

    it('租戶 B 的 session 應包含 tenant-b（與租戶 A 不同）', async () => {
      const sessionData: SessionData = {
        userId: 'user-b',
        tenantId: 'tenant-b',
        email: 'user-b@other.com',
        googleId: 'google-b',
        role: 'member',
        iat: 2000,
      };

      const sessionToken = Buffer.from(JSON.stringify(sessionData)).toString(
        'base64'
      );

      const request = new NextRequest(new URL('http://localhost:3000/api/test'), {
        headers: {
          cookie: `auth-session=${sessionToken}`,
        },
      });

      const session = await getSessionFromRequest(request);

      expect(session?.tenantId).toBe('tenant-b');
      expect(session?.tenantId).not.toBe('tenant-a');
    });
  });

  describe('getContextFromHeaders - 從 headers 提取上下文', () => {
    it('應從 headers 提取租戶上下文', () => {
      const request = new NextRequest(new URL('http://localhost:3000/api/test'), {
        headers: {
          'x-tenant-id': 'tenant-xyz',
          'x-user-id': 'user-abc',
          'x-user-role': 'admin',
        },
      });

      const context = getContextFromHeaders(request);

      expect(context).not.toBeNull();
      expect(context?.tenantId).toBe('tenant-xyz');
      expect(context?.userId).toBe('user-abc');
      expect(context?.role).toBe('admin');
    });

    it('缺少任何 header 時應返回 null', () => {
      const request = new NextRequest(new URL('http://localhost:3000/api/test'), {
        headers: {
          'x-tenant-id': 'tenant-xyz',
          // 缺少 x-user-id 和 x-user-role
        },
      });

      const context = getContextFromHeaders(request);

      expect(context).toBeNull();
    });

    it('無 headers 時應返回 null', () => {
      const request = new NextRequest(new URL('http://localhost:3000/api/test'));

      const context = getContextFromHeaders(request);

      expect(context).toBeNull();
    });
  });

  describe('角色型別驗證', () => {
    it('admin 角色應被接受', async () => {
      const sessionData: SessionData = {
        userId: 'user-123',
        tenantId: 'tenant-456',
        email: 'user@example.com',
        googleId: 'google-123',
        role: 'admin',
        iat: 1000,
      };

      const sessionToken = Buffer.from(JSON.stringify(sessionData)).toString(
        'base64'
      );

      const request = new NextRequest(new URL('http://localhost:3000/api/test'), {
        headers: {
          cookie: `auth-session=${sessionToken}`,
        },
      });

      const session = await getSessionFromRequest(request);

      expect(session?.role).toBe('admin');
    });

    it('member 角色應被接受', async () => {
      const sessionData: SessionData = {
        userId: 'user-123',
        tenantId: 'tenant-456',
        email: 'user@example.com',
        googleId: 'google-123',
        role: 'member',
        iat: 1000,
      };

      const sessionToken = Buffer.from(JSON.stringify(sessionData)).toString(
        'base64'
      );

      const request = new NextRequest(new URL('http://localhost:3000/api/test'), {
        headers: {
          cookie: `auth-session=${sessionToken}`,
        },
      });

      const session = await getSessionFromRequest(request);

      expect(session?.role).toBe('member');
    });

    it('viewer 角色應被接受', async () => {
      const sessionData: SessionData = {
        userId: 'user-123',
        tenantId: 'tenant-456',
        email: 'user@example.com',
        googleId: 'google-123',
        role: 'viewer',
        iat: 1000,
      };

      const sessionToken = Buffer.from(JSON.stringify(sessionData)).toString(
        'base64'
      );

      const request = new NextRequest(new URL('http://localhost:3000/api/test'), {
        headers: {
          cookie: `auth-session=${sessionToken}`,
        },
      });

      const session = await getSessionFromRequest(request);

      expect(session?.role).toBe('viewer');
    });
  });

  describe('Session 數據完整性', () => {
    it('Session 應包含所有必填欄位', async () => {
      const sessionData: SessionData = {
        userId: 'user-123',
        tenantId: 'tenant-456',
        email: 'user@example.com',
        googleId: 'google-123',
        role: 'member',
        iat: 1000,
      };

      const sessionToken = Buffer.from(JSON.stringify(sessionData)).toString(
        'base64'
      );

      const request = new NextRequest(new URL('http://localhost:3000/api/test'), {
        headers: {
          cookie: `auth-session=${sessionToken}`,
        },
      });

      const session = await getSessionFromRequest(request);

      expect(session).toHaveProperty('userId');
      expect(session).toHaveProperty('tenantId');
      expect(session).toHaveProperty('email');
      expect(session).toHaveProperty('googleId');
      expect(session).toHaveProperty('role');
      expect(session).toHaveProperty('iat');
    });

    it('Session 的 iat 應是時間戳', async () => {
      const currentTime = Math.floor(Date.now() / 1000);
      const sessionData: SessionData = {
        userId: 'user-123',
        tenantId: 'tenant-456',
        email: 'user@example.com',
        googleId: 'google-123',
        role: 'member',
        iat: currentTime,
      };

      const sessionToken = Buffer.from(JSON.stringify(sessionData)).toString(
        'base64'
      );

      const request = new NextRequest(new URL('http://localhost:3000/api/test'), {
        headers: {
          cookie: `auth-session=${sessionToken}`,
        },
      });

      const session = await getSessionFromRequest(request);

      expect(typeof session?.iat).toBe('number');
      expect(session?.iat).toBeGreaterThan(0);
    });
  });
});
