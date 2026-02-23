import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePartners } from '../usePartners';
import * as helpers from '../helpers';

// Mock helpers
vi.mock('../helpers', () => ({
  validatePartner: vi.fn((input) => {
    if (!input.name || !input.category.length) {
      return {
        valid: false,
        errors: ['Validation failed'],
      };
    }
    return { valid: true, errors: [] };
  }),
  searchPartners: vi.fn((partners, params) => {
    if (!params.search) return partners;
    return partners.filter((p) =>
      p.name.toLowerCase().includes(params.search.toLowerCase()),
    );
  }),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe('usePartners', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('應該初始化並載入空列表', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: [] }),
    });

    const { result } = renderHook(() => usePartners());

    // 初始狀態應該是 loading
    expect(result.current.loading).toBe(true);

    // 等待載入完成
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.partners).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('應該載入夥伴列表', async () => {
    const mockPartners = [
      {
        id: '1',
        tenant_id: 'tenant-1',
        name: '測試公司',
        category: ['技術顧問'],
        rating: 4,
        cooperation_count: 5,
        tags: [],
        status: 'active',
        created_at: '2026-02-20T00:00:00Z',
        updated_at: '2026-02-20T00:00:00Z',
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockPartners }),
    });

    const { result } = renderHook(() => usePartners());

    await waitFor(() => {
      expect(result.current.partners).toHaveLength(1);
    });

    expect(result.current.partners[0].name).toBe('測試公司');
  });

  it('應該處理載入錯誤', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => usePartners());

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    expect(result.current.error).toContain('500');
  });

  it('應該搜尋夥伴', async () => {
    const mockPartners = [
      {
        id: '1',
        tenant_id: 'tenant-1',
        name: '建築設計',
        category: ['建築設計'],
        rating: 4,
        cooperation_count: 5,
        tags: [],
        status: 'active',
        created_at: '',
        updated_at: '',
      },
      {
        id: '2',
        tenant_id: 'tenant-1',
        name: '工程評估',
        category: ['工程評估'],
        rating: 3,
        cooperation_count: 2,
        tags: [],
        status: 'active',
        created_at: '',
        updated_at: '',
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockPartners }),
    });

    const { result } = renderHook(() => usePartners());

    await waitFor(() => {
      expect(result.current.partners).toHaveLength(2);
    });

    act(() => {
      result.current.search('建築');
    });

    expect(helpers.searchPartners).toHaveBeenCalledWith(mockPartners, {
      search: '建築',
    });
  });

  it('應該新增夥伴', async () => {
    const newPartner = {
      id: '3',
      tenant_id: 'tenant-1',
      name: '新公司',
      category: ['技術顧問'],
      rating: 3,
      cooperation_count: 0,
      tags: [],
      status: 'active',
      created_at: '2026-02-23T00:00:00Z',
      updated_at: '2026-02-23T00:00:00Z',
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: newPartner }),
      });

    const { result } = renderHook(() => usePartners());

    await waitFor(() => {
      expect(result.current.partners).toBeDefined();
    });

    let addedPartner: any = null;
    await act(async () => {
      addedPartner = await result.current.add({
        name: '新公司',
        category: ['技術顧問'],
      });
    });

    expect(addedPartner).not.toBeNull();
    expect(addedPartner.id).toBe('3');
  });

  it('應該驗證新增時的資料', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: [] }),
    });

    const { result } = renderHook(() => usePartners());

    await waitFor(() => {
      expect(result.current.partners).toBeDefined();
    });

    let addResult: any = null;
    await act(async () => {
      addResult = await result.current.add({
        name: '',
        category: [],
      });
    });

    expect(addResult).toBeNull();
    expect(result.current.error).not.toBeNull();
  });

  it('應該編輯夥伴', async () => {
    const existingPartner = {
      id: '1',
      tenant_id: 'tenant-1',
      name: '測試公司',
      category: ['技術顧問'],
      rating: 4,
      cooperation_count: 5,
      tags: [],
      status: 'active',
      created_at: '',
      updated_at: '',
    };

    const updatedPartner = {
      ...existingPartner,
      rating: 5,
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [existingPartner] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: updatedPartner }),
      });

    const { result } = renderHook(() => usePartners());

    await waitFor(() => {
      expect(result.current.partners).toHaveLength(1);
    });

    let updated: any = null;
    await act(async () => {
      updated = await result.current.update('1', { rating: 5 });
    });

    expect(updated.rating).toBe(5);
  });

  it('應該刪除夥伴', async () => {
    const partner = {
      id: '1',
      tenant_id: 'tenant-1',
      name: '測試公司',
      category: ['技術顧問'],
      rating: 4,
      cooperation_count: 5,
      tags: [],
      status: 'active',
      created_at: '',
      updated_at: '',
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [partner] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: null }),
      });

    const { result } = renderHook(() => usePartners());

    await waitFor(() => {
      expect(result.current.partners).toHaveLength(1);
    });

    let deleteResult = false;
    await act(async () => {
      deleteResult = await result.current.delete('1');
    });

    expect(deleteResult).toBe(true);
  });

  it('應該標記已洽詢', async () => {
    const partner = {
      id: '1',
      tenant_id: 'tenant-1',
      name: '測試公司',
      category: ['技術顧問'],
      rating: 4,
      cooperation_count: 5,
      tags: [],
      status: 'active',
      created_at: '',
      updated_at: '',
      last_used: '2026-02-20T00:00:00Z',
    };

    const updatedPartner = {
      ...partner,
      cooperation_count: 6,
      last_used: '2026-02-23T00:00:00Z',
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [partner] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: updatedPartner }),
      });

    const { result } = renderHook(() => usePartners());

    await waitFor(() => {
      expect(result.current.partners).toHaveLength(1);
    });

    let marked: any = null;
    await act(async () => {
      marked = await result.current.markUsed('1');
    });

    expect(marked.cooperation_count).toBe(6);
  });

  it('應該在 API 錯誤時返回 null', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
      });

    const { result } = renderHook(() => usePartners());

    await waitFor(() => {
      expect(result.current.partners).toBeDefined();
    });

    let addResult: any = null;
    await act(async () => {
      addResult = await result.current.add({
        name: '測試',
        category: ['技術顧問'],
      });
    });

    expect(addResult).toBeNull();
  });
});
