// M07 KB 搜尋 Hook

import { useState, useCallback } from 'react';

export interface KBSearchResult {
  id: string;
  title: string;
  content: string;
  relevance: number;
}

export interface UseKBSearchReturn {
  query: string;
  setQuery: (query: string) => void;
  results: KBSearchResult[];
  loading: boolean;
  error: string | null;
  search: (searchQuery: string) => Promise<void>;
  clearResults: () => void;
}

export function useKBSearch(): UseKBSearchReturn {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<KBSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/kb/search?q=${encodeURIComponent(searchQuery)}`);

      if (!response.ok) {
        throw new Error('搜尋失敗');
      }

      const data = await response.json();
      setResults(Array.isArray(data) ? data : []);
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
  }, []);

  return {
    query,
    setQuery,
    results,
    loading,
    error,
    search,
    clearResults,
  };
}
