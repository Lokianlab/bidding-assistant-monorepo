"use client";

import { useMemo } from "react";
import type { NotionPage } from "./types";
import { F, ACTIVE_STATUSES, SUBMITTED_STATUSES, PROCURED_STATUSES } from "./types";
import { BID_STATUS } from "@/lib/constants/bid-status";
import { parseDateField } from "./helpers";

// ====== 匯出的指標型別 ======

export interface TeamMember {
  name: string;
  count: number;
}

export interface CostBreakdown {
  bidDeposit: number;   // 押標金
  procurementFee: number; // 領標費
  total: number;
}

export interface StatusCount {
  name: string;
  value: number;
}

export interface BudgetByStatus {
  name: string;
  budget: number;
}

export interface DecisionCount {
  name: string;
  value: number;
}

export interface MonthlyPoint {
  month: string;
  fullKey: string;
  投標件數: number;
  得標件數: number;
}

export interface TypeStat {
  name: string;
  件數: number;
  預算: number;
}

export type CostPeriod = "all" | "year" | "month" | "week";

export interface DashboardMetrics {
  // 基本計數
  activeProjects: NotionPage[];
  biddingProjects: NotionPage[];
  presentedProjects: NotionPage[];
  wonProjects: NotionPage[];
  submittedProjects: NotionPage[];

  // KPI 數值
  totalBudget: number;
  biddingBudget: number;
  wonBudget: number;
  winRate: number;
  totalCost: CostBreakdown;
  teamWorkload: TeamMember[];
  teamAvgLoad: number;
  teamCount: number;

  // 本月/本週投標件數
  monthSubmittedCount: number;
  weekSubmittedCount: number;

  // 本年度投標件數（含歷史完結案件）
  yearSubmittedCount: number;
  yearWonCount: number;

  // 分時段成本
  totalCostByPeriod: Record<CostPeriod, CostBreakdown>;

  // 分組
  byPriority: Record<string, NotionPage[]>;

  // 圖表資料
  statusDistribution: StatusCount[];
  budgetByStatus: BudgetByStatus[];
  decisionDistribution: DecisionCount[];
  monthlyTrend: MonthlyPoint[];
  typeAnalysis: TypeStat[];
}

// ====== 時段計算工具 ======

function getTimeBoundaries() {
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1).getTime();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  // 本週一 00:00
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset);
  weekStart.setHours(0, 0, 0, 0);
  const weekStartMs = weekStart.getTime();

  return { yearStart, monthStart, weekStartMs };
}

function computeCostForPages(pages: NotionPage[]): CostBreakdown {
  const bid = pages.reduce((s, p) => s + (p.properties[F.押標金] ?? 0), 0);
  const fee = pages.reduce((s, p) => s + (p.properties[F.領標費] ?? 0), 0);
  return { bidDeposit: bid, procurementFee: fee, total: bid + fee };
}

/**
 * 儀表板核心指標計算 hook
 * 接收已過濾的 pages（當前看板用）和 historicalPages（歷史完結案件，僅用於 KPI）
 * 以及動態的 PRIORITY_MAP
 */
