"use client";

import { useState, useEffect } from "react";
import type { PCCRecord } from "./types";
import { isWinner } from "./helpers";

interface AgencyIntel {
  totalCases: number;
  recentCases: { title: string; date: number; winner: string | null; bidders: number }[];
  incumbents: { name: string; wins: number }[];
  myHistory: { title: string; date: number; won: boolean }[];
}

interface UseAgencyIntelReturn {
  data: AgencyIntel | null;
  loading: boolean;
  error: string | null;
}

/** 查某機關的歷史標案，分析在位者和我方紀錄 */
export function useAgencyIntel(unitId: string | null, open: boolean, companyName = "大員洛川"): UseAgencyIntelReturn {
  const [data, setData] = useState<AgencyIntel | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!unitId || !open) {
      setData(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchUnitRecords(unitId)
      .then((records) => {
        if (cancelled) return;
        setData(analyzeAgency(records, companyName));
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "載入失敗");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [unitId, open, companyName]);

  return { data, loading, error };
}

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

function analyzeAgency(records: PCCRecord[], companyName: string): AgencyIntel {
  const awards = records.filter((r) => r.brief.type === "決標公告");

  // 找得標者
  const winnerCounts = new Map<string, number>();
  const recentCases: AgencyIntel["recentCases"] = [];
  const myHistory: AgencyIntel["myHistory"] = [];

  for (const record of awards.slice(0, 50)) {
    const companies = record.brief.companies;
    if (!companies) continue;

    // 找得標公司
    let winnerName: string | null = null;
    for (const name of companies.names) {
      if (isWinner(record, name)) {
        winnerName = name.replace(/\s*\(.*\)\s*$/, "");
        winnerCounts.set(winnerName, (winnerCounts.get(winnerName) ?? 0) + 1);
        break;
      }
    }

    recentCases.push({
      title: record.brief.title,
      date: record.date,
      winner: winnerName,
      bidders: companies.ids.length,
    });

    // 我方是否參與
    const myInvolved = companies.names.some((n) => n.includes(companyName));
    if (myInvolved) {
      const iWon = companies.names.some((n) => n.includes(companyName) && isWinner(record, n));
      myHistory.push({
        title: record.brief.title,
        date: record.date,
        won: iWon,
      });
    }
  }

  // 排序在位者：得標次數高的在前
  const incumbents = Array.from(winnerCounts.entries())
    .map(([name, wins]) => ({ name, wins }))
    .filter((i) => i.wins >= 2)
    .sort((a, b) => b.wins - a.wins);

  return {
    totalCases: awards.length,
    recentCases: recentCases.slice(0, 10),
    incumbents,
    myHistory,
  };
}
