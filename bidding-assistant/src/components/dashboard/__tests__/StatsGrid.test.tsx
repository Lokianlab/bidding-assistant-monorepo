import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { StatsGrid } from "../StatsGrid";
import type { CostBreakdown } from "@/lib/dashboard/useDashboardMetrics";

// ── Helper ──────────────────────────────────────────────────

function makeCostBreakdown(overrides?: Partial<CostBreakdown>): CostBreakdown {
  return { bidDeposit: 0, procurementFee: 0, total: 0, ...overrides };
}

const emptyCostByPeriod = {
  all: makeCostBreakdown(),
  year: makeCostBreakdown(),
  month: makeCostBreakdown(),
  week: makeCostBreakdown(),
};

function makeProps(overrides?: Record<string, unknown>) {
  return {
    projectCount: 20,
    totalBudget: 5000000,
    biddingBudget: 1000000,
    biddingCount: 3,
    wonBudget: 2000000,
    wonCount: 4,
    winRate: 40,
    submittedCount: 10,
    totalCost: makeCostBreakdown({ total: 50000 }),
    totalCostByPeriod: emptyCostByPeriod,
    yearlyGoal: 5,
    goalRate: 80,
    onGoalEdit: vi.fn(),
    monthSubmitted: 2,
    weekSubmitted: 1,
    monthlyTarget: 4,
    onMonthlyTargetEdit: vi.fn(),
    weeklyTarget: 1,
    onWeeklyTargetEdit: vi.fn(),
    yearSubmitted: 8,
    yearWon: 3,
    showSkeleton: false,
    ...overrides,
  };
}

// ── Skeleton 狀態 ──────────────────────────────────────────

describe("StatsGrid — skeleton 狀態", () => {
  it("showSkeleton=true 時顯示動畫佔位卡片", () => {
    const { container } = render(createElement(StatsGrid, makeProps({ showSkeleton: true })));
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("showSkeleton=true 時不顯示真實數值", () => {
    render(createElement(StatsGrid, makeProps({ showSkeleton: true })));
    expect(screen.queryByText("當前全部標案")).toBeNull();
  });
});

// ── 核心 KPI ───────────────────────────────────────────────

describe("StatsGrid — 核心 KPI", () => {
  it("顯示 projectCount", () => {
    render(createElement(StatsGrid, makeProps({ projectCount: 15 })));
    expect(screen.getByText("15")).toBeTruthy();
    expect(screen.getByText("當前全部標案")).toBeTruthy();
  });

  it("顯示 totalBudget（含 $ 前綴）", () => {
    render(createElement(StatsGrid, makeProps({ totalBudget: 5000000 })));
    expect(screen.getByText(/\$5,000,000/)).toBeTruthy();
    expect(screen.getByText("全部標案預算總額")).toBeTruthy();
  });

  it("顯示 wonBudget 和 wonCount", () => {
    render(createElement(StatsGrid, makeProps({ wonBudget: 2000000, wonCount: 4 })));
    expect(screen.getByText(/\$2,000,000/)).toBeTruthy();
    expect(screen.getByText("得標預算總額")).toBeTruthy();
    expect(screen.getByText("4 件")).toBeTruthy();
  });

  it("得標率卡片顯示「得標率」文字", () => {
    render(createElement(StatsGrid, makeProps({ winRate: 40 })));
    expect(screen.getByText("得標率")).toBeTruthy();
  });

  it("得標率 SVG 顯示百分比", () => {
    const { container } = render(createElement(StatsGrid, makeProps({ winRate: 40 })));
    // CircleProgress SVG contains the percentage text
    expect(container.querySelector("svg")).toBeTruthy();
    expect(screen.getByText("40%")).toBeTruthy();
  });
});

// ── 年度統計 ───────────────────────────────────────────────

describe("StatsGrid — 年度統計", () => {
  it("顯示本年度投標件數", () => {
    render(createElement(StatsGrid, makeProps({ yearSubmitted: 8 })));
    expect(screen.getByText("8")).toBeTruthy();
  });

  it("顯示得標件數子標題", () => {
    render(createElement(StatsGrid, makeProps({ yearWon: 3, yearSubmitted: 8 })));
    expect(screen.getByText(/得標 3 件/)).toBeTruthy();
  });
});

// ── 本月本週 ───────────────────────────────────────────────

describe("StatsGrid — 本月本週統計", () => {
  it("顯示「本月投標」文字", () => {
    render(createElement(StatsGrid, makeProps()));
    expect(screen.getByText(/本月投標/)).toBeTruthy();
  });

  it("顯示「本週投標」文字", () => {
    render(createElement(StatsGrid, makeProps()));
    expect(screen.getByText(/本週投標/)).toBeTruthy();
  });
});
