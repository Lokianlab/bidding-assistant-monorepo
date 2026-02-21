"use client";

import { useMemo } from "react";
import type { NotionPage } from "./types";
import { F, PROCURED_STATUSES } from "./types";
import { BID_STATUS } from "@/lib/constants/bid-status";
import { parseDateField } from "./helpers";

// ====== 型別 ======

export interface MonthStat {
  key: string;       // "2024-03"
  label: string;     // "2024年3月"
  submitted: number;
  won: number;
  winRate: number;
  wonBudget: number;
}

export interface WeekStat {
  key: string;       // "2024-W12"
  label: string;     // "2024 第12週"
  submitted: number;
  won: number;
  winRate: number;
  wonBudget: number;
}

export interface WriterStat {
  name: string;
  submitted: number;
  won: number;
  winRate: number;
  wonBudget: number;
}

export interface WriterMonthlyPoint {
  writer: string;
  month: string;
  submitted: number;
  won: number;
}

export interface AnalyticsTotals {
  submitted: number;
  won: number;
  winRate: number;
  wonBudget: number;
  totalCostAmount: number;
}

/** 每期間 × 各狀態件數（用於明細表） */
export interface PeriodStatusRow {
  key: string;           // "2024-03" 或 "2024-W12"
  label: string;         // "2024年3月" 或 "2024 第12週"
  dateRange: string;     // "2024/03/01 - 2024/03/31" 或 "2024/01/01 - 2024/01/07"
  total: number;
  statusCounts: Record<string, number>;  // { "已投標": 2, "得標": 1, ... }
}

/** 累計統計（累加圖用） */
export interface CumulativeStat {
  key: string;           // "2024-03" 或 "2024-W12"
  label: string;
  submitted: number;     // 當期投標件數
  won: number;           // 當期得標件數
  wonBudget: number;     // 當期得標金額
  cumSubmitted: number;  // 累計投標件數
  cumWon: number;        // 累計得標件數
  cumWonBudget: number;  // 累計得標金額
}

/** 同期比較單點 */
export interface YoYPoint {
  period: string;        // "1月" 或 "第1週"
  periodNum: number;     // 1~12 (月) 或 1~53 (週)
  baseSubmitted: number;
  baseWon: number;
  baseWonBudget: number;
  compareSubmitted: number;
  compareWon: number;
  compareWonBudget: number;
}

/** 同期比較結果 */
export interface YoYSummary {
  baseYear: number;
  compareYear: number;
  data: YoYPoint[];
  baseTotals: { submitted: number; won: number; wonBudget: number };
  compareTotals: { submitted: number; won: number; wonBudget: number };
}

export interface AnalyticsMetrics {
  monthlyStats: MonthStat[];
  weeklyStats: WeekStat[];
  writerStats: WriterStat[];
  writerMonthly: WriterMonthlyPoint[];
  totals: AnalyticsTotals;
  statusBreakdown: { name: string; value: number }[];
  monthlyStatusTable: PeriodStatusRow[];
  weeklyStatusTable: PeriodStatusRow[];
  monthlyCumulative: CumulativeStat[];
  weeklyCumulative: CumulativeStat[];
}

// ====== ISO 週數計算 ======

function getISOWeek(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: d.getUTCFullYear(), week: weekNo };
}

/** 計算某一年的最大 ISO 週數（52 或 53） */
function getMaxISOWeek(year: number): number {
  // 如果 12/31 落在 ISO 第 53 週，則該年有 53 週
  const dec31 = new Date(year, 11, 31);
  const { week } = getISOWeek(dec31);
  // 若 12/31 在第 1 週（歸屬下一年），回退到 12/28 再算
  if (week === 1) {
    const dec28 = new Date(year, 11, 28);
    return getISOWeek(dec28).week;
  }
  return week;
}

/** 取得 ISO 某週的週一和週日 */
function getWeekDateRange(year: number, week: number): { start: Date; end: Date } {
  // ISO 第 1 週包含 1 月 4 日
  const jan4 = new Date(year, 0, 4);
  const jan4Day = jan4.getDay() || 7;
  // 該年 ISO 第 1 週的週一
  const firstMonday = new Date(jan4);
  firstMonday.setDate(jan4.getDate() - jan4Day + 1);
  // 目標週的週一
  const start = new Date(firstMonday);
  start.setDate(firstMonday.getDate() + (week - 1) * 7);
  // 週日
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start, end };
}

