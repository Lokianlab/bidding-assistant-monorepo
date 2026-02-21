/**
 * 趨勢分析：按月彙總標案數據，計算滾動勝率和期間比較
 */

import type { NotionPage } from "../types";
import { F, PROCURED_STATUSES } from "../types";
import { BID_STATUS } from "@/lib/constants/bid-status";
import { parseDateField } from "../helpers";

// ====== 型別 ======

/** 單月度量 */
export interface MonthlyMetrics {
  /** 月份 YYYY-MM */
  month: string;
  /** 該月標案總數 */
  total: number;
  /** 得標數 */
  won: number;
  /** 未得標 */
  lost: number;
  /** 流標/廢標 */
  cancelled: number;
  /** 已決標案件（won + lost + cancelled + disqualified） */
  concluded: number;
  /** 勝率 %（基於已決案件） */
  winRate: number;
  /** 該月得標預算合計 */
  wonBudget: number;
  /** 該月投入押標金 */
  costBid: number;
  /** 該月投入領標費 */
  costFee: number;
}

/** 滾動指標（附帶滾動視窗的勝率） */
export interface RollingMetrics extends MonthlyMetrics {
  /** N 月滾動勝率 %（null = 資料不足） */
  rollingWinRate: number | null;
}

/** 期間比較 */
export interface PeriodComparison {
  /** 當期標籤 */
  currentLabel: string;
  /** 前期標籤 */
  previousLabel: string;
  /** 當期指標 */
  current: MonthlyMetrics;
  /** 前期指標 */
  previous: MonthlyMetrics;
  /** 總量變化（正=增加，負=減少） */
  totalDelta: number;
  /** 勝率變化（百分點） */
  winRateDelta: number;
  /** 得標預算變化 */
  wonBudgetDelta: number;
}

// ====== 核心函式 ======