export function useDashboardMetrics(
  pages: NotionPage[],
  priorityMap: Record<string, string>,
  historicalPages?: NotionPage[],
): DashboardMetrics {
  // ====== 基礎分組 ======

  const activeProjects = useMemo(
    () => pages.filter((p) => ACTIVE_STATUSES.has(p.properties[F.進程] ?? "")),
    [pages]
  );

  const biddingProjects = useMemo(
    () => pages.filter((p) => p.properties[F.進程] === "競標階段"),
    [pages]
  );

  const presentedProjects = useMemo(
    () => pages.filter((p) => p.properties[F.進程] === "已出席簡報"),
    [pages]
  );

  const wonProjects = useMemo(
    () => pages.filter((p) => p.properties[F.進程] === BID_STATUS.得標),
    [pages]
  );

  const submittedProjects = useMemo(
    () => pages.filter((p) => SUBMITTED_STATUSES.has(p.properties[F.進程] ?? "")),
    [pages]
  );

  // ====== 合併歷史案件 → 用於計算更精確的 KPI ======

  const allSubmitted = useMemo(() => {
    if (!historicalPages?.length) return submittedProjects;
    // 合併：排除重複 id
    const ids = new Set(submittedProjects.map((p) => p.id));
    const extra = historicalPages.filter((p) =>
      !ids.has(p.id) && SUBMITTED_STATUSES.has(p.properties[F.進程] ?? "")
    );
    return [...submittedProjects, ...extra];
  }, [submittedProjects, historicalPages]);

  const allWon = useMemo(() => {
    if (!historicalPages?.length) return wonProjects;
    const ids = new Set(wonProjects.map((p) => p.id));
    const extra = historicalPages.filter((p) =>
      !ids.has(p.id) && p.properties[F.進程] === BID_STATUS.得標
    );
    return [...wonProjects, ...extra];
  }, [wonProjects, historicalPages]);

  // 所有已領標（用於計算成本）
  const allProcured = useMemo(() => {
    const base = pages.filter((p) => PROCURED_STATUSES.has(p.properties[F.進程] ?? ""));
    if (!historicalPages?.length) return base;
    const ids = new Set(base.map((p) => p.id));
    const extra = historicalPages.filter((p) =>
      !ids.has(p.id) && PROCURED_STATUSES.has(p.properties[F.進程] ?? "")
    );
    return [...base, ...extra];
  }, [pages, historicalPages]);

  // ====== KPI 計算 ======

  const totalBudget = useMemo(
    () => pages.reduce((s, p) => s + (p.properties[F.預算] ?? 0), 0),
    [pages]
  );

  const biddingBudget = useMemo(
    () =>
      [...biddingProjects, ...presentedProjects].reduce(
        (s, p) => s + (p.properties[F.預算] ?? 0),
        0
      ),
    [biddingProjects, presentedProjects]
  );

  const wonBudget = useMemo(
    () => allWon.reduce((s, p) => s + (p.properties[F.預算] ?? 0), 0),
    [allWon]
  );

  const winRate = useMemo(() => {
    if (allSubmitted.length === 0) return 0;
    return Math.round((allWon.length / allSubmitted.length) * 100);
  }, [allSubmitted, allWon]);

  // 總投入成本（全部時段）
  const totalCost = useMemo(
    () => computeCostForPages(allProcured),
    [allProcured]
  );

  // 分時段成本
  const totalCostByPeriod = useMemo(() => {
    const { yearStart, monthStart, weekStartMs } = getTimeBoundaries();

    const yearPages = allProcured.filter((p) => {
      const ts = parseDateField(p.properties[F.截標]);
      return ts >= yearStart;
    });
    const monthPages = allProcured.filter((p) => {
      const ts = parseDateField(p.properties[F.截標]);
      return ts >= monthStart;
    });
    const weekPages = allProcured.filter((p) => {
      const ts = parseDateField(p.properties[F.截標]);
      return ts >= weekStartMs;
    });

    return {
      all: totalCost,
      year: computeCostForPages(yearPages),
      month: computeCostForPages(monthPages),
      week: computeCostForPages(weekPages),
    } as Record<CostPeriod, CostBreakdown>;
  }, [allProcured, totalCost]);

  // 企劃人員工作量
  const { teamWorkload, teamAvgLoad, teamCount } = useMemo(() => {
    const writerMap = new Map<string, number>();
    for (const p of activeProjects) {
      const writers: string[] = p.properties[F.企劃主筆] ?? [];
      if (Array.isArray(writers)) {
        for (const w of writers) {
          if (w) writerMap.set(w, (writerMap.get(w) ?? 0) + 1);
        }
      }
    }
    const details = Array.from(writerMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
    const cnt = writerMap.size || 1;
    return {
      teamWorkload: details,
      teamAvgLoad: Math.round((activeProjects.length / cnt) * 10) / 10,
      teamCount: writerMap.size,
    };
  }, [activeProjects]);

  // ====== 備標決策分組（順位分頁用） ======

  const byPriority = useMemo(() => {
    const result: Record<string, NotionPage[]> = {
      first: [],
      second: [],
      third: [],
      other: [],
    };
    const specialIds = new Set([
      ...biddingProjects.map((p) => p.id),
      ...presentedProjects.map((p) => p.id),
    ]);
    for (const p of pages) {
      if (specialIds.has(p.id)) continue;
      const decision = p.properties[F.決策] ?? "";
      const tab = priorityMap[decision];
      if (tab) {
        result[tab].push(p);
      } else {
        result.other.push(p);
      }
    }
    return result;
  }, [pages, priorityMap, biddingProjects, presentedProjects]);

  // ====== 圖表資料 ======

  // 1. 標案進程分布
  const statusDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of pages) {
      const s = p.properties[F.進程] ?? "未知";
      counts[s] = (counts[s] ?? 0) + 1;
    }
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [pages]);

  // 2. 各進程預算分布
  const budgetByStatus = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of pages) {
      const s = p.properties[F.進程] ?? "未知";
      const budget = p.properties[F.預算] ?? 0;
      map[s] = (map[s] ?? 0) + budget;
    }
    return Object.entries(map)
      .map(([name, budget]) => ({ name, budget }))
      .filter((d) => d.budget > 0)
      .sort((a, b) => b.budget - a.budget);
  }, [pages]);

  // 3. 備標決策分布
  const decisionDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of pages) {
      const d = p.properties[F.決策] ?? "未分類";
      counts[d] = (counts[d] ?? 0) + 1;
    }
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [pages]);

  // 4. 月份趨勢（最近 12 個月）
  const monthlyTrend = useMemo(() => {
    const months: Record<string, { total: number; won: number }> = {};
    for (const p of pages) {
      const ts = parseDateField(p.properties[F.截標]);
      if (!ts) continue;
      const d = new Date(ts);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!months[key]) months[key] = { total: 0, won: 0 };
      months[key].total++;
      if (p.properties[F.進程] === BID_STATUS.得標) months[key].won++;
    }
    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([key, v]) => ({
        month: key.split("-")[1] + "月",
        fullKey: key,
        投標件數: v.total,
        得標件數: v.won,
      }));
  }, [pages]);

  // 5. 本月/本週投標件數 + 本年度投標件數
  const { monthSubmittedCount, weekSubmittedCount, yearSubmittedCount, yearWonCount } = useMemo(() => {
    const { yearStart, monthStart, weekStartMs } = getTimeBoundaries();
    const monthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59, 999).getTime();
    const weekEnd = weekStartMs + 7 * 86400000 - 1;

    let monthCount = 0;
    let weekCount = 0;
    // 使用 allSubmitted（含歷史）算本月/本週
    for (const p of allSubmitted) {
      const ts = parseDateField(p.properties[F.截標]);
      if (!ts) continue;
      if (ts >= monthStart && ts <= monthEnd) monthCount++;
      if (ts >= weekStartMs && ts <= weekEnd) weekCount++;
    }

    // 本年度投標件數和得標件數
    let yearCount = 0;
    let yearWon = 0;
    for (const p of allSubmitted) {
      const ts = parseDateField(p.properties[F.截標]);
      if (!ts) continue;
      if (ts >= yearStart) {
        yearCount++;
        if (p.properties[F.進程] === BID_STATUS.得標) yearWon++;
      }
    }

    return {
      monthSubmittedCount: monthCount,
      weekSubmittedCount: weekCount,
      yearSubmittedCount: yearCount,
      yearWonCount: yearWon,
    };
  }, [allSubmitted]);

  // 6. 標案類型分析
  const typeAnalysis = useMemo(() => {
    const map: Record<string, { count: number; budget: number }> = {};
    for (const p of pages) {
      const types: string[] = p.properties[F.標案類型] ?? [];
      const budget = p.properties[F.預算] ?? 0;
      if (Array.isArray(types)) {
        for (const t of types) {
          if (!map[t]) map[t] = { count: 0, budget: 0 };
          map[t].count++;
          map[t].budget += budget;
        }
      }
    }
    return Object.entries(map)
      .map(([name, v]) => ({ name, 件數: v.count, 預算: v.budget }))
      .sort((a, b) => b.件數 - a.件數);
  }, [pages]);

  return {
    activeProjects,
    biddingProjects,
    presentedProjects,
    wonProjects,
    submittedProjects,
    totalBudget,
    biddingBudget,
    wonBudget,
    winRate,
    totalCost,
    teamWorkload,
    teamAvgLoad,
    teamCount,
    monthSubmittedCount,
    weekSubmittedCount,
    yearSubmittedCount,
    yearWonCount,
    totalCostByPeriod,
    byPriority,
    statusDistribution,
    budgetByStatus,
    decisionDistribution,
    monthlyTrend,
    typeAnalysis,
  };
}