/** 格式化日期為 YYYY/MM/DD */
function fmtDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}/${m}/${day}`;
}

// ====== Hook ======

export function useAnalyticsMetrics(pages: NotionPage[]): AnalyticsMetrics {
  // 月份統計
  const monthlyStats = useMemo(() => {
    const map: Record<string, { submitted: number; won: number; wonBudget: number }> = {};
    for (const p of pages) {
      const ts = parseDateField(p.properties[F.截標]);
      if (!ts) continue;
      const d = new Date(ts);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!map[key]) map[key] = { submitted: 0, won: 0, wonBudget: 0 };
      map[key].submitted++;
      if (p.properties[F.進程] === BID_STATUS.得標) {
        map[key].won++;
        map[key].wonBudget += p.properties[F.預算] ?? 0;
      }
    }
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, v]) => {
        const [y, m] = key.split("-");
        return {
          key,
          label: `${y}年${parseInt(m)}月`,
          submitted: v.submitted,
          won: v.won,
          winRate: v.submitted > 0 ? Math.round((v.won / v.submitted) * 100) : 0,
          wonBudget: v.wonBudget,
        };
      });
  }, [pages]);

  // 週統計（補零：填充缺失的週讓圖表連續）
  const weeklyStats = useMemo(() => {
    const map: Record<string, { submitted: number; won: number; wonBudget: number }> = {};
    for (const p of pages) {
      const ts = parseDateField(p.properties[F.截標]);
      if (!ts) continue;
      const d = new Date(ts);
      const { year, week } = getISOWeek(d);
      const key = `${year}-W${String(week).padStart(2, "0")}`;
      if (!map[key]) map[key] = { submitted: 0, won: 0, wonBudget: 0 };
      map[key].submitted++;
      if (p.properties[F.進程] === BID_STATUS.得標) {
        map[key].won++;
        map[key].wonBudget += p.properties[F.預算] ?? 0;
      }
    }

    const keys = Object.keys(map).sort();
    if (keys.length < 2) {
      return keys.map((key) => {
        const [y, w] = key.split("-W");
        const v = map[key];
        return {
          key, label: `${y} 第${parseInt(w)}週`,
          submitted: v.submitted, won: v.won,
          winRate: v.submitted > 0 ? Math.round((v.won / v.submitted) * 100) : 0,
          wonBudget: v.wonBudget,
        };
      });
    }

    // 填充從第一週到最後一週的所有缺失週
    const firstKey = keys[0];
    const lastKey = keys[keys.length - 1];
    const [startY, startW] = firstKey.split("-W").map(Number);
    const [endY, endW] = lastKey.split("-W").map(Number);

    const result: WeekStat[] = [];
    let curY = startY;
    let curW = startW;

    while (curY < endY || (curY === endY && curW <= endW)) {
      const key = `${curY}-W${String(curW).padStart(2, "0")}`;
      const v = map[key] ?? { submitted: 0, won: 0, wonBudget: 0 };
      result.push({
        key,
        label: `${curY} 第${curW}週`,
        submitted: v.submitted,
        won: v.won,
        winRate: v.submitted > 0 ? Math.round((v.won / v.submitted) * 100) : 0,
        wonBudget: v.wonBudget,
      });

      // 下一週（ISO 一年最多 52 或 53 週）
      curW++;
      // 簡化：用 53 作為最大週數，若超過就進入下一年
      const maxWeek = getMaxISOWeek(curY);
      if (curW > maxWeek) {
        curW = 1;
        curY++;
      }
    }

    return result;
  }, [pages]);

  // 主筆統計
  const writerStats = useMemo(() => {
    const map: Record<string, { submitted: number; won: number; wonBudget: number }> = {};
    for (const p of pages) {
      const writers: string[] = p.properties[F.企劃主筆] ?? [];
      if (!Array.isArray(writers)) continue;
      for (const w of writers) {
        if (!w) continue;
        if (!map[w]) map[w] = { submitted: 0, won: 0, wonBudget: 0 };
        map[w].submitted++;
        if (p.properties[F.進程] === BID_STATUS.得標) {
          map[w].won++;
          map[w].wonBudget += p.properties[F.預算] ?? 0;
        }
      }
    }
    return Object.entries(map)
      .map(([name, v]) => ({
        name,
        submitted: v.submitted,
        won: v.won,
        winRate: v.submitted > 0 ? Math.round((v.won / v.submitted) * 100) : 0,
        wonBudget: v.wonBudget,
      }))
      .sort((a, b) => b.submitted - a.submitted);
  }, [pages]);

  // 主筆 × 月份交叉
  const writerMonthly = useMemo(() => {
    const results: WriterMonthlyPoint[] = [];
    const map: Record<string, Record<string, { submitted: number; won: number }>> = {};
    for (const p of pages) {
      const ts = parseDateField(p.properties[F.截標]);
      if (!ts) continue;
      const d = new Date(ts);
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const writers: string[] = p.properties[F.企劃主筆] ?? [];
      if (!Array.isArray(writers)) continue;
      for (const w of writers) {
        if (!w) continue;
        if (!map[w]) map[w] = {};
        if (!map[w][month]) map[w][month] = { submitted: 0, won: 0 };
        map[w][month].submitted++;
        if (p.properties[F.進程] === BID_STATUS.得標) map[w][month].won++;
      }
    }
    for (const [writer, months] of Object.entries(map)) {
      for (const [month, v] of Object.entries(months)) {
        results.push({ writer, month, submitted: v.submitted, won: v.won });
      }
    }
    return results;
  }, [pages]);

  // 總計
  const totals = useMemo(() => {
    let won = 0;
    let wonBudget = 0;
    let costBid = 0;
    let costFee = 0;
    for (const p of pages) {
      if (p.properties[F.進程] === BID_STATUS.得標) {
        won++;
        wonBudget += p.properties[F.預算] ?? 0;
      }
      if (PROCURED_STATUSES.has(p.properties[F.進程] ?? "")) {
        costBid += p.properties[F.押標金] ?? 0;
        costFee += p.properties[F.領標費] ?? 0;
      }
    }
    return {
      submitted: pages.length,
      won,
      winRate: pages.length > 0 ? Math.round((won / pages.length) * 100) : 0,
      wonBudget,
      totalCostAmount: costBid + costFee,
    };
  }, [pages]);

  // 狀態分布
  const statusBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of pages) {
      const s = p.properties[F.進程] ?? "未知";
      counts[s] = (counts[s] ?? 0) + 1;
    }
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [pages]);

  // ====== 月份 × 各狀態 明細表 ======
  const monthlyStatusTable = useMemo((): PeriodStatusRow[] => {
    const map: Record<string, Record<string, number>> = {};
    for (const p of pages) {
      const ts = parseDateField(p.properties[F.截標]);
      if (!ts) continue;
      const d = new Date(ts);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const status = p.properties[F.進程] ?? "未知";
      if (!map[key]) map[key] = {};
      map[key][status] = (map[key][status] ?? 0) + 1;
    }
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, counts]) => {
        const [y, m] = key.split("-").map(Number);
        const lastDay = new Date(y, m, 0).getDate();
        return {
          key,
          label: `${y}年${m}月`,
          dateRange: `${y}/${String(m).padStart(2, "0")}/01 - ${y}/${String(m).padStart(2, "0")}/${String(lastDay).padStart(2, "0")}`,
          total: Object.values(counts).reduce((a, b) => a + b, 0),
          statusCounts: counts,
        };
      });
  }, [pages]);

  // ====== 週 × 各狀態 明細表 ======
  const weeklyStatusTable = useMemo((): PeriodStatusRow[] => {
    const map: Record<string, Record<string, number>> = {};
    for (const p of pages) {
      const ts = parseDateField(p.properties[F.截標]);
      if (!ts) continue;
      const d = new Date(ts);
      const { year, week } = getISOWeek(d);
      const key = `${year}-W${String(week).padStart(2, "0")}`;
      const status = p.properties[F.進程] ?? "未知";
      if (!map[key]) map[key] = {};
      map[key][status] = (map[key][status] ?? 0) + 1;
    }

    const keys = Object.keys(map).sort();
    if (keys.length === 0) return [];

    // 也做補零
    if (keys.length < 2) {
      return keys.map((key) => {
        const counts = map[key];
        const [y, w] = key.split("-W").map(Number);
        const { start, end } = getWeekDateRange(y, w);
        return {
          key,
          label: `${y} 第${w}週`,
          dateRange: `${fmtDate(start)} - ${fmtDate(end)}`,
          total: Object.values(counts).reduce((a, b) => a + b, 0),
          statusCounts: counts,
        };
      });
    }

    const firstKey = keys[0];
    const lastKey = keys[keys.length - 1];
    const [startY, startW] = firstKey.split("-W").map(Number);
    const [endY, endW] = lastKey.split("-W").map(Number);

    const result: PeriodStatusRow[] = [];
    let curY = startY;
    let curW = startW;

    while (curY < endY || (curY === endY && curW <= endW)) {
      const key = `${curY}-W${String(curW).padStart(2, "0")}`;
      const counts = map[key] ?? {};
      const { start, end } = getWeekDateRange(curY, curW);
      result.push({
        key,
        label: `${curY} 第${curW}週`,
        dateRange: `${fmtDate(start)} - ${fmtDate(end)}`,
        total: Object.values(counts).reduce((a, b) => a + b, 0),
        statusCounts: counts,
      });
      curW++;
      const maxWeek = getMaxISOWeek(curY);
      if (curW > maxWeek) { curW = 1; curY++; }
    }
    return result;
  }, [pages]);

  // ====== 月份累加統計 ======
  const monthlyCumulative = useMemo((): CumulativeStat[] => {
    const result: CumulativeStat[] = [];
    monthlyStats.reduce((acc, m) => {
      const next = {
        cumS: acc.cumS + m.submitted,
        cumW: acc.cumW + m.won,
        cumB: acc.cumB + m.wonBudget,
      };
      result.push({
        key: m.key, label: m.label,
        submitted: m.submitted, won: m.won, wonBudget: m.wonBudget,
        cumSubmitted: next.cumS, cumWon: next.cumW, cumWonBudget: next.cumB,
      });
      return next;
    }, { cumS: 0, cumW: 0, cumB: 0 });
    return result;
  }, [monthlyStats]);

  // ====== 週累加統計 ======
  const weeklyCumulative = useMemo((): CumulativeStat[] => {
    const result: CumulativeStat[] = [];
    weeklyStats.reduce((acc, w) => {
      const next = {
        cumS: acc.cumS + w.submitted,
        cumW: acc.cumW + w.won,
        cumB: acc.cumB + w.wonBudget,
      };
      result.push({
        key: w.key, label: w.label,
        submitted: w.submitted, won: w.won, wonBudget: w.wonBudget,
        cumSubmitted: next.cumS, cumWon: next.cumW, cumWonBudget: next.cumB,
      });
      return next;
    }, { cumS: 0, cumW: 0, cumB: 0 });
    return result;
  }, [weeklyStats]);

  return {
    monthlyStats,
    weeklyStats,
    writerStats,
    writerMonthly,
    totals,
    statusBreakdown,
    monthlyStatusTable,
    weeklyStatusTable,
    monthlyCumulative,
    weeklyCumulative,
  };
}

// ====== 同期比較（Year-over-Year）工具函式 ======

export function computeYoY(
  pages: NotionPage[],
  baseYear: number,
  compareYear: number,
  granularity: "month" | "week",
): YoYSummary {
  // 分年份收集數據
  type Bucket = { submitted: number; won: number; wonBudget: number };
  const baseMap: Record<number, Bucket> = {};
  const compMap: Record<number, Bucket> = {};

  for (const p of pages) {
    const ts = parseDateField(p.properties[F.截標]);
    if (!ts) continue;
    const d = new Date(ts);

    let year: number;
    let periodNum: number;

    if (granularity === "month") {
      year = d.getFullYear();
      periodNum = d.getMonth() + 1; // 1~12
    } else {
      const iso = getISOWeek(d);
      year = iso.year;
      periodNum = iso.week;
    }

    const isWon = p.properties[F.進程] === BID_STATUS.得標;
    const budget = p.properties[F.預算] ?? 0;

    const target =
      year === baseYear ? baseMap :
      year === compareYear ? compMap :
      null;

    if (!target) continue;
    if (!target[periodNum]) target[periodNum] = { submitted: 0, won: 0, wonBudget: 0 };
    target[periodNum].submitted++;
    if (isWon) {
      target[periodNum].won++;
      target[periodNum].wonBudget += budget;
    }
  }

  // 決定 X 軸範圍
  const maxPeriod = granularity === "month" ? 12 : Math.max(
    getMaxISOWeek(baseYear),
    getMaxISOWeek(compareYear),
  );

  // 只保留至少有一邊有數據的期間
  const data: YoYPoint[] = [];
  const baseTotals = { submitted: 0, won: 0, wonBudget: 0 };
  const compareTotals = { submitted: 0, won: 0, wonBudget: 0 };

  for (let i = 1; i <= maxPeriod; i++) {
    const b = baseMap[i] ?? { submitted: 0, won: 0, wonBudget: 0 };
    const c = compMap[i] ?? { submitted: 0, won: 0, wonBudget: 0 };

    // 跳過完全空白的期間
    if (b.submitted === 0 && c.submitted === 0) continue;

    baseTotals.submitted += b.submitted;
    baseTotals.won += b.won;
    baseTotals.wonBudget += b.wonBudget;
    compareTotals.submitted += c.submitted;
    compareTotals.won += c.won;
    compareTotals.wonBudget += c.wonBudget;

    data.push({
      period: granularity === "month" ? `${i}月` : `第${i}週`,
      periodNum: i,
      baseSubmitted: b.submitted,
      baseWon: b.won,
      baseWonBudget: b.wonBudget,
      compareSubmitted: c.submitted,
      compareWon: c.won,
      compareWonBudget: c.wonBudget,
    });
  }

  return { baseYear, compareYear, data, baseTotals, compareTotals };
}
