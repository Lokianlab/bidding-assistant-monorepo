import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useDashboardMetrics } from "../useDashboardMetrics";
import type { NotionPage } from "../types";
import { F } from "../types";

// ====== Helper ======

let idCounter = 0;

function makePage(props: Record<string, unknown>): NotionPage {
  idCounter++;
  return {
    id: `page-${idCounter}`,
    url: `https://notion.so/page-${idCounter}`,
    properties: props,
  };
}

const PRIORITY_MAP: Record<string, string> = {
  "最優先": "first",
  "次要": "second",
  "觀望": "third",
};

function render(
  pages: NotionPage[],
  historicalPages?: NotionPage[],
  priorityMap = PRIORITY_MAP,
) {
  const { result } = renderHook(() =>
    useDashboardMetrics(pages, priorityMap, historicalPages),
  );
  return result.current;
}

// ====== Setup ======

beforeEach(() => {
  idCounter = 0;
  // Fix time to 2026-02-15 (Sunday) for deterministic tests
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 1, 15, 10, 0, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

// ====== 空輸入 ======

describe("useDashboardMetrics", () => {
  describe("empty input", () => {
    it("returns zeros and empty arrays when pages is empty", () => {
      const m = render([]);

      expect(m.activeProjects).toHaveLength(0);
      expect(m.biddingProjects).toHaveLength(0);
      expect(m.presentedProjects).toHaveLength(0);
      expect(m.wonProjects).toHaveLength(0);
      expect(m.submittedProjects).toHaveLength(0);
      expect(m.totalBudget).toBe(0);
      expect(m.biddingBudget).toBe(0);
      expect(m.wonBudget).toBe(0);
      expect(m.winRate).toBe(0);
      expect(m.totalCost.total).toBe(0);
      expect(m.teamWorkload).toHaveLength(0);
      expect(m.teamAvgLoad).toBe(0);
      expect(m.teamCount).toBe(0);
      expect(m.statusDistribution).toHaveLength(0);
      expect(m.budgetByStatus).toHaveLength(0);
      expect(m.decisionDistribution).toHaveLength(0);
      expect(m.monthlyTrend).toHaveLength(0);
      expect(m.typeAnalysis).toHaveLength(0);
    });
  });

  // ====== 基礎分組 ======

  describe("project grouping", () => {
    it("filters active projects (著手領/備標, 已投標, 競標階段, 已出席簡報, 得標)", () => {
      const pages = [
        makePage({ [F.進程]: "著手領/備標" }),
        makePage({ [F.進程]: "已投標" }),
        makePage({ [F.進程]: "競標階段" }),
        makePage({ [F.進程]: "已出席簡報" }),
        makePage({ [F.進程]: "得標" }),
        makePage({ [F.進程]: "等標期間" }),      // not active
        makePage({ [F.進程]: "不參與" }),         // not active
      ];
      const m = render(pages);
      expect(m.activeProjects).toHaveLength(5);
    });

    it("filters bidding projects (競標階段 only)", () => {
      const pages = [
        makePage({ [F.進程]: "競標階段" }),
        makePage({ [F.進程]: "競標階段" }),
        makePage({ [F.進程]: "已投標" }),
      ];
      const m = render(pages);
      expect(m.biddingProjects).toHaveLength(2);
    });

    it("filters presented projects (已出席簡報 only)", () => {
      const pages = [
        makePage({ [F.進程]: "已出席簡報" }),
        makePage({ [F.進程]: "競標階段" }),
      ];
      const m = render(pages);
      expect(m.presentedProjects).toHaveLength(1);
    });

    it("filters won projects (得標 only)", () => {
      const pages = [
        makePage({ [F.進程]: "得標" }),
        makePage({ [F.進程]: "得標" }),
        makePage({ [F.進程]: "已出席簡報" }),
      ];
      const m = render(pages);
      expect(m.wonProjects).toHaveLength(2);
    });

    it("filters submitted projects (SUBMITTED_STATUSES)", () => {
      const pages = [
        makePage({ [F.進程]: "已投標" }),
        makePage({ [F.進程]: "競標階段" }),
        makePage({ [F.進程]: "已出席簡報" }),
        makePage({ [F.進程]: "得標" }),
        makePage({ [F.進程]: "未獲青睞" }),
        makePage({ [F.進程]: "流標/廢標" }),
        makePage({ [F.進程]: "資格不符" }),
        makePage({ [F.進程]: "領標後未參與" }),
        makePage({ [F.進程]: "等標期間" }),      // not submitted
        makePage({ [F.進程]: "不參與" }),         // not submitted
      ];
      const m = render(pages);
      expect(m.submittedProjects).toHaveLength(8);
    });
  });

  // ====== KPI 計算 ======

  describe("KPI calculations", () => {
    it("calculates totalBudget as sum of all pages", () => {
      const pages = [
        makePage({ [F.預算]: 1000000 }),
        makePage({ [F.預算]: 2000000 }),
        makePage({ [F.預算]: 500000 }),
      ];
      const m = render(pages);
      expect(m.totalBudget).toBe(3500000);
    });

    it("treats missing budget as 0", () => {
      const pages = [
        makePage({ [F.預算]: 1000000 }),
        makePage({}),  // no budget
      ];
      const m = render(pages);
      expect(m.totalBudget).toBe(1000000);
    });

    it("calculates biddingBudget from 競標階段 + 已出席簡報", () => {
      const pages = [
        makePage({ [F.進程]: "競標階段", [F.預算]: 500000 }),
        makePage({ [F.進程]: "已出席簡報", [F.預算]: 300000 }),
        makePage({ [F.進程]: "得標", [F.預算]: 1000000 }),       // not included
        makePage({ [F.進程]: "已投標", [F.預算]: 200000 }),       // not included
      ];
      const m = render(pages);
      expect(m.biddingBudget).toBe(800000);
    });

    it("calculates wonBudget from 得標 projects", () => {
      const pages = [
        makePage({ [F.進程]: "得標", [F.預算]: 1000000 }),
        makePage({ [F.進程]: "得標", [F.預算]: 500000 }),
        makePage({ [F.進程]: "已投標", [F.預算]: 300000 }),
      ];
      const m = render(pages);
      expect(m.wonBudget).toBe(1500000);
    });

    it("calculates winRate as percentage of won/submitted", () => {
      const pages = [
        makePage({ [F.進程]: "得標" }),
        makePage({ [F.進程]: "已投標" }),
        makePage({ [F.進程]: "未獲青睞" }),
        makePage({ [F.進程]: "競標階段" }),
      ];
      const m = render(pages);
      // 1 won / 4 submitted = 25%
      expect(m.winRate).toBe(25);
    });

    it("returns 0 winRate when no submitted projects", () => {
      const pages = [
        makePage({ [F.進程]: "等標期間" }),
      ];
      const m = render(pages);
      expect(m.winRate).toBe(0);
    });
  });

  // ====== 成本計算 ======

  describe("cost calculations", () => {
    it("computes totalCost from procured pages (押標金 + 領標費)", () => {
      const pages = [
        makePage({ [F.進程]: "已投標", [F.押標金]: 50000, [F.領標費]: 1000 }),
        makePage({ [F.進程]: "得標", [F.押標金]: 100000, [F.領標費]: 2000 }),
        makePage({ [F.進程]: "等標期間", [F.押標金]: 30000, [F.領標費]: 500 }),  // not procured
      ];
      const m = render(pages);
      expect(m.totalCost.bidDeposit).toBe(150000);
      expect(m.totalCost.procurementFee).toBe(3000);
      expect(m.totalCost.total).toBe(153000);
    });

    it("computes cost by period correctly", () => {
      // System time is 2026-02-15
      const pages = [
        // This week (2026-02-09 Monday to 2026-02-15 Sunday)
        makePage({ [F.進程]: "已投標", [F.截標]: "2026-02-12", [F.押標金]: 10000, [F.領標費]: 100 }),
        // This month but not this week
        makePage({ [F.進程]: "已投標", [F.截標]: "2026-02-03", [F.押標金]: 20000, [F.領標費]: 200 }),
        // This year but not this month
        makePage({ [F.進程]: "已投標", [F.截標]: "2026-01-15", [F.押標金]: 30000, [F.領標費]: 300 }),
        // Last year
        makePage({ [F.進程]: "已投標", [F.截標]: "2025-06-01", [F.押標金]: 40000, [F.領標費]: 400 }),
      ];
      const m = render(pages);

      // week: only the Feb 12 page
      expect(m.totalCostByPeriod.week.bidDeposit).toBe(10000);
      // month: Feb 12 + Feb 3
      expect(m.totalCostByPeriod.month.bidDeposit).toBe(30000);
      // year: Feb 12 + Feb 3 + Jan 15
      expect(m.totalCostByPeriod.year.bidDeposit).toBe(60000);
      // all: everything
      expect(m.totalCostByPeriod.all.bidDeposit).toBe(100000);
    });
  });

  // ====== 團隊工作量 ======

  describe("team workload", () => {
    it("counts team members from active projects", () => {
      const pages = [
        makePage({ [F.進程]: "競標階段", [F.企劃主筆]: ["Alice", "Bob"] }),
        makePage({ [F.進程]: "已投標", [F.企劃主筆]: ["Alice"] }),
        makePage({ [F.進程]: "得標", [F.企劃主筆]: ["Charlie"] }),
      ];
      const m = render(pages);

      expect(m.teamCount).toBe(3);
      expect(m.teamWorkload).toHaveLength(3);
      // sorted by count desc
      expect(m.teamWorkload[0]).toEqual({ name: "Alice", count: 2 });
      expect(m.teamWorkload[1].count).toBe(1);
    });

    it("calculates average load correctly", () => {
      const pages = [
        makePage({ [F.進程]: "競標階段", [F.企劃主筆]: ["Alice"] }),
        makePage({ [F.進程]: "已投標", [F.企劃主筆]: ["Alice"] }),
        makePage({ [F.進程]: "得標", [F.企劃主筆]: ["Bob"] }),
      ];
      const m = render(pages);
      // 3 active projects / 2 team members = 1.5
      expect(m.teamAvgLoad).toBe(1.5);
    });

    it("handles pages with no writers", () => {
      const pages = [
        makePage({ [F.進程]: "競標階段" }),  // no 企劃主筆
        makePage({ [F.進程]: "已投標", [F.企劃主筆]: [] }),
      ];
      const m = render(pages);
      expect(m.teamCount).toBe(0);
      expect(m.teamWorkload).toHaveLength(0);
      // teamAvgLoad divides by max(teamCount, 1) = 1
      expect(m.teamAvgLoad).toBe(2);  // 2 active / 1
    });

    it("ignores non-active projects for workload", () => {
      const pages = [
        makePage({ [F.進程]: "競標階段", [F.企劃主筆]: ["Alice"] }),
        makePage({ [F.進程]: "等標期間", [F.企劃主筆]: ["Bob"] }),     // not active
        makePage({ [F.進程]: "不參與", [F.企劃主筆]: ["Charlie"] }),    // not active
      ];
      const m = render(pages);
      // Only Alice from 競標階段
      expect(m.teamCount).toBe(1);
      expect(m.teamWorkload).toHaveLength(1);
      expect(m.teamWorkload[0].name).toBe("Alice");
    });
  });

  // ====== 優先序分組 ======

  describe("priority grouping (byPriority)", () => {
    it("groups pages by decision using priorityMap", () => {
      const pages = [
        makePage({ [F.決策]: "最優先" }),
        makePage({ [F.決策]: "最優先" }),
        makePage({ [F.決策]: "次要" }),
        makePage({ [F.決策]: "觀望" }),
        makePage({ [F.決策]: "其他決策" }),    // not in map → other
        makePage({}),                          // no decision → other
      ];
      const m = render(pages);

      expect(m.byPriority.first).toHaveLength(2);
      expect(m.byPriority.second).toHaveLength(1);
      expect(m.byPriority.third).toHaveLength(1);
      expect(m.byPriority.other).toHaveLength(2);
    });

    it("excludes bidding and presented projects from priority grouping", () => {
      const pages = [
        makePage({ [F.進程]: "競標階段", [F.決策]: "最優先" }),    // excluded (bidding)
        makePage({ [F.進程]: "已出席簡報", [F.決策]: "最優先" }), // excluded (presented)
        makePage({ [F.進程]: "等標期間", [F.決策]: "最優先" }),    // included
      ];
      const m = render(pages);
      expect(m.byPriority.first).toHaveLength(1);
    });
  });

  // ====== 圖表資料 ======

  describe("chart data", () => {
    it("computes statusDistribution sorted by count desc", () => {
      const pages = [
        makePage({ [F.進程]: "已投標" }),
        makePage({ [F.進程]: "已投標" }),
        makePage({ [F.進程]: "已投標" }),
        makePage({ [F.進程]: "得標" }),
        makePage({ [F.進程]: "得標" }),
        makePage({ [F.進程]: "等標期間" }),
      ];
      const m = render(pages);

      expect(m.statusDistribution).toHaveLength(3);
      expect(m.statusDistribution[0]).toEqual({ name: "已投標", value: 3 });
      expect(m.statusDistribution[1]).toEqual({ name: "得標", value: 2 });
      expect(m.statusDistribution[2]).toEqual({ name: "等標期間", value: 1 });
    });

    it("handles missing status as 未知", () => {
      const pages = [makePage({})];
      const m = render(pages);
      expect(m.statusDistribution[0].name).toBe("未知");
    });

    it("computes budgetByStatus, excluding zero-budget statuses", () => {
      const pages = [
        makePage({ [F.進程]: "得標", [F.預算]: 1000000 }),
        makePage({ [F.進程]: "得標", [F.預算]: 500000 }),
        makePage({ [F.進程]: "已投標", [F.預算]: 300000 }),
        makePage({ [F.進程]: "等標期間" }),  // zero budget → excluded
      ];
      const m = render(pages);

      expect(m.budgetByStatus).toHaveLength(2);
      expect(m.budgetByStatus[0]).toEqual({ name: "得標", budget: 1500000 });
      expect(m.budgetByStatus[1]).toEqual({ name: "已投標", budget: 300000 });
    });

    it("computes decisionDistribution", () => {
      const pages = [
        makePage({ [F.決策]: "最優先" }),
        makePage({ [F.決策]: "最優先" }),
        makePage({ [F.決策]: "觀望" }),
        makePage({}),  // no decision → 未分類
      ];
      const m = render(pages);

      expect(m.decisionDistribution).toHaveLength(3);
      expect(m.decisionDistribution[0]).toEqual({ name: "最優先", value: 2 });
    });

    it("computes monthlyTrend with correct structure", () => {
      const pages = [
        makePage({ [F.截標]: "2026-01-15", [F.進程]: "已投標" }),
        makePage({ [F.截標]: "2026-01-20", [F.進程]: "得標" }),
        makePage({ [F.截標]: "2026-02-10", [F.進程]: "已投標" }),
      ];
      const m = render(pages);

      expect(m.monthlyTrend).toHaveLength(2);
      expect(m.monthlyTrend[0]).toEqual({
        month: "01月",
        fullKey: "2026-01",
        投標件數: 2,
        得標件數: 1,
      });
      expect(m.monthlyTrend[1]).toEqual({
        month: "02月",
        fullKey: "2026-02",
        投標件數: 1,
        得標件數: 0,
      });
    });

    it("limits monthlyTrend to last 12 months", () => {
      const pages: NotionPage[] = [];
      // Create pages spanning 15 months
      for (let i = 0; i < 15; i++) {
        const year = 2025 + Math.floor(i / 12);
        const month = (i % 12) + 1;
        pages.push(makePage({
          [F.截標]: `${year}-${String(month).padStart(2, "0")}-15`,
          [F.進程]: "已投標",
        }));
      }
      const m = render(pages);
      expect(m.monthlyTrend.length).toBeLessThanOrEqual(12);
    });

    it("skips pages without deadline in monthlyTrend", () => {
      const pages = [
        makePage({ [F.進程]: "已投標" }),  // no 截標
      ];
      const m = render(pages);
      expect(m.monthlyTrend).toHaveLength(0);
    });

    it("computes typeAnalysis from 標案類型 array", () => {
      const pages = [
        makePage({ [F.標案類型]: ["展覽策展", "活動企劃"], [F.預算]: 1000000 }),
        makePage({ [F.標案類型]: ["展覽策展"], [F.預算]: 500000 }),
        makePage({ [F.標案類型]: ["教育訓練"], [F.預算]: 300000 }),
      ];
      const m = render(pages);

      expect(m.typeAnalysis).toHaveLength(3);
      // sorted by count desc
      expect(m.typeAnalysis[0]).toEqual({ name: "展覽策展", 件數: 2, 預算: 1500000 });
      expect(m.typeAnalysis[1].name).toBe("活動企劃");
      expect(m.typeAnalysis[1].件數).toBe(1);
      expect(m.typeAnalysis[1].預算).toBe(1000000);
    });

    it("handles pages without 標案類型 in typeAnalysis", () => {
      const pages = [
        makePage({ [F.預算]: 100000 }),  // no 標案類型
      ];
      const m = render(pages);
      expect(m.typeAnalysis).toHaveLength(0);
    });
  });

  // ====== 歷史案件合併 ======

  describe("historical pages merging", () => {
    it("merges historical pages for winRate calculation", () => {
      const current = [
        makePage({ [F.進程]: "得標" }),      // 1 won in current
        makePage({ [F.進程]: "已投標" }),     // 1 submitted
      ];
      const historical = [
        makePage({ [F.進程]: "得標" }),        // 1 more won
        makePage({ [F.進程]: "未獲青睞" }),    // 1 more submitted
        makePage({ [F.進程]: "未獲青睞" }),    // 1 more submitted
      ];
      const m = render(current, historical);

      // Total submitted: 2 current + 3 historical = 5
      // Total won: 1 current + 1 historical = 2
      // winRate = 2/5 = 40%
      expect(m.winRate).toBe(40);
    });

    it("deduplicates by id when merging historical pages", () => {
      const shared = makePage({ [F.進程]: "得標" });
      const current = [shared];
      // Same page appears in historical
      const historical = [
        { ...shared },  // duplicate
        makePage({ [F.進程]: "已投標" }),
      ];
      const m = render(current, historical);

      // submitted: shared (得標) + new historical (已投標) = 2
      // won: shared (得標) = 1
      // winRate = 1/2 = 50%
      expect(m.winRate).toBe(50);
    });

    it("uses only current pages for wonBudget without historical", () => {
      const current = [
        makePage({ [F.進程]: "得標", [F.預算]: 500000 }),
      ];
      const m = render(current);
      expect(m.wonBudget).toBe(500000);
    });

    it("includes historical won pages in wonBudget", () => {
      const current = [
        makePage({ [F.進程]: "得標", [F.預算]: 500000 }),
      ];
      const historical = [
        makePage({ [F.進程]: "得標", [F.預算]: 300000 }),
      ];
      const m = render(current, historical);
      expect(m.wonBudget).toBe(800000);
    });
  });

  // ====== 時間相關指標 ======

  describe("time-based counts", () => {
    it("counts this month submitted projects", () => {
      // System time: 2026-02-15
      const pages = [
        makePage({ [F.進程]: "已投標", [F.截標]: "2026-02-10" }),  // this month
        makePage({ [F.進程]: "已投標", [F.截標]: "2026-02-20" }),  // this month
        makePage({ [F.進程]: "已投標", [F.截標]: "2026-01-15" }),  // last month
      ];
      const m = render(pages);
      expect(m.monthSubmittedCount).toBe(2);
    });

    it("counts this week submitted projects", () => {
      // System time: 2026-02-15 (Sunday)
      // Week: Mon 2026-02-09 to Sun 2026-02-15
      const pages = [
        makePage({ [F.進程]: "已投標", [F.截標]: "2026-02-10" }),  // this week (Tue)
        makePage({ [F.進程]: "已投標", [F.截標]: "2026-02-14" }),  // this week (Sat)
        makePage({ [F.進程]: "已投標", [F.截標]: "2026-02-08" }),  // last week (Sun)
      ];
      const m = render(pages);
      expect(m.weekSubmittedCount).toBe(2);
    });

    it("counts year submitted and won correctly", () => {
      // System time: 2026-02-15
      const pages = [
        makePage({ [F.進程]: "得標", [F.截標]: "2026-01-15" }),    // this year, won
        makePage({ [F.進程]: "已投標", [F.截標]: "2026-02-10" }),  // this year, not won
        makePage({ [F.進程]: "已投標", [F.截標]: "2025-12-01" }),  // last year
      ];
      const m = render(pages);
      expect(m.yearSubmittedCount).toBe(2);
      expect(m.yearWonCount).toBe(1);
    });

    it("includes historical pages in time-based counts", () => {
      // System time: 2026-02-15
      const current = [
        makePage({ [F.進程]: "已投標", [F.截標]: "2026-02-10" }),
      ];
      const historical = [
        makePage({ [F.進程]: "得標", [F.截標]: "2026-01-20" }),
      ];
      const m = render(current, historical);
      expect(m.yearSubmittedCount).toBe(2);
      expect(m.yearWonCount).toBe(1);
    });

    it("handles pages without deadline date", () => {
      const pages = [
        makePage({ [F.進程]: "已投標" }),  // no 截標
      ];
      const m = render(pages);
      expect(m.monthSubmittedCount).toBe(0);
      expect(m.weekSubmittedCount).toBe(0);
      expect(m.yearSubmittedCount).toBe(0);
    });
  });

  // ====== 邊界情況 ======

  describe("edge cases", () => {
    it("handles undefined properties gracefully", () => {
      const pages = [makePage({})];
      const m = render(pages);
      // Should not throw, just return sensible defaults
      expect(m.totalBudget).toBe(0);
      expect(m.totalCost.total).toBe(0);
    });

    it("handles non-array 企劃主筆 gracefully", () => {
      const pages = [
        makePage({ [F.進程]: "競標階段", [F.企劃主筆]: "not-an-array" }),
      ];
      const m = render(pages);
      // Should not throw
      expect(m.teamCount).toBe(0);
    });

    it("handles empty string writer names", () => {
      const pages = [
        makePage({ [F.進程]: "競標階段", [F.企劃主筆]: ["", "Alice", ""] }),
      ];
      const m = render(pages);
      // Empty strings should be filtered out
      expect(m.teamCount).toBe(1);
      expect(m.teamWorkload[0].name).toBe("Alice");
    });

    it("handles non-array 標案類型 gracefully", () => {
      const pages = [
        makePage({ [F.標案類型]: "not-an-array", [F.預算]: 100000 }),
      ];
      const m = render(pages);
      expect(m.typeAnalysis).toHaveLength(0);
    });

    it("handles date as object with start field", () => {
      const pages = [
        makePage({
          [F.進程]: "已投標",
          [F.截標]: { start: "2026-02-10" },
          [F.押標金]: 10000,
        }),
      ];
      const m = render(pages);
      expect(m.monthSubmittedCount).toBe(1);
      expect(m.totalCostByPeriod.month.bidDeposit).toBe(10000);
    });
  });
});
