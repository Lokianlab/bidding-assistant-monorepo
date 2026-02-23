import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({})),
      insert: vi.fn(() => ({})),
      update: vi.fn(() => ({})),
      delete: vi.fn(() => ({})),
    })),
  })),
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('Partners API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication validation', () => {
    it('應該要求有效的認證資訊', async () => {
      const { GET } = await import('../route');

      // 沒有認證 header 的請求
      const request = new NextRequest('http://localhost:3000/api/partners');

      const response = await GET(request);
      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    it('POST 應該要求有效的認證資訊', async () => {
      const { POST } = await import('../route');

      const request = new NextRequest('http://localhost:3000/api/partners', {
        method: 'POST',
        body: JSON.stringify({ name: '測試', category: ['技術顧問'] }),
      });

      const response = await POST(request);
      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.success).toBe(false);
    });
  });

  describe('PATCH /api/partners/[id]', () => {
    it('應該驗證資源 ID 格式', async () => {
      const { PATCH } = await import('../[id]/route');

      const request = new NextRequest(
        'http://localhost:3000/api/partners/invalid-id',
        {
          method: 'PATCH',
          headers: { 'x-user-id': 'user-123' },
          body: JSON.stringify({ rating: 5 }),
        },
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ id: 'invalid-id' }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('ID');
    });

    it('應該要求有效的認證資訊', async () => {
      const { PATCH } = await import('../[id]/route');

      const validId = '123e4567-e89b-12d3-a456-426614174000';
      const request = new NextRequest(
        `http://localhost:3000/api/partners/${validId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ rating: 5 }),
        },
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ id: validId }),
      });

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/partners/[id]', () => {
    it('應該驗證資源 ID 格式', async () => {
      const { DELETE } = await import('../[id]/route');

      const request = new NextRequest(
        'http://localhost:3000/api/partners/invalid-id',
        {
          method: 'DELETE',
          headers: { 'x-user-id': 'user-123' },
        },
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ id: 'invalid-id' }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/partners/[id]/usage', () => {
    it('應該驗證資源 ID 格式', async () => {
      const { POST } = await import('../[id]/usage/route');

      const request = new NextRequest(
        'http://localhost:3000/api/partners/invalid-id/usage',
        {
          method: 'POST',
          headers: { 'x-user-id': 'user-123' },
        },
      );

      const response = await POST(request, {
        params: Promise.resolve({ id: 'invalid-id' }),
      });

      expect(response.status).toBe(400);
    });
  });
});
