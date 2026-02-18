/**
 * 全局檢討看板洞見生成
 * 從 useCrossAnalysis.ts 抽取的純函式
 */

import type { NotionPage } from "../types";
import { F, SUNK_STATUSES } from "../types";
import { parseDateField } from "../helpers";
import {
  buildBreakdown, analyzeByWriter, analyzeByAgency,
  analyzeByMethod, analyzeByType, analyzeByBudgetRange,
  analyzeByDecision,
} from "./breakdown";
import type { Insight } from "./breakdown";

export function generateGlobalInsights(pages: NotionPage[]): Insight[] {
  const insights: Insight[] = [];
  const teamBreakdown = buildBreakdown("team", pages);

  // (1) 每個人的問題
  const writerStats = analyzeByWriter(pages);
  const teamDisqualRate = teamBreakdown.total > 0
    ? (teamBreakdown.disqualified / teamBreakdown.total) * 100 : 0;

  for (const ws of writerStats) {
    if (ws.total < 2) continue;

    const disqualRate = (ws.disqualified / ws.total) * 100;
    if (ws.disqualified > 0 && disqualRate > 20) {
      insights.push({
        icon: "\uD83D\uDD34", severity: 95,
        type: "bad", relatedKey: ws.key,
        text: `${ws.key} 的資格不符率高達 ${Math.round(disqualRate)}%（${ws.disqualified}/${ws.total} 件），`
          + `遠超團隊平均 ${Math.round(teamDisqualRate)}%。請檢討資格文件準備流程。`,
      });
    }

    if (ws.withdrawn >= 2) {
      const wastedPages = pages.filter((p) => {
        const writers = p.properties[F.企劃主筆] ?? [];
        return Array.isArray(writers) && writers.includes(ws.key) &&
          SUNK_STATUSES.has(p.properties[F.進程] ?? "");
      });
      const wasted = wastedPages.reduce((s, p) =>
        s + (p.properties[F.押標金] ?? 0) + (p.properties[F.領標費] ?? 0), 0);
      insights.push({
        icon: "\uD83D\uDFE1", severity: 70,
        type: "warn", relatedKey: ws.key,
        text: `${ws.key} 有 ${ws.withdrawn} 件未參與/逾期，損失 $${wasted.toLocaleString("zh-TW")}。`
          + `建議加強標案篩選機制。`,
      });
    }

    // 近期趨勢下滑
    const myPages = pages.filter((p) => {
      const w = p.properties[F.企劃主筆] ?? [];
      return Array.isArray(w) && w.includes(ws.key);
    });
    const halfYear = Date.now() - 180 * 86400000;
    const recent = myPages.filter((p) => {
      const ts = parseDateField(p.properties[F.截標]);
      return ts > halfYear;
    });
    const older = myPages.filter((p) => {
      const ts = parseDateField(p.properties[F.截標]);
      return ts > 0 && ts <= halfYear;
    });
    if (recent.length >= 3 && older.length >= 3) {
      const recentBd = buildBreakdown("recent", recent);
      const olderBd = buildBreakdown("older", older);
      if (recentBd.winRate < olderBd.winRate - 20) {
        insights.push({
          icon: "\uD83D\uDCC9", severity: 75,
          type: "warn", relatedKey: ws.key,
          text: `${ws.key} 近半年得標率 ${recentBd.winRate}%，`
            + `較之前 ${olderBd.winRate}% 明顯下滑，需關注。`,
        });
      }
    }
  }

  // (2) 機關問題
  const agencyStats = analyzeByAgency(pages);
  for (const ag of agencyStats) {
    if (ag.won === 0 && ag.total >= 5) {
      insights.push({
        icon: "\uD83D\uDD34", severity: 85,
        type: "bad", relatedKey: ag.key,
        text: `在「${ag.key}」已投 ${ag.total} 件全數未得標，`
          + `累計投入 $${(ag.costBid + ag.costFee).toLocaleString("zh-TW")}。`
          + `建議暫停投標並檢討原因。`,
      });
    } else if (ag.winRate >= 50 && ag.total >= 3) {
      insights.push({
        icon: "\uD83D\uDFE2", severity: 30,
        type: "good", relatedKey: ag.key,
        text: `在「${ag.key}」勝率 ${ag.winRate}%（${ag.won}/${ag.total}），`
          + `是我們的主場優勢機關，建議持續深耕。`,
      });
    }
  }

  // (3) 評審方式
  const methodStats = analyzeByMethod(pages);
  for (const ms of methodStats) {
    if (ms.total < 3) continue;
    if (ms.winRate === 0) {
      insights.push({
        icon: "\uD83D\uDD34", severity: 80,
        type: "bad", relatedKey: ms.key,
        text: `「${ms.key}」評審方式的案件全數未得標（0/${ms.total}），`
          + `建議評估是否繼續投入此類型。`,
      });
    } else if (ms.winRate >= 50) {
      insights.push({
        icon: "\uD83D\uDFE2", severity: 25,
        type: "good", relatedKey: ms.key,
        text: `「${ms.key}」評審方式勝率 ${ms.winRate}%（${ms.won}/${ms.total}），`
          + `是我們有優勢的評審方式。`,
      });
    }
  }

  // (4) 類型
  const typeStats = analyzeByType(pages);
  for (const ts of typeStats) {
    if (ts.total < 3) continue;
    if (ts.winRate === 0) {
      insights.push({
        icon: "\uD83D\uDFE1", severity: 60,
        type: "warn", relatedKey: ts.key,
        text: `「${ts.key}」類型已投 ${ts.total} 件全數未得標，`
          + `此領域可能不適合我們。`,
      });
    } else if (ts.winRate >= 50) {
      insights.push({
        icon: "\uD83D\uDFE2", severity: 20,
        type: "good", relatedKey: ts.key,
        text: `「${ts.key}」類型勝率 ${ts.winRate}%（${ts.won}/${ts.total}），是我們的強項領域。`,
      });
    }
  }

  // (5) 預算區間
  const budgetStats = analyzeByBudgetRange(pages);
  for (const bs of budgetStats) {
    if (bs.total < 3) continue;
    if (bs.winRate === 0) {
      insights.push({
        icon: "\uD83D\uDFE1", severity: 55,
        type: "warn", relatedKey: bs.key,
        text: `預算「${bs.key}」的案件全敗（0/${bs.total}），`
          + `此金額區間可能不是我們的甜蜜點。`,
      });
    } else if (bs.winRate >= 50) {
      insights.push({
        icon: "\uD83D\uDFE2", severity: 20,
        type: "good",
        text: `預算「${bs.key}」勝率 ${bs.winRate}%（${bs.won}/${bs.total}），`
          + `是我們最有把握的金額區間。`,
      });
    }
  }

  // (6) 決策命中率
  const decisionStats = analyzeByDecision(pages);
  const first = decisionStats.find((d) => d.key === "第一順位");
  const second = decisionStats.find((d) => d.key === "第二順位");
  if (first && second && first.total >= 3 && second.total >= 3) {
    if (first.winRate < second.winRate) {
      insights.push({
        icon: "\uD83D\uDCA1", severity: 65,
        type: "discovery",
        text: `第一順位得標率 ${first.winRate}%（${first.won}/${first.total}），`
          + `反而低於第二順位 ${second.winRate}%（${second.won}/${second.total}）。`
          + `排序決策的標準可能需要重新校準。`,
      });
    }
    if (Math.abs(first.winRate - second.winRate) < 5 && first.total >= 5) {
      insights.push({
        icon: "\uD83D\uDCA1", severity: 50,
        type: "discovery",
        text: `第一順位（${first.winRate}%）與第二順位（${second.winRate}%）得標率差異不大，`
          + `排序的參考價值有限。`,
      });
    }
  }

  // (7) 成本效益
  if (teamBreakdown.withdrawn >= 3) {
    const wastedPages = pages.filter((p) => SUNK_STATUSES.has(p.properties[F.進程] ?? ""));
    const totalWasted = wastedPages.reduce((s, p) =>
      s + (p.properties[F.押標金] ?? 0) + (p.properties[F.領標費] ?? 0), 0);
    insights.push({
      icon: "\uD83D\uDCB8", severity: 72,
      type: "warn",
      text: `全公司共 ${teamBreakdown.withdrawn} 件未參與/逾期，`
        + `總沉沒成本 $${totalWasted.toLocaleString("zh-TW")}。`
        + `建議加強投標前的可行性評估。`,
    });
  }

  insights.sort((a, b) => b.severity - a.severity);
  return insights;
}
