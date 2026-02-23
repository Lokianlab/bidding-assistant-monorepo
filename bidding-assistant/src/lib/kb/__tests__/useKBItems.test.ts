/**
 * useKBItems Hook 測試
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useKBItems } from '../useKBItems';
import * as KBApiModule from '../api-client';

vi.mock('../api-client');

describe('useKBItems', () => {
  const mockItems = [
    {
      id: '1',
      tenant_id: 'test',
      category: '00A' as const,
      title: 'Item 1',
      content: 'Content 1',
      tags: [],
      created_by: 'user1',
      created_at: '2026-02-23T00:00:00Z',
    },
    {
      id: '2',
      tenant_id: 'test',
      category: '00B' as const,
      title: 'Item 2',
      content: 'Content 2',
      tags: [],
      created_by: 'user2',
      created_at: '2026-02-23T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(KBApiModule.KBApiClient.listItems).mockResolvedValue({
      data: mockItems,
      total: 2,
      page: 1,
      limit: 20,
    });
  });

  describe('初始化', () => {
    it('應該初始化正確的預設值', async () => {
      const { result } = renderHook(() => useKBItems());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.items).toEqual([]);
      expect(result.current.error).toBeNull();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('應該接受初始分類', async () => {
      const { result } = renderHook(() => useKBItems('00A'));

      await waitFor(() => {
        expect(result.current.filters.category).toBe('00A');
      });
    });

    it('應該載入初始資料', async () => {
      const { result } = renderHook(() => useKBItems());

      await waitFor(() => {
        expect(result.current.items).toEqual(mockItems);
        expect(result.current.total).toBe(2);
      });
    });
  });

  describe('分類篩選', () => {
    it('應該能設定分類篩選', async () => {
      const { result } = renderHook(() => useKBItems());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.filters.setCategory('00B');
      });

      await waitFor(() => {
        expect(result.current.filters.category).toBe('00B');
      });
    });

    it('改變分類應該重設頁碼', async () => {
      const { result } = renderHook(() => useKBItems());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.pagination.setPage(2);
      });

      expect(result.current.pagination.page).toBe(2);

      act(() => {
        result.current.filters.setCategory('00A');
      });

      expect(result.current.pagination.page).toBe(1);
    });

    it('分類篩選應該重新載入資料', async () => {
      const { result } = renderHook(() => useKBItems());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const mockListItems = vi.mocked(KBApiModule.KBApiClient.listItems);
      const initialCallCount = mockListItems.mock.calls.length;

      act(() => {
        result.current.filters.setCategory('00A');
      });

      await waitFor(() => {
        expect(mockListItems.mock.calls.length).toBeGreaterThan(initialCallCount);
      });
    });

    it('應該能清除分類篩選', async () => {
      const { result } = renderHook(() => useKBItems('00A'));

      await waitFor(() => {
        expect(result.current.filters.category).toBe('00A');
      });

      act(() => {
        result.current.filters.setCategory(null);
      });

      expect(result.current.filters.category).toBeNull();
    });
  });

  describe('搜尋功能', () => {
    it('應該能設定搜尋關鍵字', async () => {
      const { result } = renderHook(() => useKBItems());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.filters.setSearch('test');
      });

      expect(result.current.filters.search).toBe('test');
    });

    it('搜尋應該重新載入資料', async () => {
      const { result } = renderHook(() => useKBItems());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const mockListItems = vi.mocked(KBApiModule.KBApiClient.listItems);
      const initialCallCount = mockListItems.mock.calls.length;

      act(() => {
        result.current.filters.setSearch('keyword');
      });

      await waitFor(() => {
        expect(mockListItems.mock.calls.length).toBeGreaterThan(initialCallCount);
      });
    });

    it('搜尋應該重設頁碼', async () => {
      const { result } = renderHook(() => useKBItems());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.pagination.setPage(2);
      });

      act(() => {
        result.current.filters.setSearch('keyword');
      });

      expect(result.current.pagination.page).toBe(1);
    });
  });

  describe('分頁', () => {
    it('應該能改變頁碼', async () => {
      const { result } = renderHook(() => useKBItems());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.pagination.setPage(2);
      });

      expect(result.current.pagination.page).toBe(2);
    });

    it('應該能改變每頁筆數', async () => {
      const { result } = renderHook(() => useKBItems());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.pagination.setPerPage(50);
      });

      expect(result.current.pagination.perPage).toBe(50);
    });

    it('改變分頁應該重新載入資料', async () => {
      const { result } = renderHook(() => useKBItems());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const mockListItems = vi.mocked(KBApiModule.KBApiClient.listItems);
      const initialCallCount = mockListItems.mock.calls.length;

      act(() => {
        result.current.pagination.setPage(2);
      });

      await waitFor(() => {
        expect(mockListItems.mock.calls.length).toBeGreaterThan(initialCallCount);
      });
    });
  });

  describe('多選功能', () => {
    it('應該能選擇單個項目', async () => {
      const { result } = renderHook(() => useKBItems());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.selection.toggleOne('1');
      });

      expect(result.current.selection.selected.has('1')).toBe(true);
    });

    it('應該能反選已選的項目', async () => {
      const { result } = renderHook(() => useKBItems());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.selection.toggleOne('1');
      });

      expect(result.current.selection.selected.has('1')).toBe(true);

      act(() => {
        result.current.selection.toggleOne('1');
      });

      expect(result.current.selection.selected.has('1')).toBe(false);
    });

    it('應該能全選所有項目', async () => {
      const { result } = renderHook(() => useKBItems());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const itemIds = mockItems.map((item) => item.id);

      act(() => {
        result.current.selection.toggleAll(itemIds);
      });

      itemIds.forEach((id) => {
        expect(result.current.selection.selected.has(id)).toBe(true);
      });
    });

    it('全選後應該能全部反選', async () => {
      const { result } = renderHook(() => useKBItems());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const itemIds = mockItems.map((item) => item.id);

      act(() => {
        result.current.selection.toggleAll(itemIds);
      });

      act(() => {
        result.current.selection.toggleAll(itemIds);
      });

      expect(result.current.selection.selected.size).toBe(0);
    });

    it('應該能清除選擇', async () => {
      const { result } = renderHook(() => useKBItems());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.selection.toggleOne('1');
      });

      act(() => {
        result.current.selection.setSelected(new Set());
      });

      expect(result.current.selection.selected.size).toBe(0);
    });

    it('重新載入應該清除選擇', async () => {
      const { result } = renderHook(() => useKBItems());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.selection.toggleOne('1');
      });

      expect(result.current.selection.selected.size).toBe(1);

      act(() => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.selection.selected.size).toBe(0);
      });
    });
  });

  describe('錯誤處理', () => {
    it('API 錯誤應該被正確捕捉', async () => {
      const mockError = new Error('API Error');
      vi.mocked(KBApiModule.KBApiClient.listItems).mockRejectedValueOnce(
        mockError
      );

      const { result } = renderHook(() => useKBItems());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBe('API Error');
      });
    });

    it('手動重新載入應該清除之前的錯誤', async () => {
      let callCount = 0;
      vi.mocked(KBApiModule.KBApiClient.listItems).mockImplementation(
        async () => {
          callCount++;
          if (callCount === 1) {
            throw new Error('First call failed');
          }
          return {
            data: mockItems,
            total: 2,
            page: 1,
            limit: 20,
          };
        }
      );

      const { result } = renderHook(() => useKBItems());

      await waitFor(() => {
        expect(result.current.error).toBe('First call failed');
      });

      act(() => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
        expect(result.current.items).toEqual(mockItems);
      });
    });
  });

  describe('refetch 功能', () => {
    it('應該能手動重新載入資料', async () => {
      const { result } = renderHook(() => useKBItems());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const mockListItems = vi.mocked(KBApiModule.KBApiClient.listItems);
      const initialCallCount = mockListItems.mock.calls.length;

      act(() => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(mockListItems.mock.calls.length).toBeGreaterThan(initialCallCount);
      });
    });
  });
});
