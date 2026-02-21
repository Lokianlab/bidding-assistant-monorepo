/**
 * 個人績效報告卡
 * 從 useCrossAnalysis.ts 抽取的純函式
 */

import type { NotionPage } from "../types";
import { F, SUNK_STATUSES } from "../types";
import { BID_STATUS } from "@/lib/constants/bid-status";
import { parseDateField } from "../helpers";
import {
  buildBreakdown, analyzeByAgency, analyzeByType,
  analyzeByMethod, analyzeByBudgetRange,
} from "./breakdown";
import type { ResultBreakdown, Insight } from "./breakdown";

/** 個人報告卡 */
export interface PersonReport {
  name: string;
  total: number;
  won: number;
  winRate: number;
  wonBudget: number;
  costTotal: number;
  breakdown: ResultBreakdown;
  warnings: Insight[];
  strengths: Insight[];
  quarterTrend: { quarter: string; submitted: number; won: number; winRate: number }[];
  agencyStats: ResultBreakdown[];
  typeStats: ResultBreakdown[];
  methodStats: ResultBreakdown[];
  budgetRangeStats: ResultBreakdown[];
}

export function buildPersonReport(
  name: string,
  pages: NotionPage[],
  allPages: NotionPage[],
): PersonReport {
  const myPages = pages.filter((p) => {
    const writers = p.properties[F.企劃主筆] ?? [];
    return Array.isArray(writers) && writers.includes(name);
  });

  const breakdown = buildBreakdown(name, myPages);
  const teamBreakdown = buildBreakdown("team", allPages);
  const teamDisqualRate = teamBreakdown.total > 0
    ? Math.round((teamBreakdown.disqualified / teamBreakdown.total) * 100) : 0;
  const teamWithdrawRate = teamBreakdown.total > 0
    ? Math.round((teamBreakdown.withdrawn / teamBreakdown.total) * 100) : 0;

  const warnings: Insight[] = [];
  const strengths: Insight[] = [];

  // (1) 資格不符率
  const myDisqualRate = breakdown.total > 0
    ? Math.round((breakdown.disqualified / breakdown.total) * 100) : 0;
  if (breakdown.disqualified > 0 && myDisqualRate > teamDisqualRate + 5) {
    warnings.push({
      icon: "\uD83D\uDD34", severity: 90,
      type: "bad", relatedKey: name,
      text: `資格不符率 ${myDisqualRate}%（${breakdown.disqualified}/${breakdown.total} 件），`
        + `團隊平均 ${teamDisqualRate}%。建議回頭檢查資格文件準備流程。`,
    });
  } else if (breakdown.disqualified > 0) {
    warnings.push({
      icon: "\uD83D\uDFE1", severity: 50,
      type: "warn", relatedKey: name,
      text: `有 ${breakdown.disqualified} 件資格不符（${myDisqualRate}%），雖接近團隊平均，仍需留意。`,
    });
  }

  // (2) 未參與/逾期
  if (breakdown.withdrawn > 0) {
    const wastedCost = myPages
      .filter((p) => SUNK_STATUSES.has(p.properties[F.進程] ?? ""))
      .reduce((s, p) => s + (p.properties[F.押標金] ?? 0) + (p.properties[F.領標費] ?? 0), 0);
    const myWithdrawRate = Math.round((breakdown.withdrawn / breakdown.total) * 100);
    warnings.push({
      icon: myWithdrawRate > teamWithdrawRate + 5 ? "\uD83D\uDD34" : "\uD83D\uDFE1",
      severity: myWithdrawRate > teamWithdrawRate + 5 ? 80 : 40,
      type: myWithdrawRate > teamWithdrawRate + 5 ? "bad" : "warn",
      relatedKey: name,
      text: `未參與/逾期 ${breakdown.withdrawn} 件（${myWithdrawRate}%），`
        + `浪費押標金+領標費合計 $${wastedCost.toLocaleString("zh-TW")}。`
        + `建議提早評估是否有足夠人力備標。`,
    });
  }

  // (3) 未獲青睞佔比
  const lostRate = breakdown.total > 0
    ? Math.round((breakdown.lost / breakdown.total) * 100) : 0;
  if (lostRate >= 40 && breakdown.lost >= 3) {
    warnings.push({
      icon: "\uD83D\uDD34", severity: 70,
      type: "bad", relatedKey: name,
      text: `未獲青睞比率 ${lostRate}%（${breakdown.lost} 件），偏高。`
        + `建議檢視簡報表現、價格策略或技術建議書品質。`,
    });
  }

  // (4) 整體得標率 vs 團隊
  const teamWinRate = teamBreakdown.winRate;
  if (breakdown.winRate < teamWinRate - 15 && breakdown.total >= 5) {
    warnings.push({
      icon: "\uD83D\uDFE1", severity: 60,
      type: "warn", relatedKey: name,
      text: `整體得標率 ${breakdown.winRate}%，低於團隊平均 ${teamWinRate}%。`,
    });
  }

  // 按維度分析
  const agencyStats = analyzeByAgency(myPages);
  const typeStats = analyzeByType(myPages);
  const methodStats = analyzeByMethod(myPages);
  const budgetRangeStats = analyzeByBudgetRange(myPages);

  // (5) 機關連敗
  for (const ag of agencyStats) {
    if (ag.won === 0 && ag.total >= 3) {
      warnings.push({
        icon: "\uD83D\uDD34", severity: 75,
        type: "bad", relatedKey: name,
        text: `在「${ag.key}」已投 ${ag.total} 件全數未得標，`
          + `累計投入 $${(ag.costBid + ag.costFee).toLocaleString("zh-TW")}。`
          + `建議評估是否繼續投入此機關。`,
      });
    }
  }

  // (6) 大案 vs 小案勝率差異
  const bigCase = budgetRangeStats.find((b) =>
    b.key === "1000萬~3000萬" || b.key === "3000萬以上");
  const smallCase = budgetRangeStats.find((b) =>
    b.key === "100萬以下" || b.key === "100萬~500萬");
  if (bigCase && smallCase && bigCase.total >= 3 && smallCase.total >= 3) {
    if (bigCase.winRate < smallCase.winRate - 20) {
      warnings.push({
        icon: "\uD83D\uDFE1", severity: 55,
        type: "warn", relatedKey: name,
        text: `大案（${bigCase.key}）勝率 ${bigCase.winRate}%，`
          + `小案（${smallCase.key}）勝率 ${smallCase.winRate}%，差距明顯。`
          + `大案可考慮與資深人員協作。`,
      });
    }
  }

  // 找亮點
  if (breakdown.winRate > teamWinRate + 10 && breakdown.total >= 3) {
    strengths.push({
      icon: "\uD83D\uDFE2", severity: 90,
      type: "good", relatedKey: name,
      text: `整體得標率 ${breakdown.winRate}%，高於團隊平均 ${teamWinRate}%，表現優秀！`,
    });
  }

  for (const ts of typeStats) {
    if (ts.winRate >= 50 && ts.total >= 3) {
      strengths.push({
        icon: "\uD83D\uDFE2", severity: 80,
        type: "good", relatedKey: name,
        text: `在「${ts.key}」類型勝率 ${ts.winRate}%（${ts.won}/${ts.total}），是你的強項領域。`,
      });
    }
  }

  for (const ag of agencyStats) {
    if (ag.winRate >= 50 && ag.total >= 3) {
      strengths.push({
        icon: "\uD83D\uDFE2", severity: 75,
        type: "good", relatedKey: name,
        text: `在「${ag.key}」勝率 ${ag.winRate}%（${ag.won}/${ag.total}），是你的主場機關。`,
      });
    }
  }

  for (const ms of methodStats) {
    if (ms.winRate >= 50 && ms.total >= 3) {
      strengths.push({
        icon: "\uD83D\uDFE2", severity: 70,
        type: "good", relatedKey: name,
        text: `在「${ms.key}」評審方式勝率 ${ms.winRate}%（${ms.won}/${ms.total}）。`,
      });
    }
  }

  // 季度趨勢
  const quarterMap: Record<string, { submitted: number; won: number }> = {};
  for (const p of myPages) {
    const ts = parseDateField(p.properties[F.截標]);
    if (!ts) continue;
    const d = new Date(ts);
    const q = Math.ceil((d.getMonth() + 1) / 3);
    const key = `${d.getFullYear()} Q${q}`;
    if (!quarterMap[key]) quarterMap[key] = { submitted: 0, won: 0 };
    quarterMap[key].submitted++;
    if (p.properties[F.進程] === BID_STATUS.得標) quarterMap[key].won++;
  }

  const quarterTrend = Object.entries(quarterMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([quarter, v]) => ({
      quarter,
      submitted: v.submitted,
      won: v.won,
      winRate: v.submitted > 0 ? Math.round((v.won / v.submitted) * 100) : 0,
    }));

  // 趨勢下滑檢測
  if (quarterTrend.length >= 3) {
    const last3 = quarterTrend.slice(-3);
    const isDecline = last3.every((_, i) =>
      i === 0 || last3[i].winRate <= last3[i - 1].winRate);
    if (isDecline && last3[last3.length - 1].winRate < last3[0].winRate - 10) {
      warnings.push({
        icon: "\uD83D\uDCC9", severity: 65,
        type: "warn", relatedKey: name,
        text: `近 3 季得標率持續下滑：${last3.map((q) => `${q.quarter} ${q.winRate}%`).join(" → ")}，需關注。`,
      });
    }
  }

  warnings.sort((a, b) => b.severity - a.severity);
  strengths.sort((a, b) => b.severity - a.severity);

  return {
    name,
    total: breakdown.total,
    won: breakdown.won,
    winRate: breakdown.winRate,
    wonBudget: breakdown.wonBudget,
    costTotal: breakdown.costBid + breakdown.costFee,
    breakdown, warnings, strengths,
    quarterTrend, agencyStats, typeStats,
    methodStats, budgetRangeStats,
  };
}
