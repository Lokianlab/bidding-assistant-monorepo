import { describe, it, expect } from "vitest";
import {
  toYearMonth,
  computeMonthlyMetrics,
  computeRollingMetrics,
  comparePeriods,
  compareQuarters,
  getRecentMonths,
} from "../trend";
import type { MonthlyMetrics } from "../trend";
import type { NotionPage } from "../../types";
import { F } from "../../types";

// ── 測試資料工廠 ──────────────────────────────────────────

function makePage(overrides: {
  deadline: string;
  status?: string;
  budget?: number;
  bidCost?: number;
  fee?: number;
}): NotionPage {
  return {
    id: Math.random().toString(36).slice(2),
    url: "",
    properties: {
      [F.截標]: overrides.deadline,
      [F.進程]: overrides.status ?? "準備中",
      [F.預算]: overrides.budget ?? 1_000_000,
      [F.押標金]: overrides.bidCost ?? 10_000,
      [F.領標費]: overrides.fee ?? 500,
    },
  };
}

// ── toYearMonth ───────────────────────────────────────────

describe("toYearMonth", () => {
  it("正確轉換時間戳為 YYYY-MM", () => {
    const ts = new Date("2025-03-15").getTime();
    expect(toYearMonth(ts)).toBe("2025-03");
  });

  it("月份補零", () => {
    const ts = new Date("2025-01-01").getTime();
    expect(toYearMonth(ts)).toBe("2025-01");
  });

  it("年底十二月", () => {
    const ts = new Date("2025-12-31").getTime();
    expect(toYearMonth(ts)).toBe("2025-12");
  });
});

// ── computeMonthlyMetrics ─────────────────────────────────

describe("computeMonthlyMetrics", () => {
  it("空資料回傳空陣列", () => {
    expect(computeMonthlyMetrics([])).toEqual([]);
  });

  it("按月分組並計算基本指標", () => {
    const pages = [
      makePage({ deadline: "2025-03-10", status: "得標", budget: 5_000_000 }),
      makePage({ deadline: "2025-03-20", status: "未獲青睞" }),
      makePage({ deadline: "2025-04-05", status: "得標", budget: 3_000_000 }),
    ];

    const result = computeMonthlyMetrics(pages);
    expect(result).toHaveLength(2);

    // 三月：1 得標 + 1 未得標
    expect(result[0].month).toBe("2025-03");
    expect(result[0].total).toBe(2);
    expect(result[0].won).toBe(1);
    expect(result[0].lost).toBe(1);
    expect(result[0].concluded).toBe(2);
    expect(result[0].winRate).toBe(50);
    expect(result[0].wonBudget).toBe(5_000_000);

    // 四月：1 得標
    expect(result[1].month).toBe("2025-04");
    expect(result[1].total).toBe(1);
    expect(result[1].won).toBe(1);
    expect(result[1].winRate).toBe(100);
  });

  it("結果按月份排序（時間序）", () => {
    const pages = [
      makePage({ deadline: "2025-06-01" }),
      makePage({ deadline: "2025-01-01" }),
      makePage({ deadline: "2025-03-01" }),
    ];
    const months = computeMonthlyMetrics(pages).map((m) => m.month);
    expect(months).toEqual(["2025-01", "2025-03", "2025-06"]);
  });

  it("沒有截標時間的案件被忽略", () => {
    const pages: NotionPage[] = [
      { id: "1", url: "", properties: { [F.進程]: "準備中" } },
      makePage({ deadline: "2025-05-01", status: "得標" }),
    ];
    const result = computeMonthlyMetrics(pages);
    expect(result).toHaveLength(1);
    expect(result[0].month).toBe("2025-05");
  });

  it("流標/廢標計入 concluded", () => {
    const pages = [
      makePage({ deadline: "2025-01-15", status: "流標/廢標" }),
      makePage({ deadline: "2025-01-20", status: "得標", budget: 2_000_000 }),
    ];
    const result = computeMonthlyMetrics(pages);
    expect(result[0].concluded).toBe(2);
    expect(result[0].cancelled).toBe(1);
    expect(result[0].winRate).toBe(50);
  });

  it("全部進行中時 winRate 為 0", () => {
    const pages = [
      makePage({ deadline: "2025-02-01", status: "準備中" }),
      makePage({ deadline: "2025-02-15", status: "送出投標" }),
    ];
    const result = computeMonthlyMetrics(pages);
    expect(result[0].concluded).toBe(0);
    expect(result[0].winRate).toBe(0);
  });

  it("正確累計成本欄位", () => {
    const pages = [
      makePage({ deadline: "2025-07-01", status: "得標", bidCost: 50_000, fee: 2_000 }),
      makePage({ deadline: "2025-07-15", status: "未獲青睞", bidCost: 30_000, fee: 1_500 }),
    ];
    const result = computeMonthlyMetrics(pages);
    expect(result[0].costBid).toBe(80_000);
    expect(result[0].costFee).toBe(3_500);
  });
});

