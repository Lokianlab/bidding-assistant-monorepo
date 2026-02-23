/**
 * OAuth Login Route 測試（SaaS Phase 1B）
 *
 * 注意：現有實現為 JSON API 模式（非 next-auth）
 * 規格要求用 next-auth，待遷移
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../login/route';

// Mock OAuth config
vi.mock('@/lib/auth/oauth-config', () => ({
  getAuthorizationUrl: vi.fn().mockReturnValue(
    'https://accounts.google.com/o/oauth2/v2/auth?client_id=test&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fapi%2Fauth%2Fcallback&response_type=code&scope=openid&hd=example.com&prompt=select_account',
  ),
}));

describe('OAuth Login Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('登入流程', () => {
    it('[流程] POST 應返回授權 URL', async () => {
      const request = new NextRequest(
        new URL('http://localhost:3000/api/auth/login'),
        { method: 'POST' },
      );

      const response = await POST(request);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.authUrl).toContain('accounts.google.com/o/oauth2/v2/auth');
    });

    it('[響應] 應返回 JSON 含 authUrl', async () => {
      const request = new NextRequest(
        new URL('http://localhost:3000/api/auth/login'),
        { method: 'POST' },
      );

      const response = await POST(request);
      const body = await response.json();

      expect(body).toHaveProperty('authUrl');
      expect(typeof body.authUrl).toBe('string');
    });

    it('[URL 內容] authUrl 應包含 client_id 和 scope', async () => {
      const request = new NextRequest(
        new URL('http://localhost:3000/api/auth/login'),
        { method: 'POST' },
      );

      const response = await POST(request);
      const body = await response.json();
      const url = new URL(body.authUrl);

      expect(url.searchParams.get('client_id')).toBe('test');
      expect(url.searchParams.get('response_type')).toBe('code');
      expect(url.searchParams.get('scope')).toContain('openid');
    });
  });

  describe('環境驗證', () => {
    it('[驗證] 環境變數缺失應返回 400', async () => {
      const { getAuthorizationUrl } = await import('@/lib/auth/oauth-config');
      vi.mocked(getAuthorizationUrl).mockImplementationOnce(() => {
        throw new Error('缺少 Google OAuth 環境變數');
      });

      const request = new NextRequest(
        new URL('http://localhost:3000/api/auth/login'),
        { method: 'POST' },
      );

      const response = await POST(request);
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body).toHaveProperty('error');
    });

    it('[驗證] 有效環境應成功返回 URL', async () => {
      const request = new NextRequest(
        new URL('http://localhost:3000/api/auth/login'),
        { method: 'POST' },
      );

      const response = await POST(request);
      expect(response.status).toBe(200);
    });
  });

  describe('錯誤處理', () => {
    it('[錯誤] 異常應返回 400 + error 消息', async () => {
      const { getAuthorizationUrl } = await import('@/lib/auth/oauth-config');
      vi.mocked(getAuthorizationUrl).mockImplementationOnce(() => {
        throw new Error('Unexpected error');
      });

      const request = new NextRequest(
        new URL('http://localhost:3000/api/auth/login'),
        { method: 'POST' },
      );

      const response = await POST(request);
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.error).toContain('Unexpected error');
    });
  });

  describe('邊界條件', () => {
    it('[邊界] 多次登入請求應各自獨立', async () => {
      const request1 = new NextRequest(
        new URL('http://localhost:3000/api/auth/login'),
        { method: 'POST' },
      );
      const request2 = new NextRequest(
        new URL('http://localhost:3000/api/auth/login'),
        { method: 'POST' },
      );

      const [response1, response2] = await Promise.all([
        POST(request1),
        POST(request2),
      ]);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
    });

    it('[邊界] 帶 query 參數應被忽略', async () => {
      const request = new NextRequest(
        new URL(
          'http://localhost:3000/api/auth/login?extra=param&secret=key',
        ),
        { method: 'POST' },
      );

      const response = await POST(request);
      expect(response.status).toBe(200);
    });
  });

  describe('安全防護', () => {
    it('[安全] 返回的 authUrl 應不包含敏感本地信息', async () => {
      const request = new NextRequest(
        new URL('http://localhost:3000/api/auth/login'),
        { method: 'POST' },
      );

      const response = await POST(request);
      const body = await response.json();
      const url = body.authUrl;

      // 不應暴露本地路徑或內部配置
      expect(url).not.toContain('/api/');
      expect(url).not.toContain('process.env');
    });

    it('[安全] clientSecret 不應暴露在客戶端 URL 中', async () => {
      const request = new NextRequest(
        new URL('http://localhost:3000/api/auth/login'),
        { method: 'POST' },
      );

      const response = await POST(request);
      const body = await response.json();
      const url = body.authUrl;

      // Secret 應該只在服務器端使用
      expect(url).not.toContain('secret');
      expect(url).not.toContain('test-secret');
    });
  });
});
