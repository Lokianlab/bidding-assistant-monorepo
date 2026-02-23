// M07 KB 搜尋 Hook

import { useState, useCallback } from 'react';
import type { KBId, KBEntryStatus } from '@/lib/supabase/types';

export interface KBSearchResult {
  id: string;
  title: string;
  content: string;
  relevance: number;
  category?: string;
  entryId?: string;
  status?: string;
  updatedAt?: string;
}

export interface UseKBSearchReturn {
  query: string;
  setQuery: (query: string) => void;
  results: KBSearchResult[];
  loading: boolean;
  error: string | null;
  search: (searchQuery: string, filters?: SearchFilters) => Promise<void>;
  clearResults: () => void;
  total?: number;
}

export interface SearchFilters {
  categories?: KBId[];
  status?: KBEntryStatus;
  limit?: number;
  offset?: number;
}

function transformKBEntryToResult(entry: any): KBSearchResult {
  return {
    id: entry.id,
    title: entry.data?.title || entry.entry_id || '未命名',
    content: entry.search_text || entry.data?.summary || '',
    relevance: 0.9, // 可後續改進為基於搜尋距離的計算
    category: entry.category,
    entryId: entry.entry_id,
    status: entry.status,
    updatedAt: entry.updated_at,
  };
}

export function useKBSearch(): UseKBSearchReturn {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<KBSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState<number>(0);

  const search = useCallback(async (searchQuery: string, filters?: SearchFilters) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        q: searchQuery,
        limit: String(filters?.limit || 20),
        offset: String(filters?.offset || 0),
      });

      if (filters?.categories && filters.categories.length > 0) {
        params.append('categories', filters.categories.join(','));
      }
      if (filters?.status) {
        params.append('status', filters.status);
      }

      const response = await fetch(`/api/kb/search?${params}`);

      if (!response.ok) {
        throw new Error('搜尋失敗');
      }

      const data = await response.json();

      // 轉換 API 返回的 KBEntry 列表為 KBSearchResult
      const transformedResults = (data.results || []).map(transformKBEntryToResult);
      setResults(transformedResults);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : '搜尋出錯');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
    setQuery('');
    setError(null);
    setTotal(0);
  }, []);

  return {
    query,
    setQuery,
    results,
    loading,
    error,
    search,
    clearResults,
    total,
  };
}
