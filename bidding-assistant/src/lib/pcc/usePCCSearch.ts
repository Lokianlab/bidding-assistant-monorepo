"use client";

import { useState, useCallback } from "react";
import type { PCCSearchResponse, PCCSearchMode, PCCAction } from "./types";
import { cacheGet, cacheSet } from "./cache";
import { pccApiFetch } from "./api";

interface UsePCCSearchReturn {
  results: PCCSearchResponse | null;
  loading: boolean;
  error: string | null;
  search: (query: string, mode: PCCSearchMode, page?: number) => Promise<void>;
  clearResults: () => void;
}

export function usePCCSearch(): UsePCCSearchReturn {
  const [results, setResults] = useState<PCCSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string, mode: PCCSearchMode, page = 1) => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const cacheKey = `${mode}:${query.trim()}:p${page}`;
      const cached = cacheGet<PCCSearchResponse>("search", cacheKey);
      if (cached) {
        setResults(cached);
        return;
      }

      const action: PCCAction = mode === "title" ? "searchByTitle" : "searchByCompany";
      const data = await pccApiFetch<PCCSearchResponse>(action, { query: query.trim(), page });
      // 去除 API 可能回傳的重複記錄
      const seen = new Set<string>();
      data.records = (data.records ?? []).filter((r) => {
        const key = `${r.unit_id}-${r.job_number}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setResults(data);
      cacheSet("search", cacheKey, data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "搜尋失敗");
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setResults(null);
    setError(null);
  }, []);

  return { results, loading, error, search, clearResults };
}

/** 取得標案詳情（快取 7 天） */
export async function fetchTenderDetail(
  unitId: string,
  jobNumber: string,
): Promise<unknown> {
  const cacheKey = `${unitId}:${jobNumber}`;
  const cached = cacheGet("detail", cacheKey);
  if (cached) return cached;

  const data = await pccApiFetch("getTenderDetail", { unitId, jobNumber });
  cacheSet("detail", cacheKey, data);
  return data;
}
