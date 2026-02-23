/**
 * 知識庫列表管理 Hook
 */

import { useState, useEffect, useCallback } from 'react';
import { KBItem, KBListFilters, KBCategory } from './types';
import { KBApiClient } from './api-client';

export interface UseKBItemsReturn {
  items: KBItem[];
  total: number;
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    setPage: (page: number) => void;
    perPage: number;
    setPerPage: (perPage: number) => void;
  };
  filters: {
    category: KBCategory | null;
    search: string;
    setCategory: (cat: KBCategory | null) => void;
    setSearch: (search: string) => void;
  };
  selection: {
    selected: Set<string>;
    setSelected: (ids: Set<string>) => void;
    toggleOne: (id: string) => void;
    toggleAll: (itemIds: string[]) => void;
  };
  refetch: () => Promise<void>;
}

export function useKBItems(initialCategory?: KBCategory): UseKBItemsReturn {
  const [items, setItems] = useState<KBItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  const [category, setCategory] = useState<KBCategory | null>(
    initialCategory || null,
  );
  const [search, setSearch] = useState('');

  const [selected, setSelected] = useState<Set<string>>(new Set());

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const filters: KBListFilters = {
        page,
        limit: perPage,
      };

      if (category) {
        filters.category = category;
      }
      if (search) {
        filters.search = search;
      }

      const response = await KBApiClient.listItems(filters);
      setItems(response.data);
      setTotal(response.total);
      setSelected(new Set()); // 重新載入時清除選擇
    } catch (err: any) {
      setError(err.message || 'Failed to fetch items');
    } finally {
      setIsLoading(false);
    }
  }, [page, perPage, category, search]);

  // 監聽篩選變化時重設頁碼
  useEffect(() => {
    setPage(1);
  }, [category, search]);

  // 載入資料
  useEffect(() => {
    refetch();
  }, [refetch]);

  const toggleOne = useCallback((id: string) => {
    setSelected((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const toggleAll = useCallback((itemIds: string[]) => {
    setSelected((prev) => {
      // 如果全部已選，則全部反選；否則全部選
      const allSelected = itemIds.every((id) => prev.has(id));
      const newSet = new Set<string>();
      if (!allSelected) {
        itemIds.forEach((id) => newSet.add(id));
      }
      return newSet;
    });
  }, []);

  return {
    items,
    total,
    isLoading,
    error,
    pagination: { page, setPage, perPage, setPerPage },
    filters: { category, search, setCategory, setSearch },
    selection: { selected, setSelected, toggleOne, toggleAll },
    refetch,
  };
}
