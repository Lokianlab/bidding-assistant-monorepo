"use client";

import { useState, useCallback } from "react";
import type { SelfAnalysis } from "./types";
import { fetchAllPages, analyzeSelf } from "./analysis";

interface UseCompetitorAnalysisReturn {
  data: SelfAnalysis | null;
  loading: boolean;
  progress: { loaded: number; total: number } | null;
  error: string | null;
  run: (companyName: string) => Promise<void>;
}

export function useCompetitorAnalysis(): UseCompetitorAnalysisReturn {
  const [data, setData] = useState<SelfAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{ loaded: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (companyName: string) => {
    if (!companyName.trim()) return;

    setLoading(true);
    setError(null);
    setData(null);
    setProgress(null);

    try {
      const records = await fetchAllPages(companyName, (loaded, total) => {
        setProgress({ loaded, total });
      });

      const analysis = analyzeSelf(records, companyName);
      setData(analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : "分析失敗");
    } finally {
      setLoading(false);
      setProgress(null);
    }
  }, []);

  return { data, loading, progress, error, run };
}