// ── computeRollingMetrics ─────────────────────────────────

describe("computeRollingMetrics", () => {
  const monthly: MonthlyMetrics[] = [
    { month: "2025-01", total: 5, won: 2, lost: 2, cancelled: 0, concluded: 4, winRate: 50, wonBudget: 0, costBid: 0, costFee: 0 },
    { month: "2025-02", total: 3, won: 1, lost: 1, cancelled: 1, concluded: 3, winRate: 33, wonBudget: 0, costBid: 0, costFee: 0 },
    { month: "2025-03", total: 4, won: 3, lost: 0, cancelled: 0, concluded: 3, winRate: 100, wonBudget: 0, costBid: 0, costFee: 0 },
    { month: "2025-04", total: 2, won: 0, lost: 2, cancelled: 0, concluded: 2, winRate: 0, wonBudget: 0, costBid: 0, costFee: 0 },
  ];

  it("前 N-1 個月 rollingWinRate 為 null", () => {
    const result = computeRollingMetrics(monthly, 3);
    expect(result[0].rollingWinRate).toBeNull();
    expect(result[1].rollingWinRate).toBeNull();
  });

  it("第 N 個月開始有滾動勝率", () => {
    const result = computeRollingMetrics(monthly, 3);
    // 一月~三月：won=2+1+3=6, concluded=4+3+3=10 → 60%
    expect(result[2].rollingWinRate).toBe(60);
  });

  it("視窗正確滾動", () => {
    const result = computeRollingMetrics(monthly, 3);
    // 二月~四月：won=1+3+0=4, concluded=3+3+2=8 → 50%
    expect(result[3].rollingWinRate).toBe(50);
  });

  it("windowSize=1 等於每月自己的勝率", () => {
    const result = computeRollingMetrics(monthly, 1);
    expect(result[0].rollingWinRate).toBe(50);
    expect(result[2].rollingWinRate).toBe(100);
    expect(result[3].rollingWinRate).toBe(0);
  });

  it("空陣列回傳空陣列", () => {
    expect(computeRollingMetrics([], 3)).toEqual([]);
  });

  it("全部 concluded=0 時 rollingWinRate 為 null", () => {
    const allActive: MonthlyMetrics[] = [
      { month: "2025-01", total: 2, won: 0, lost: 0, cancelled: 0, concluded: 0, winRate: 0, wonBudget: 0, costBid: 0, costFee: 0 },
      { month: "2025-02", total: 3, won: 0, lost: 0, cancelled: 0, concluded: 0, winRate: 0, wonBudget: 0, costBid: 0, costFee: 0 },
      { month: "2025-03", total: 1, won: 0, lost: 0, cancelled: 0, concluded: 0, winRate: 0, wonBudget: 0, costBid: 0, costFee: 0 },
    ];
    const result = computeRollingMetrics(allActive, 3);
    expect(result[2].rollingWinRate).toBeNull();
  });
});

// ── comparePeriods ────────────────────────────────────────

