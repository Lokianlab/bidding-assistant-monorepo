/**
 * 一維分析：各維度的 ResultBreakdown 計算
 * 從 useCrossAnalysis.ts 抽取的純函式
 */

import type { NotionPage } from "../types";
import { F, PROCURED_STATUSES } from "../types";
import { BID_STATUS } from "@/lib/constants/bid-status";

// ====== 型別 ======

/** 結果分布（一個分析主體的各狀態件數） */
export interface ResultBreakdown {
  key: string;
  total: number;
  won: number;
  lost: number;
  cancelled: number;
  disqualified: number;
  withdrawn: number;
  active: number;
  winRate: number;
  wonBudget: number;
  costBid: number;
  costFee: number;
}

/** 白話洞見 */
export interface Insight {
  icon: string;
  text: string;
  type: "good" | "warn" | "bad" | "info" | "discovery";
  severity: number;
  relatedKey?: string;
}

// ====== 預算區間 ======

export const BUDGET_RANGES = [
  { label: "100萬以下", min: 0, max: 1_000_000 },
  { label: "100萬~500萬", min: 1_000_000, max: 5_000_000 },
  { label: "500萬~1000萬", min: 5_000_000, max: 10_000_000 },
  { label: "1000萬~3000萬", min: 10_000_000, max: 30_000_000 },
  { label: "3000萬以上", min: 30_000_000, max: Infinity },
];

export function getBudgetRange(amount: number): string {
  for (const r of BUDGET_RANGES) {
    if (amount >= r.min && amount < r.max) return r.label;
  }
  return "3000萬以上";
}

// ====== 核心工具函式 ======

/** 計算 ResultBreakdown */
export function buildBreakdown(key: string, pages: NotionPage[]): ResultBreakdown {
  let won = 0, lost = 0, cancelled = 0, disqualified = 0, withdrawn = 0, active = 0;
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
      case BID_STATUS.領標後未參與:
      case BID_STATUS.逾期未參與:
        withdrawn++; break;
      default: active++; break;
    }
    if (PROCURED_STATUSES.has(status)) {
      costBid += p.properties[F.押標金] ?? 0;
      costFee += p.properties[F.領標費] ?? 0;
    }
  }

  const concluded = won + lost + cancelled + disqualified;
  const winRate = concluded > 0 ? Math.round((won / concluded) * 100) : 0;

  return {
    key, total: pages.length,
    won, lost, cancelled, disqualified, withdrawn, active,
    winRate, wonBudget, costBid, costFee,
  };
}

/** 依指定欄位分組 */
export function groupByField(
  pages: NotionPage[],
  getKeys: (p: NotionPage) => string[],
): Record<string, NotionPage[]> {
  const map: Record<string, NotionPage[]> = {};
  for (const p of pages) {
    const keys = getKeys(p);
    for (const k of keys) {
      if (!k) continue;
      if (!map[k]) map[k] = [];
      map[k].push(p);
    }
  }
  return map;
}

// ====== 一維分析函式 ======

/** 人物 × 結果 */
export function analyzeByWriter(pages: NotionPage[]): ResultBreakdown[] {
  const groups = groupByField(pages, (p) => {
    const writers = p.properties[F.企劃主筆] ?? [];
    return Array.isArray(writers) ? writers.filter(Boolean) : [];
  });
  return Object.entries(groups)
    .map(([k, v]) => buildBreakdown(k, v))
    .sort((a, b) => b.total - a.total);
}

/** 機關 × 結果 */
export function analyzeByAgency(pages: NotionPage[]): ResultBreakdown[] {
  const groups = groupByField(pages, (p) => [p.properties[F.招標機關] ?? ""]);
  return Object.entries(groups)
    .filter(([k]) => k !== "")
    .map(([k, v]) => buildBreakdown(k, v))
    .sort((a, b) => b.total - a.total);
}

/** 類型 × 結果 */
export function analyzeByType(pages: NotionPage[]): ResultBreakdown[] {
  const groups = groupByField(pages, (p) => {
    const types = p.properties[F.標案類型] ?? [];
    return Array.isArray(types) ? types.filter(Boolean) : [];
  });
  return Object.entries(groups)
    .map(([k, v]) => buildBreakdown(k, v))
    .sort((a, b) => b.total - a.total);
}

/** 評審方式 × 結果 */
export function analyzeByMethod(pages: NotionPage[]): ResultBreakdown[] {
  const groups = groupByField(pages, (p) => [p.properties[F.評審方式] ?? ""]);
  return Object.entries(groups)
    .filter(([k]) => k !== "")
    .map(([k, v]) => buildBreakdown(k, v))
    .sort((a, b) => b.total - a.total);
}

/** 金額區間 × 結果 */
export function analyzeByBudgetRange(pages: NotionPage[]): ResultBreakdown[] {
  const groups = groupByField(pages, (p) => [getBudgetRange(p.properties[F.預算] ?? 0)]);
  const order = BUDGET_RANGES.map((r) => r.label);
  return order
    .filter((label) => groups[label]?.length)
    .map((label) => buildBreakdown(label, groups[label]));
}

/** 投遞序位 × 結果 */
export function analyzeByPriority(pages: NotionPage[]): ResultBreakdown[] {
  const groups = groupByField(pages, (p) => [p.properties[F.投遞序位] ?? ""]);
  return Object.entries(groups)
    .filter(([k]) => k !== "")
    .map(([k, v]) => buildBreakdown(k, v))
    .sort((a, b) => b.total - a.total);
}

/** 備標決策 × 結果 */
export function analyzeByDecision(pages: NotionPage[]): ResultBreakdown[] {
  const groups = groupByField(pages, (p) => [p.properties[F.決策] ?? ""]);
  return Object.entries(groups)
    .filter(([k]) => k !== "")
    .map(([k, v]) => buildBreakdown(k, v))
    .sort((a, b) => b.total - a.total);
}
