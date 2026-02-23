/**
 * P1e Cron 路由集成測試 — GET /api/cron/sync-notion
 *
 * 測試主要路徑：
 * - 認證（x-cron-secret header）
 * - 無租戶情況
 * - 回應格式驗證
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock 依賴
vi.mock('@/lib/kb/notion-sync');
vi.mock('@/lib/logger');
vi.mock('@/lib/db/supabase-client');
vi.mock('@notionhq/client');

function createMockRequest(
  url: string = 'http://localhost:3000/api/cron/sync-notion',
  headers: Record<string, string> = {}
): Request {
  const map = new Map(Object.entries(headers));
  return {
    headers: {
      get: (key: string) => map.get(key) || null,
    },
    url,
  } as any;
}

describe('GET /api/cron/sync-notion', () => {
  beforeEach(() => {
    vi.stubEnv('CRON_SECRET', 'test-secret-key');
    vi.stubEnv('NOTION_TOKEN', 'notion-test-token');
    vi.stubEnv('NOTION_KB_DB_ID', 'notion-db-test-id');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  describe('認證', () => {
    it('應該拒絕缺少 x-cron-secret 的請求', async () => {
      const { GET } = await import('../route');
      const req = createMockRequest();
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json).toHaveProperty('error');
    });

    it('應該拒絕錯誤的 x-cron-secret', async () => {
      const { GET } = await import('../route');
      const req = createMockRequest(
        'http://localhost:3000/api/cron/sync-notion',
        { 'x-cron-secret': 'wrong-secret' }
      );
      const res = await GET(req);

      expect(res.status).toBe(401);
    });
  });

  describe('基本功能', () => {
    it('應該接受正確的 x-cron-secret 並返回 200', async () => {
      const { getSupabaseServerClient } = await import(
        '@/lib/db/supabase-client'
      );
      const { GET } = await import('../route');

      // Mock Supabase 客戶端返回空租戶清單
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      };
      vi.mocked(getSupabaseServerClient).mockReturnValue(mockSupabase);

      const req = createMockRequest(
        'http://localhost:3000/api/cron/sync-notion',
        { 'x-cron-secret': 'test-secret-key' }
      );
      const res = await GET(req);

      expect(res.status).toBe(200);
    });

    it('應該在無租戶時返回成功 (succeeded: 0, failed: 0)', async () => {
      const { getSupabaseServerClient } = await import(
        '@/lib/db/supabase-client'
      );
      const { GET } = await import('../route');

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      };
      vi.mocked(getSupabaseServerClient).mockReturnValue(mockSupabase);

      const req = createMockRequest(
        'http://localhost:3000/api/cron/sync-notion',
        { 'x-cron-secret': 'test-secret-key' }
      );
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.synced).toEqual({
        succeeded: 0,
        failed: 0,
      });
    });

    it('應該在無租戶時返回 0 秒的執行時間', async () => {
      const { getSupabaseServerClient } = await import(
        '@/lib/db/supabase-client'
      );
      const { GET } = await import('../route');

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      };
      vi.mocked(getSupabaseServerClient).mockReturnValue(mockSupabase);

      const req = createMockRequest(
        'http://localhost:3000/api/cron/sync-notion',
        { 'x-cron-secret': 'test-secret-key' }
      );
      const res = await GET(req);
      const json = await res.json();

      expect(json.duration).toBe('0.0');
    });
  });

  describe('回應格式', () => {
    it('應該包含 success、synced 和 duration', async () => {
      const { getSupabaseServerClient } = await import(
        '@/lib/db/supabase-client'
      );
      const { GET } = await import('../route');

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      };
      vi.mocked(getSupabaseServerClient).mockReturnValue(mockSupabase);

      const req = createMockRequest(
        'http://localhost:3000/api/cron/sync-notion',
        { 'x-cron-secret': 'test-secret-key' }
      );
      const res = await GET(req);
      const json = await res.json();

      expect(json).toHaveProperty('success', true);
      expect(json).toHaveProperty('synced');
      expect(json).toHaveProperty('duration');
    });

    it('synced 應該包含 succeeded 和 failed 字段', async () => {
      const { getSupabaseServerClient } = await import(
        '@/lib/db/supabase-client'
      );
      const { GET } = await import('../route');

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      };
      vi.mocked(getSupabaseServerClient).mockReturnValue(mockSupabase);

      const req = createMockRequest(
        'http://localhost:3000/api/cron/sync-notion',
        { 'x-cron-secret': 'test-secret-key' }
      );
      const res = await GET(req);
      const json = await res.json();

      expect(json.synced).toHaveProperty('succeeded');
      expect(json.synced).toHaveProperty('failed');
    });
  });

  describe('POST 端點', () => {
    it('應該代理至 GET', async () => {
      const { getSupabaseServerClient } = await import(
        '@/lib/db/supabase-client'
      );
      const { POST } = await import('../route');

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      };
      vi.mocked(getSupabaseServerClient).mockReturnValue(mockSupabase);

      const req = createMockRequest(
        'http://localhost:3000/api/cron/sync-notion',
        { 'x-cron-secret': 'test-secret-key' }
      );
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
    });

    it('應該拒絕 POST 無密鑰', async () => {
      const { POST } = await import('../route');
      const req = createMockRequest('http://localhost:3000/api/cron/sync-notion');
      const res = await POST(req);

      expect(res.status).toBe(401);
    });
  });

  describe('查詢參數', () => {
    it('應該支援 tenant_id 查詢參數', async () => {
      const { getSupabaseServerClient } = await import(
        '@/lib/db/supabase-client'
      );
      const { GET } = await import('../route');

      let eqCallArg: string | undefined;
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn((field: string, value: string) => {
              if (field === 'id') {
                eqCallArg = value;
              }
              return Promise.resolve({
                data: [],
                error: null,
              });
            }),
          }),
        }),
      };
      vi.mocked(getSupabaseServerClient).mockReturnValue(mockSupabase);

      const req = createMockRequest(
        'http://localhost:3000/api/cron/sync-notion?tenant_id=my-tenant',
        { 'x-cron-secret': 'test-secret-key' }
      );
      const res = await GET(req);

      expect(res.status).toBe(200);
    });
  });

  describe('錯誤情況', () => {
    it('應該在租戶清單為 null 時返回成功 (0,0)', async () => {
      const { getSupabaseServerClient } = await import(
        '@/lib/db/supabase-client'
      );
      const { GET } = await import('../route');

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      };
      vi.mocked(getSupabaseServerClient).mockReturnValue(mockSupabase);

      const req = createMockRequest(
        'http://localhost:3000/api/cron/sync-notion',
        { 'x-cron-secret': 'test-secret-key' }
      );
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.synced).toEqual({
        succeeded: 0,
        failed: 0,
      });
    });
  });
});
