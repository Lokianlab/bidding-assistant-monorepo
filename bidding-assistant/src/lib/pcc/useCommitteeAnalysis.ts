"use client";

import { useState, useCallback } from "react";
import type { PCCRecord, PCCTenderDetail } from "./types";
import type { TenderWithCommittee, CommitteeAnalysis } from "./committee-analysis";
import { analyzeCommittees } from "./committee-analysis";
import { cacheGet, cacheSet } from "./cache";

/** 每次詳情請求間隔（配合 PCC API rate limit） */
const DETAIL_DELAY_MS = 350;
/** 最多抓幾筆詳情（避免打太多 API） */
const MAX_DETAILS = 30;

interface UseCommitteeAnalysisReturn {
  data: CommitteeAnalysis | null;
  loading: boolean;
  progress: { loaded: number; total: number } | null;
  error: string | null;
  run: (unitId: string, unitName: string) => Promise<void>;
}

export function useCommitteeAnalysis(): UseCommitteeAnalysisReturn {
  const [data, setData] = useState<CommitteeAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{ loaded: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (unitId: string, unitName: string) => {
    if (!unitId) return;

    setLoading(true);
    setError(null);
    setData(null);
    setProgress(null);

    try {
      const cacheKey = `committee:${unitId}`;
      const cached = cacheGet<CommitteeAnalysis>("analysis", cacheKey);
      if (cached) {
        setData(cached);
        return;
      }

      // 1. 取得機關所有標案
      const records = await fetchUnitRecords(unitId);
      const awards = records
        .filter((r) => r.brief.type === "決標公告")
        .slice(0, MAX_DETAILS);

      if (awards.length === 0) {
        setData({ totalMembers: 0, totalTenders: 0, frequentMembers: [] });
        return;
      }

      setProgress({ loaded: 0, total: awards.length });

      // 2. 逐案抓詳情取評委
      const tenders: TenderWithCommittee[] = [];
      for (let i = 0; i < awards.length; i++) {
        const record = awards[i];
        try {
          const detail = await fetchDetail(record.unit_id, record.job_number);
          if (detail.evaluation_committee && detail.evaluation_committee.length > 0) {
            tenders.push({
              title: record.brief.title,
              agency: unitName,
              unitId: record.unit_id,
              date: record.date,
              committee: detail.evaluation_committee,
            });
          }
        } catch {
          // 單筆失敗不中斷整體分析
        }

        setProgress({ loaded: i + 1, total: awards.length });

        // rate limiting
        if (i < awards.length - 1) {
          await delay(DETAIL_DELAY_MS);
        }
      }

      // 3. 分析
      const analysis = analyzeCommittees(tenders);
      setData(analysis);
      cacheSet("analysis", cacheKey, analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : "分析失敗");
    } finally {
      setLoading(false);
      setProgress(null);
    }
  }, []);

  return { data, loading, progress, error, run };
}

// ====== 內部 helpers ======

async function fetchUnitRecords(unitId: string): Promise<PCCRecord[]> {
  const res = await fetch("/api/pcc", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "listByUnit", data: { unitId } }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `API 錯誤 (${res.status})`);
  }
  const json = await res.json();
  return json.records ?? [];
}

async function fetchDetail(unitId: string, jobNumber: string): Promise<PCCTenderDetail> {
  const res = await fetch("/api/pcc", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "getTenderDetail", data: { unitId, jobNumber } }),
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
