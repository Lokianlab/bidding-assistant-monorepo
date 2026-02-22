// ====== 巡標掃描結果管理 Hook ======

import { useState, useCallback } from "react";
import type { ScanResult, ScanSummary, KeywordCategory } from "./types";

interface ScanResponse {
  scannedAt: string;
  searchKeywords: string[];
  results: ScanResult[];
  counts: Record<KeywordCategory, number>;
  totalRaw: number;
  errors?: { keyword: string; error: string }[];
}

interface UseScanResultsReturn {
  /** 掃描結果 */
  data: ScanResponse | null;
  /** 載入中 */
  loading: boolean;
  /** 錯誤訊息 */
  error: string | null;
  /** 執行一次掃描 */
  scan: (keywords?: string[], maxPages?: number) => Promise<void>;
  /** 清除結果 */
  clear: () => void;
}

export function useScanResults(): UseScanResultsReturn {
  const [data, setData] = useState<ScanResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scan = useCallback(async (keywords?: string[], maxPages?: number) => {
    setLoading(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {};
      if (keywords && keywords.length > 0) body.keywords = keywords;
      if (maxPages) body.maxPages = maxPages;

      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? `掃描失敗 (${res.status})`);
      }

      const result = await res.json() as ScanResponse;
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "掃描失敗");
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  return { data, loading, error, scan, clear };
}
