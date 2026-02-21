"use client";

import { useState, useCallback } from "react";
import type { MarketTrend, PCCRecord, PCCSearchResponse } from "./types";
import { analyzeMarketTrend } from "./market-trend";

interface UseMarketTrendReturn {
  data: MarketTrend | null;
  loading: boolean;
  progress: { loaded: number; total: number } | null;
  error: string | null;
  run: (keyword: string) => Promise<void>;
}

/**
 * 搜尋關鍵字的所有案件，分析市場趨勢。
 * 搜尋用 title 模式（按案名），最多翻 20 頁。
 */
export function useMarketTrend(): UseMarketTrendReturn {
  const [data, setData] = useState<MarketTrend | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{ loaded: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (keyword: string) => {
    if (!keyword.trim()) return;

    setLoading(true);
    setError(null);
    setData(null);
    setProgress(null);

    try {
      const allRecords: PCCRecord[] = [];

      // 第一頁
      const page1 = await fetchTitlePage(keyword, 1);
      allRecords.push(...page1.records);
      const totalPages = Math.min(page1.total_pages, 20);

      setProgress({ loaded: 1, total: totalPages });

      // 剩餘頁面
      for (let p = 2; p <= totalPages; p++) {
        await delay(300);
        const page = await fetchTitlePage(keyword, p);
        allRecords.push(...page.records);
        setProgress({ loaded: p, total: totalPages });
      }

      const trend = analyzeMarketTrend(allRecords, keyword);
      setData(trend);
    } catch (err) {
      setError(err instanceof Error ? err.message : "分析失敗");
    } finally {
      setLoading(false);
      setProgress(null);
    }
  }, []);

  return { data, loading, progress, error, run };
}

async function fetchTitlePage(keyword: string, page: number): Promise<PCCSearchResponse> {
  const res = await fetch("/api/pcc", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "searchByTitle",
      data: { query: keyword, page },
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `API 錯誤 (${res.status})`);
  }
  return res.json();
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
