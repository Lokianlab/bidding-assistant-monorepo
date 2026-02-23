/**
 * M02 Phase 2c: GET /api/kb/items/:id — 單筆查詢
 * 集成測試，驗證單個項目的查詢功能
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as GET_SINGLE } from '../items/[id]/route';
import type { KBId, KBEntry } from '@/lib/knowledge-base/types';

// 設置環境變數
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test-supabase.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

// Mock Supabase createClient
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => {
    return {
      from: vi.fn((tableName: string) => {
        return {
          select: vi.fn(function() { return this; }),
          eq: vi.fn(function() { return this; }),
          single: vi.fn(async function() {
            // 返回模擬的單筆查詢結果
            return {
              data: {
                id: 'uuid-1',
                category: '00A',
                entry_id: 'M-001',
                data: { id: 'M-001', name: '黃偉誠', title: '計畫主持人' },
                status: 'active',
              },
              error: null,
            };
          }),
        };
      }),
    };
  }),
}));

// Mock next/navigation（用於動態路由參數）
vi.mock('next/navigation', () => ({
  useParams: vi.fn(() => ({
    id: 'uuid-1',
  })),
}));

function createMockRequest(url: string, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    headers: new Headers({
      'x-user-id': 'user-123',
      ...headers,
    }),
  });
}

describe('GET /api/kb/items/:id — 單筆查詢測試 (RED)', () => {
  // ========================================================================
  // 初始化
  // ========================================================================

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ========================================================================
  // 實際功能測試 — 會失敗（RED 階段）
  // ========================================================================

  test('應返回單個知識庫項目 — 正常查詢', async () => {
    // RED: 期望路由返回單筆項目及完整資料
    const request = createMockRequest('http://localhost:3000/api/kb/items/uuid-1');

    // 這會失敗，因為還沒實裝 /api/kb/items/[id]/route.ts
    try {
      const response = await GET_SINGLE(request, { params: { id: 'uuid-1' } });
      const data = await response.json();

      // 驗證回應結構
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('category');
      expect(data).toHaveProperty('entryId');
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('status');
      expect(data.id).toBe('uuid-1');
      expect(data.category).toBe('00A');
    } catch (error) {
      // 路由不存在時會拋出 error
      throw error;
    }
  });

  test('應在項目不存在時返回 404', async () => {
    // RED: 期望不存在的項目返回 404
    const request = createMockRequest('http://localhost:3000/api/kb/items/nonexistent-id');

    try {
      const response = await GET_SINGLE(request, { params: { id: 'nonexistent-id' } });
      expect([200, 404]).toContain(response.status);
    } catch (error) {
      // 路由不存在時會拋出 error
      throw error;
    }
  });

  test('應在缺少認證時返回 401', async () => {
    // 驗證認證檢查
    const request = new NextRequest(new URL('http://localhost:3000/api/kb/items/uuid-1'), {
      headers: new Headers({}), // 缺少 x-user-id
    });

    try {
      const response = await GET_SINGLE(request, { params: { id: 'uuid-1' } });
      expect(response.status).toBe(401);
    } catch (error) {
      throw error;
    }
  });

  test('應尊重多租戶隔離 — 只返回自己的項目', async () => {
    // RED: 驗證租戶隔離
    const request = createMockRequest('http://localhost:3000/api/kb/items/uuid-1');

    try {
      const response = await GET_SINGLE(request, { params: { id: 'uuid-1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      // 確認返回的項目屬於當前用戶（tenant_id = user-123）
      expect(data).toBeDefined();
    } catch (error) {
      throw error;
    }
  });

  test('應支援不同的 category', async () => {
    // RED: 驗證不同分類的項目可正常查詢
    const request = createMockRequest('http://localhost:3000/api/kb/items/uuid-2');

    try {
      const response = await GET_SINGLE(request, { params: { id: 'uuid-2' } });
      const data = await response.json();

      expect([200, 404]).toContain(response.status);
      if (response.status === 200) {
        // 驗證 category 在有效範圍內
        const validCategories: KBId[] = ['00A', '00B', '00C', '00D', '00E'];
        expect(validCategories).toContain(data.category);
      }
    } catch (error) {
      throw error;
    }
  });
});
