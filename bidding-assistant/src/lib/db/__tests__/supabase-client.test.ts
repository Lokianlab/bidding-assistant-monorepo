import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ── Mock Supabase library ──────────────────────────────────────────
const mockCreateClient = vi.fn(() => ({
  auth: { onAuthStateChange: vi.fn() },
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: mockCreateClient,
}));

const originalEnv = { ...process.env };

beforeEach(() => {
  vi.clearAllMocks();
  // 設定必要的環境變數以確保模塊可以加載
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
  process.env.NEXT_PUBLIC_TENANT_ID = 'test-tenant';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
});

afterEach(() => {
  Object.assign(process.env, originalEnv);
  vi.resetModules();
});

describe('Supabase Client Initialization', () => {
  it('getSupabaseClient 應該建立客戶端用正確的 URL 和金鑰', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://custom.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'custom-key';
    vi.resetModules();

    const { getSupabaseClient } = await import('../supabase-client');
    getSupabaseClient();

    expect(mockCreateClient).toHaveBeenCalledWith(
      'https://custom.supabase.co',
      'custom-key',
      expect.any(Object)
    );
  });

  it('getSupabaseClient 設定應該啟用自動刷新', async () => {
    vi.resetModules();
    const { getSupabaseClient } = await import('../supabase-client');
    getSupabaseClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config = (mockCreateClient.mock.calls as any)[0][2];
    expect(config.auth.autoRefreshToken).toBe(true);
    expect(config.auth.persistSession).toBe(true);
  });

  it('getSupabaseServerClient 應該使用服務角色金鑰', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://custom.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    vi.resetModules();

    const { getSupabaseServerClient } = await import('../supabase-client');
    getSupabaseServerClient();

    expect(mockCreateClient).toHaveBeenCalledWith(
      'https://custom.supabase.co',
      'service-role-key',
      expect.any(Object)
    );
  });

  it('getSupabaseServerClient 設定應該禁用自動刷新', async () => {
    vi.resetModules();
    const { getSupabaseServerClient } = await import('../supabase-client');
    const initialCallCount = mockCreateClient.mock.calls.length;

    getSupabaseServerClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const calls = mockCreateClient.mock.calls as any[];
    const lastCall = calls[calls.length - 1];
    const config = lastCall[2];
    expect(config.auth.autoRefreshToken).toBe(false);
    expect(config.auth.persistSession).toBe(false);
  });

  it('getSupabaseServerClient 每次都建立新客戶端（非單例）', async () => {
    vi.resetModules();
    const { getSupabaseServerClient } = await import('../supabase-client');
    const initialCount = mockCreateClient.mock.calls.length;

    getSupabaseServerClient();
    getSupabaseServerClient();
    getSupabaseServerClient();

    const newCalls = mockCreateClient.mock.calls.length - initialCount;
    expect(newCalls).toBe(3);
  });

  it('getTenantId 應該返回配置的租戶 ID', async () => {
    process.env.NEXT_PUBLIC_TENANT_ID = 'production-tenant-001';
    vi.resetModules();

    const { getTenantId } = await import('../supabase-client');
    const tenantId = getTenantId();

    expect(tenantId).toBe('production-tenant-001');
  });

  it('getTenantId 在多次呼叫時返回相同的值', async () => {
    process.env.NEXT_PUBLIC_TENANT_ID = 'stable-tenant';
    vi.resetModules();

    const { getTenantId } = await import('../supabase-client');

    expect(getTenantId()).toBe('stable-tenant');
    expect(getTenantId()).toBe('stable-tenant');
    expect(getTenantId()).toBe('stable-tenant');
  });

  it('getSupabaseClient 實現單例模式', async () => {
    vi.resetModules();
    const { getSupabaseClient } = await import('../supabase-client');

    const client1 = getSupabaseClient();
    const client2 = getSupabaseClient();
    const client3 = getSupabaseClient();

    expect(client1).toBe(client2);
    expect(client2).toBe(client3);
    // createClient 應該只被呼叫一次（來自 default export）
    expect(mockCreateClient.mock.calls.length).toBeGreaterThanOrEqual(1);
  });
});
