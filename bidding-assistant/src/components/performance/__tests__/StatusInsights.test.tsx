import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { StatusInsights } from "../StatusInsights";
import type { AnalyticsTotals } from "@/lib/dashboard/useAnalyticsMetrics";

// ── Helper ──────────────────────────────────────────────────

function makeTotals(overrides?: Partial<AnalyticsTotals>): AnalyticsTotals {
  return {
    submitted: 10,
    won: 5,
    winRate: 50,
    wonBudget: 1000000,
    totalCostAmount: 100000,
    ...overrides,
  };
}

function makeBreakdown(items: Record<string, number>) {
  return Object.entries(items).map(([name, value]) => ({ name, value }));
}

// ── 空資料 ─────────────────────────────────────────────────

describe("StatusInsights — 空資料", () => {
  it("breakdown=[] 時不渲染任何內容", () => {
    const { container } = render(
      createElement(StatusInsights, {
        breakdown: [],
        totals: makeTotals(),
        monthCount: 3,
      })
    );
    expect(container.firstChild).toBeNull();
  });
});

// ── 基本統計洞見 ────────────────────────────────────────────

describe("StatusInsights — 基本統計", () => {
  it("顯示「自動分析洞見」標題", () => {
    render(
      createElement(StatusInsights, {
        breakdown: makeBreakdown({ 得標: 3, 未獲青睞: 2 }),
        totals: makeTotals({ winRate: 60, won: 3 }),
        monthCount: 2,
      })
    );
    expect(screen.getByText(/自動分析洞見/)).toBeTruthy();
  });

  it("顯示總件數、得標數、進行中數量的摘要", () => {
    render(
      createElement(StatusInsights, {
        breakdown: makeBreakdown({ 得標: 3, 未獲青睞: 2 }),
        totals: makeTotals({ won: 3 }),
        monthCount: 2,
      })
    );
    expect(screen.getByText(/共 5 件案件/)).toBeTruthy();
    expect(screen.getByText(/得標 3 件/)).toBeTruthy();
  });
});

// ── 得標率洞見 ─────────────────────────────────────────────

describe("StatusInsights — 得標率洞見", () => {
  it("winRate >= 50 顯示優秀訊息（🎯）", () => {
    render(
      createElement(StatusInsights, {
        breakdown: makeBreakdown({ 得標: 5 }),
        totals: makeTotals({ winRate: 50 }),
        monthCount: 2,
      })
    );
    expect(screen.getByText(/得標率 50%，表現優秀/)).toBeTruthy();
  });

  it("winRate 30-49 顯示正常範圍訊息（💡）", () => {
    render(
      createElement(StatusInsights, {
        breakdown: makeBreakdown({ 得標: 3 }),
        totals: makeTotals({ winRate: 40 }),
        monthCount: 2,
      })
    );
    expect(screen.getByText(/屬正常範圍/)).toBeTruthy();
  });

  it("winRate < 30 顯示警告訊息（⚠️）", () => {
    render(
      createElement(StatusInsights, {
        breakdown: makeBreakdown({ 得標: 1 }),
        totals: makeTotals({ winRate: 10 }),
        monthCount: 2,
      })
    );
    expect(screen.getByText(/得標率僅 10%/)).toBeTruthy();
  });
});

// ── 失敗原因洞見 ────────────────────────────────────────────

describe("StatusInsights — 失敗原因洞見", () => {
  it("未獲青睞 >= 30% 時顯示提示（🔍）", () => {
    render(
      createElement(StatusInsights, {
        breakdown: makeBreakdown({ 得標: 1, 未獲青睞: 4 }),
        totals: makeTotals({ winRate: 20 }),
        monthCount: 2,
      })
    );
    expect(screen.getByText(/最大失敗原因/)).toBeTruthy();
  });

  it("資格不符 > 0 時顯示提示（📋）", () => {
    render(
      createElement(StatusInsights, {
        breakdown: makeBreakdown({ 得標: 2, 資格不符: 1 }),
        totals: makeTotals({ winRate: 66 }),
        monthCount: 2,
      })
    );
    expect(screen.getByText(/資格不符/)).toBeTruthy();
  });

  it("流標/廢標 > 0 時顯示提示（📌）", () => {
    render(
      createElement(StatusInsights, {
        breakdown: makeBreakdown({ 得標: 2, "流標/廢標": 2 }),
        totals: makeTotals({ winRate: 50 }),
        monthCount: 2,
      })
    );
    expect(screen.getByText(/流標\/廢標/)).toBeTruthy();
  });
});

// ── 月均投標量洞見 ─────────────────────────────────────────

describe("StatusInsights — 月均投標量", () => {
  it("月均 <= 2 件時顯示偏低警告", () => {
    // 2 件 / 2 個月 = 1 件/月 → 偏低
    render(
      createElement(StatusInsights, {
        breakdown: makeBreakdown({ 得標: 1, 未獲青睞: 1 }),
        totals: makeTotals({ winRate: 50 }),
        monthCount: 2,
      })
    );
    expect(screen.getByText(/月均投標僅/)).toBeTruthy();
  });

  it("月均 3-5 件時顯示尚有提升空間", () => {
    // 10 件 / 3 個月 ≈ 3.3 件/月 → 可提升
    render(
      createElement(StatusInsights, {
        breakdown: makeBreakdown({ 得標: 5, 未獲青睞: 5 }),
        totals: makeTotals({ winRate: 50 }),
        monthCount: 3,
      })
    );
    expect(screen.getByText(/尚有提升空間/)).toBeTruthy();
  });
});

// ── 洞見顏色 ───────────────────────────────────────────────

describe("StatusInsights — 洞見顏色", () => {
  it("info 類型使用 bg-blue-50", () => {
    const { container } = render(
      createElement(StatusInsights, {
        breakdown: makeBreakdown({ 得標: 5, 未獲青睞: 5 }),
        totals: makeTotals({ winRate: 40 }),
        monthCount: 5,
      })
    );
    expect(container.querySelector(".bg-blue-50")).toBeTruthy();
  });

  it("good 類型使用 bg-emerald-50（winRate >= 50）", () => {
    const { container } = render(
      createElement(StatusInsights, {
        breakdown: makeBreakdown({ 得標: 5 }),
        totals: makeTotals({ winRate: 55 }),
        monthCount: 3,
      })
    );
    expect(container.querySelector(".bg-emerald-50")).toBeTruthy();
  });
});
