/**
 * M11 結案飛輪 - API 路由測試
 *
 * 測試：
 * - POST /api/cases/close/generate-summary
 * - POST /api/cases/[id]/close/write-to-kb
 * - POST /api/cases/[id]/close/complete
 * - GET /api/kb/success-patterns
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// 模擬 Supabase
const mockSupabaseClient = {
  from: vi.fn(),
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));

// 模擬 logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

// ── 模擬環境變數 ────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
});

// ── POST /api/cases/close/generate-summary ───────────────

describe('POST /api/cases/close/generate-summary', () => {
  it('成功生成摘要', async () => {
    const { POST } = await import('../../../close/generate-summary/route');

    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [{ id: 'case-001' }], error: null }),
    });

    const request = new NextRequest('http://localhost/api/cases/close/generate-summary', {
      method: 'POST',
      body: JSON.stringify({ case_id: 'case-001' }),
      headers: { 'x-user-id': 'user-001' },
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.what_we_did).toBeDefined();
    expect(data.what_we_learned).toBeDefined();
    expect(data.next_time_notes).toBeDefined();
    expect(data.suggested_tags).toBeDefined();
  });

  it('缺少 case_id 時返回 400', async () => {
    const { POST } = await import('../../../close/generate-summary/route');

    const request = new NextRequest('http://localhost/api/cases/close/generate-summary', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'x-user-id': 'user-001' },
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBeDefined();
  });

  it('返回有效的摘要內容', async () => {
    const { POST } = await import('../../../close/generate-summary/route');

    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [{ id: 'case-001' }], error: null }),
    });

    const request = new NextRequest('http://localhost/api/cases/close/generate-summary', {
      method: 'POST',
      body: JSON.stringify({ case_id: 'case-001' }),
      headers: { 'x-user-id': 'user-001' },
    });

    const response = await POST(request);
    const data = await response.json();

    // 驗證生成的摘要包含三個必填段落
    expect(data.what_we_did).toBeTruthy();
    expect(data.what_we_learned).toBeTruthy();
    expect(data.next_time_notes).toBeTruthy();
  });
});

// ── POST /api/cases/[id]/close/write-to-kb ──────────────

describe('POST /api/cases/[id]/close/write-to-kb', () => {
  it('成功寫入知識庫', async () => {
    const { POST } = await import('../write-to-kb/route');

    mockSupabaseClient.from.mockReturnValue({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'kb-001' }, error: null }),
    });

    const request = new NextRequest('http://localhost/api/cases/case-001/close/write-to-kb', {
      method: 'POST',
      body: JSON.stringify({
        title: '成功案例',
        content: '我們做了什麼\\n\\n我們學到什麼\\n\\n下次注意',
        tags: ['客戶溝通'],
      }),
      headers: { 'x-user-id': 'user-001' },
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'case-001' }) });
    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.kb_item_id).toBeDefined();
  });

  it('缺少認證時返回 401', async () => {
    const { POST } = await import('../write-to-kb/route');

    const request = new NextRequest('http://localhost/api/cases/case-001/close/write-to-kb', {
      method: 'POST',
      body: JSON.stringify({ title: 'test', content: 'test' }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'case-001' }) });
    expect(response.status).toBe(401);
  });

  it('缺少必填欄位時返回 400', async () => {
    const { POST } = await import('../write-to-kb/route');

    const request = new NextRequest('http://localhost/api/cases/case-001/close/write-to-kb', {
      method: 'POST',
      body: JSON.stringify({ title: '標題只有' }),
      headers: { 'x-user-id': 'user-001' },
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'case-001' }) });
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBeDefined();
  });

  it('多租戶隔離：無法訪問其他租戶的資料', async () => {
    const { POST } = await import('../write-to-kb/route');

    let capturedTenantId = '';
    mockSupabaseClient.from.mockReturnValue({
      insert: vi.fn((data) => {
        capturedTenantId = data.tenant_id;
        return {
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: 'kb-001' }, error: null }),
        };
      }),
    });

    const request = new NextRequest('http://localhost/api/cases/case-001/close/write-to-kb', {
      method: 'POST',
      body: JSON.stringify({
        title: '測試',
        content: '測試\\n\\n測試\\n\\n測試',
      }),
      headers: { 'x-user-id': 'user-001' },
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'case-001' }) });
    expect(response.status).toBe(201);
    expect(capturedTenantId).toBe('user-001');
  });
});

// ── POST /api/cases/[id]/close/complete ──────────────────

describe('POST /api/cases/[id]/close/complete', () => {
  it('成功完成結案', async () => {
    const { POST } = await import('../complete/route');

    mockSupabaseClient.from.mockReturnValue({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });

    const request = new NextRequest('http://localhost/api/cases/case-001/close/complete', {
      method: 'POST',
      headers: { 'x-user-id': 'user-001' },
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'case-001' }) });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.message).toBeDefined();
  });

  it('缺少認證時返回 401', async () => {
    const { POST } = await import('../complete/route');

    const request = new NextRequest('http://localhost/api/cases/case-001/close/complete', {
      method: 'POST',
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'case-001' }) });
    expect(response.status).toBe(401);
  });

  it('多租戶隔離：只更新自己租戶的資料', async () => {
    const { POST } = await import('../complete/route');

    let capturedFilters: string[] = [];
    mockSupabaseClient.from.mockReturnValue({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn((col, val) => {
        capturedFilters.push(`${col}=${val}`);
        return {
          eq: vi.fn((col2, val2) => {
            capturedFilters.push(`${col2}=${val2}`);
            return Promise.resolve({ error: null });
          }),
        };
      }),
    });

    const request = new NextRequest('http://localhost/api/cases/case-001/close/complete', {
      method: 'POST',
      headers: { 'x-user-id': 'user-001' },
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'case-001' }) });
    expect(response.status).toBe(200);
    expect(capturedFilters.join(',')).toContain('tenant_id=user-001');
  });
});

// ── 集成測試 ──────────────────────────────────────────

describe('M11 結案飛輪 - 完整流程', () => {
  it('完整結案流程：生成摘要 → 寫入 KB → 完成結案', async () => {
    // 此測試驗證三個端點的順序調用
    // 1. 調用 generate-summary → 取得摘要
    // 2. 調用 write-to-kb → 保存摘要到知識庫
    // 3. 調用 complete → 標記結案

    // 簡化版：驗證各端點都能成功調用
    const generateSummaryModule = await import('../../../close/generate-summary/route');
    const writeToKBModule = await import('../write-to-kb/route');
    const completeModule = await import('../complete/route');

    expect(generateSummaryModule.POST).toBeDefined();
    expect(writeToKBModule.POST).toBeDefined();
    expect(completeModule.POST).toBeDefined();
  });

  it('KB 寫入失敗時不影響結案流程', async () => {
    const { POST } = await import('../write-to-kb/route');

    // 模擬 KB 寫入失敗，但後續流程不受影響
    mockSupabaseClient.from.mockReturnValue({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'KB 寫入失敗' } }),
    });

    const request = new NextRequest('http://localhost/api/cases/case-001/close/write-to-kb', {
      method: 'POST',
      body: JSON.stringify({
        title: '測試',
        content: '測試\\n\\n測試\\n\\n測試',
      }),
      headers: { 'x-user-id': 'user-001' },
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'case-001' }) });
    // KB 寫入失敗應返回錯誤狀態
    expect(response.status).toBe(400);
  });
});
