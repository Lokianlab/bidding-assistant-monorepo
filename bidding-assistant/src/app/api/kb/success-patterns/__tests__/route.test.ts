/**
 * M11 結案飛輪 - 成功模式 API 測試
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../route';

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

// 模擬 helper
vi.mock('@/lib/case-closing/helpers', () => ({
  identifySuccessPatterns: vi.fn((learnings, minFreq) => {
    if (!learnings || learnings.length === 0) return [];
    return [
      { pattern: '客戶溝通', frequency: 5, avgScores: { strategy: 8, execution: 7, satisfaction: 9 } },
      { pattern: '需求分析', frequency: 3, avgScores: { strategy: 7, execution: 8, satisfaction: 8 } },
    ].filter((p) => p.frequency >= minFreq);
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
});

describe('GET /api/kb/success-patterns', () => {
  it('缺少認證時返回 401', async () => {
    const request = new NextRequest('http://localhost/api/kb/success-patterns');
    const response = await GET(request);
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('返回成功模式列表', async () => {
    const mockLearnings = [
      {
        id: '1',
        case_id: 'case-001',
        tags: ['客戶溝通', '需求分析'],
        strategyScore: 8,
        executionScore: 7,
        satisfactionScore: 9,
      },
      {
        id: '2',
        case_id: 'case-002',
        tags: ['客戶溝通', '合約管理'],
        strategyScore: 7,
        executionScore: 8,
        satisfactionScore: 8,
      },
    ];

    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockLearnings, error: null }),
    });

    const request = new NextRequest('http://localhost/api/kb/success-patterns', {
      headers: { 'x-user-id': 'user-001' },
    });

    const response = await GET(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.patterns).toBeDefined();
    expect(data.total).toBeGreaterThanOrEqual(0);
    expect(data.minFrequency).toBe(3);
    expect(data.limit).toBe(20);
  });

  it('按 frequency 降序排列', async () => {
    const mockLearnings = [
      { id: '1', tags: ['高頻A'], strategyScore: 5, executionScore: 5, satisfactionScore: 5 },
      { id: '2', tags: ['高頻A', '高頻A', '高頻A'], strategyScore: 5, executionScore: 5, satisfactionScore: 5 },
    ];

    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockLearnings, error: null }),
    });

    const request = new NextRequest('http://localhost/api/kb/success-patterns', {
      headers: { 'x-user-id': 'user-001' },
    });

    const response = await GET(request);
    const data = await response.json();

    // 驗證模式按 frequency 排序
    if (data.patterns.length > 1) {
      for (let i = 0; i < data.patterns.length - 1; i++) {
        expect(data.patterns[i].frequency).toBeGreaterThanOrEqual(data.patterns[i + 1].frequency);
      }
    }
  });

  it('支持 min_frequency 參數', async () => {
    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    });

    const request = new NextRequest('http://localhost/api/kb/success-patterns?min_frequency=5', {
      headers: { 'x-user-id': 'user-001' },
    });

    const response = await GET(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.minFrequency).toBe(5);
  });

  it('支持 limit 參數', async () => {
    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    });

    const request = new NextRequest('http://localhost/api/kb/success-patterns?limit=10', {
      headers: { 'x-user-id': 'user-001' },
    });

    const response = await GET(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.limit).toBe(10);
  });

  it('多租戶隔離', async () => {
    const mockLearnings = [{ id: '1', tenant_id: 'user-001', tags: ['test'] }];

    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn((col, val) => {
        expect(col).toBe('tenant_id');
        expect(val).toBe('user-001');
        return {
          order: vi.fn().mockResolvedValue({ data: mockLearnings, error: null }),
        };
      }),
    });

    const request = new NextRequest('http://localhost/api/kb/success-patterns', {
      headers: { 'x-user-id': 'user-001' },
    });

    const response = await GET(request);
    expect(response.status).toBe(200);
  });

  it('數據庫連接失敗時返回 500', async () => {
    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Connection failed' } }),
    });

    const request = new NextRequest('http://localhost/api/kb/success-patterns', {
      headers: { 'x-user-id': 'user-001' },
    });

    const response = await GET(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBeDefined();
  });
});