/** 從 timestamp 取得 YYYY-MM 格式 */
export function toYearMonth(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** 依截標時間按月分組，回傳按時間排序的月度指標 */
export function computeMonthlyMetrics(pages: NotionPage[]): MonthlyMetrics[] {
  const buckets: Record<string, NotionPage[]> = {};

  for (const p of pages) {
    const ts = parseDateField(p.properties[F.截標]);
    if (!ts) continue;
    const ym = toYearMonth(ts);
    if (!buckets[ym]) buckets[ym] = [];
    buckets[ym].push(p);
  }

  return Object.keys(buckets)
    .sort()
    .map((month) => aggregateMonth(month, buckets[month]));
}

/** 計算滾動勝率（預設 3 個月視窗） */
export function computeRollingMetrics(
  monthly: MonthlyMetrics[],
  windowSize = 3,
): RollingMetrics[] {
  return monthly.map((m, i) => {
    if (i < windowSize - 1) {
      return { ...m, rollingWinRate: null };
    }
    const windowSlice = monthly.slice(i - windowSize + 1, i + 1);
    const totalConcluded = windowSlice.reduce((s, x) => s + x.concluded, 0);
    const totalWon = windowSlice.reduce((s, x) => s + x.won, 0);
    const rollingWinRate = totalConcluded > 0
      ? Math.round((totalWon / totalConcluded) * 100)
      : null;
    return { ...m, rollingWinRate };
  });
}

/** 比較兩個期間（用月份範圍的 MonthlyMetrics 加總） */
export function comparePeriods(
  currentMonths: MonthlyMetrics[],
  previousMonths: MonthlyMetrics[],
  currentLabel: string,
  previousLabel: string,
): PeriodComparison {
  const current = mergeMonths("current", currentMonths);
  const previous = mergeMonths("previous", previousMonths);
  return {
    currentLabel,
    previousLabel,
    current,
    previous,
    totalDelta: current.total - previous.total,
    winRateDelta: current.winRate - previous.winRate,
    wonBudgetDelta: current.wonBudget - previous.wonBudget,
  };
}

/** 取得最近 N 個月的月份標籤（包含當前月） */
export function getRecentMonths(referenceDate: Date, count: number): string[] {
  const months: string[] = [];
  const d = new Date(referenceDate);
  for (let i = 0; i < count; i++) {
    months.unshift(toYearMonth(d.getTime()));
    d.setMonth(d.getMonth() - 1);
  }
  return months;
}

/**
 * 快速產出：當季 vs 上季比較
 * referenceDate 用來決定「當季」是哪個季度
 */
export function compareQuarters(
  monthly: MonthlyMetrics[],
  referenceDate: Date,
): PeriodComparison | null {
  const refMonth = referenceDate.getMonth(); // 0-11
  const refYear = referenceDate.getFullYear();
  const currentQ = Math.floor(refMonth / 3); // 0-3
  const currentQStart = new Date(refYear, currentQ * 3, 1);
  const prevQStart = new Date(refYear, (currentQ - 1) * 3, 1);

  const currentQMonths = getRecentMonthsFrom(currentQStart, 3);
  const prevQMonths = getRecentMonthsFrom(prevQStart, 3);

  const lookup = new Map(monthly.map((m) => [m.month, m]));
  const currentData = currentQMonths.map((m) => lookup.get(m)).filter(Boolean) as MonthlyMetrics[];
  const prevData = prevQMonths.map((m) => lookup.get(m)).filter(Boolean) as MonthlyMetrics[];

  if (currentData.length === 0 && prevData.length === 0) return null;

  const qLabel = (start: Date) => `${start.getFullYear()} Q${Math.floor(start.getMonth() / 3) + 1}`;

  return comparePeriods(
    currentData,
    prevData,
    qLabel(currentQStart),
    qLabel(prevQStart),
  );
}

// ====== 內部工具 ======

function getRecentMonthsFrom(start: Date, count: number): string[] {
  const months: string[] = [];
  const d = new Date(start);
  for (let i = 0; i < count; i++) {
    months.push(toYearMonth(d.getTime()));
    d.setMonth(d.getMonth() + 1);
  }
  return months;
}

function aggregateMonth(month: string, pages: NotionPage[]): MonthlyMetrics {
  let won = 0, lost = 0, cancelled = 0, disqualified = 0;
  let wonBudget = 0, costBid = 0, costFee = 0;

  for (const p of pages) {
    const status = p.properties[F.進程] ?? "";
    switch (status) {
      case BID_STATUS.得標:
        won++;
        wonBudget += p.properties[F.預算] ?? 0;
        break;
      case BID_STATUS.未獲青睞: lost++; break;
      case BID_STATUS.流標廢標: cancelled++; break;
      case BID_STATUS.資格不符: disqualified++; break;
    }
    if (PROCURED_STATUSES.has(status)) {
      costBid += p.properties[F.押標金] ?? 0;
      costFee += p.properties[F.領標費] ?? 0;
    }
  }

  const concluded = won + lost + cancelled + disqualified;
  const winRate = concluded > 0 ? Math.round((won / concluded) * 100) : 0;

  return {
    month, total: pages.length,
    won, lost, cancelled, concluded,
    winRate, wonBudget, costBid, costFee,
  };
}

function mergeMonths(label: string, months: MonthlyMetrics[]): MonthlyMetrics {
  if (months.length === 0) {
    return {
      month: label, total: 0, won: 0, lost: 0, cancelled: 0,
      concluded: 0, winRate: 0, wonBudget: 0, costBid: 0, costFee: 0,
    };
  }
  const total = months.reduce((s, m) => s + m.total, 0);
  const won = months.reduce((s, m) => s + m.won, 0);
  const lost = months.reduce((s, m) => s + m.lost, 0);
  const cancelled = months.reduce((s, m) => s + m.cancelled, 0);
  const concluded = months.reduce((s, m) => s + m.concluded, 0);
  const winRate = concluded > 0 ? Math.round((won / concluded) * 100) : 0;
  const wonBudget = months.reduce((s, m) => s + m.wonBudget, 0);
  const costBid = months.reduce((s, m) => s + m.costBid, 0);
  const costFee = months.reduce((s, m) => s + m.costFee, 0);

  return { month: label, total, won, lost, cancelled, concluded, winRate, wonBudget, costBid, costFee };
}