describe("comparePeriods", () => {
  it("正確計算差異", () => {
    const current: MonthlyMetrics[] = [
      { month: "2025-04", total: 5, won: 3, lost: 1, cancelled: 0, concluded: 4, winRate: 75, wonBudget: 10_000_000, costBid: 0, costFee: 0 },
    ];
    const previous: MonthlyMetrics[] = [
      { month: "2025-03", total: 4, won: 1, lost: 2, cancelled: 0, concluded: 3, winRate: 33, wonBudget: 3_000_000, costBid: 0, costFee: 0 },
    ];
    const result = comparePeriods(current, previous, "4月", "3月");
    expect(result.totalDelta).toBe(1);
    expect(result.winRateDelta).toBe(42); // 75 - 33
    expect(result.wonBudgetDelta).toBe(7_000_000);
    expect(result.currentLabel).toBe("4月");
    expect(result.previousLabel).toBe("3月");
  });

  it("前期無資料時 previous 全為 0", () => {
    const current: MonthlyMetrics[] = [
      { month: "2025-01", total: 3, won: 2, lost: 1, cancelled: 0, concluded: 3, winRate: 67, wonBudget: 5_000_000, costBid: 0, costFee: 0 },
    ];
    const result = comparePeriods(current, [], "Q1", "Q4");
    expect(result.previous.total).toBe(0);
    expect(result.totalDelta).toBe(3);
    expect(result.winRateDelta).toBe(67);
  });

  it("多月合併正確", () => {
    const current: MonthlyMetrics[] = [
      { month: "2025-04", total: 2, won: 1, lost: 1, cancelled: 0, concluded: 2, winRate: 50, wonBudget: 2_000_000, costBid: 0, costFee: 0 },
      { month: "2025-05", total: 3, won: 2, lost: 0, cancelled: 0, concluded: 2, winRate: 100, wonBudget: 4_000_000, costBid: 0, costFee: 0 },
    ];
    const result = comparePeriods(current, [], "當期", "前期");
    expect(result.current.total).toBe(5);
    expect(result.current.won).toBe(3);
    expect(result.current.concluded).toBe(4);
    expect(result.current.winRate).toBe(75); // 3/4
    expect(result.current.wonBudget).toBe(6_000_000);
  });
});

// ── getRecentMonths ───────────────────────────────────────

describe("getRecentMonths", () => {
  it("回傳正確數量的月份", () => {
    const result = getRecentMonths(new Date("2025-06-15"), 3);
    expect(result).toHaveLength(3);
  });

  it("包含當月和前幾個月", () => {
    const result = getRecentMonths(new Date("2025-06-15"), 3);
    expect(result).toEqual(["2025-04", "2025-05", "2025-06"]);
  });

  it("跨年正確處理", () => {
    const result = getRecentMonths(new Date("2025-02-10"), 4);
    expect(result).toEqual(["2024-11", "2024-12", "2025-01", "2025-02"]);
  });

  it("count=1 只回傳當月", () => {
    const result = getRecentMonths(new Date("2025-09-01"), 1);
    expect(result).toEqual(["2025-09"]);
  });
});

// ── compareQuarters ───────────────────────────────────────

describe("compareQuarters", () => {
  it("有資料時回傳比較結果", () => {
    const monthly: MonthlyMetrics[] = [
      { month: "2025-01", total: 3, won: 1, lost: 1, cancelled: 0, concluded: 2, winRate: 50, wonBudget: 2_000_000, costBid: 0, costFee: 0 },
      { month: "2025-02", total: 2, won: 1, lost: 1, cancelled: 0, concluded: 2, winRate: 50, wonBudget: 1_000_000, costBid: 0, costFee: 0 },
      { month: "2025-03", total: 4, won: 2, lost: 1, cancelled: 0, concluded: 3, winRate: 67, wonBudget: 3_000_000, costBid: 0, costFee: 0 },
      { month: "2025-04", total: 5, won: 3, lost: 1, cancelled: 0, concluded: 4, winRate: 75, wonBudget: 5_000_000, costBid: 0, costFee: 0 },
      { month: "2025-05", total: 3, won: 2, lost: 0, cancelled: 0, concluded: 2, winRate: 100, wonBudget: 4_000_000, costBid: 0, costFee: 0 },
    ];

    // 參考日期 2025-05-15 → Q2（4-6月），比較 Q1（1-3月）
    const result = compareQuarters(monthly, new Date("2025-05-15"));
    expect(result).not.toBeNull();
    expect(result!.currentLabel).toBe("2025 Q2");
    expect(result!.previousLabel).toBe("2025 Q1");
    // Q2 有 4月+5月 = total 8, won 5
    expect(result!.current.total).toBe(8);
    expect(result!.current.won).toBe(5);
    // Q1 有 1-3月 = total 9, won 4
    expect(result!.previous.total).toBe(9);
    expect(result!.previous.won).toBe(4);
  });

  it("完全沒資料回傳 null", () => {
    const result = compareQuarters([], new Date("2025-06-01"));
    expect(result).toBeNull();
  });

  it("只有當季資料也能比較（前季為 0）", () => {
    const monthly: MonthlyMetrics[] = [
      { month: "2025-04", total: 3, won: 2, lost: 1, cancelled: 0, concluded: 3, winRate: 67, wonBudget: 4_000_000, costBid: 0, costFee: 0 },
    ];
    const result = compareQuarters(monthly, new Date("2025-04-15"));
    expect(result).not.toBeNull();
    expect(result!.previous.total).toBe(0);
    expect(result!.current.total).toBe(3);
  });
});
