"use client";

import { useState, useCallback } from "react";
import type { PCCSearchResponse, PCCSearchMode, PCCAction } from "./types";

interface UsePCCSearchReturn {
  results: PCCSearchResponse | null;
  loading: boolean;
  error: string | null;
  search: (query: string, mode: PCCSearchMode, page?: number) => Promise<void>;
  clearResults: () => void;
}

async function pccApi(action: PCCAction, data: Record<string, unknown>): Promise<unknown> {
  const res = await fetch("/api/pcc", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, data }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error ?? `API 錯誤 (${res.status})`);
  }
  return json;
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
      const action: PCCAction = mode === "title" ? "searchByTitle" : "searchByCompany";
      const data = await pccApi(action, { query: query.trim(), page }) as PCCSearchResponse;
      setResults(data);
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

/** 取得標案詳情 */
export async function fetchTenderDetail(
  unitId: string,
  jobNumber: string,
): Promise<unknown> {
  return pccApi("getTenderDetail", { unitId, jobNumber });
}
