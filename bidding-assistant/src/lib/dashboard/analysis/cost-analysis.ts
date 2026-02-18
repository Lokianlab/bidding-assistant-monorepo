/**
 * 成本效益分析
 * 從 useCrossAnalysis.ts 抽取的純函式
 */

import type { NotionPage } from "../types";
import { F, PROCURED_STATUSES, SUNK_STATUSES } from "../types";
import { groupByField } from "./breakdown";

// ====== 型別 ======

export interface CostAnalysisResult {
  sunkCostPages: { name: string; agency: string; costBid: number; costFee: number; budget: number }[];
  sunkCostTotal: number;
  agencyROI: { key: string; costTotal: number; wonBudget: number; roi: number; total: number; won: number }[];
  typeROI: { key: string; costTotal: number; wonBudget: number; roi: number; total: number; won: number }[];
  totalInvested: number;
  totalWonBudget: number;
  overallROI: number;
}

// ====== 計算函式 ======

export function computeCostAnalysis(pages: NotionPage[]): CostAnalysisResult {
  // 沉沒成本
  const sunkPages = pages.filter((p) => SUNK_STATUSES.has(p.properties[F.進程] ?? ""));
  const sunkCostPages = sunkPages.map((p) => ({
    name: p.properties[F.名稱] ?? "",
    agency: p.properties[F.招標機關] ?? "",
    costBid: p.properties[F.押標金] ?? 0,
    costFee: p.properties[F.領標費] ?? 0,
    budget: p.properties[F.預算] ?? 0,
  })).sort((a, b) => (b.costBid + b.costFee) - (a.costBid + a.costFee));

  const sunkCostTotal = sunkCostPages.reduce((s, p) => s + p.costBid + p.costFee, 0);

  // 機關 ROI
  const agencyGroups = groupByField(pages, (p) => [p.properties[F.招標機關] ?? ""].filter(Boolean));
  const agencyROI = Object.entries(agencyGroups)
    .map(([key, gPages]) => {
      const costTotal = gPages
        .filter((p) => PROCURED_STATUSES.has(p.properties[F.進程] ?? ""))
        .reduce((s, p) => s + (p.properties[F.押標金] ?? 0) + (p.properties[F.領標費] ?? 0), 0);
      const wonBudget = gPages
        .filter((p) => p.properties[F.進程] === "得標")
        .reduce((s, p) => s + (p.properties[F.預算] ?? 0), 0);
      return {
        key, costTotal, wonBudget,
        roi: costTotal > 0 ? Math.round((wonBudget / costTotal) * 100) / 100 : 0,
        total: gPages.length,
        won: gPages.filter((p) => p.properties[F.進程] === "得標").length,
      };
    })
    .filter((r) => r.costTotal > 0)
    .sort((a, b) => b.roi - a.roi);

  // 類型 ROI
  const typeGroups = groupByField(pages, (p) => {
    const t = p.properties[F.標案類型] ?? [];
    return Array.isArray(t) ? t.filter(Boolean) : [];
  });
  const typeROI = Object.entries(typeGroups)
    .map(([key, gPages]) => {
      const costTotal = gPages
        .filter((p) => PROCURED_STATUSES.has(p.properties[F.進程] ?? ""))
        .reduce((s, p) => s + (p.properties[F.押標金] ?? 0) + (p.properties[F.領標費] ?? 0), 0);
      const wonBudget = gPages
        .filter((p) => p.properties[F.進程] === "得標")
        .reduce((s, p) => s + (p.properties[F.預算] ?? 0), 0);
      return {
        key, costTotal, wonBudget,
        roi: costTotal > 0 ? Math.round((wonBudget / costTotal) * 100) / 100 : 0,
        total: gPages.length,
        won: gPages.filter((p) => p.properties[F.進程] === "得標").length,
      };
    })
    .filter((r) => r.costTotal > 0)
    .sort((a, b) => b.roi - a.roi);

  // 全局
  const totalInvested = pages
    .filter((p) => PROCURED_STATUSES.has(p.properties[F.進程] ?? ""))
    .reduce((s, p) => s + (p.properties[F.押標金] ?? 0) + (p.properties[F.領標費] ?? 0), 0);
  const totalWonBudget = pages
    .filter((p) => p.properties[F.進程] === "得標")
    .reduce((s, p) => s + (p.properties[F.預算] ?? 0), 0);

  return {
    sunkCostPages, sunkCostTotal,
    agencyROI, typeROI,
    totalInvested, totalWonBudget,
    overallROI: totalInvested > 0 ? Math.round((totalWonBudget / totalInvested) * 100) / 100 : 0,
  };
}
