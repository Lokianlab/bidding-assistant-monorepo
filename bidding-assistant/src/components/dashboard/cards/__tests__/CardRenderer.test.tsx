import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { CardRenderer } from "../CardRenderer";

// ── recharts mock ───────────────────────────────────────────

vi.mock("recharts", () => ({
  BarChart: ({ children }: { children: unknown }) =>
    createElement("div", { "data-testid": "bar-chart" }, children as never),
  LineChart: ({ children }: { children: unknown }) =>
    createElement("div", { "data-testid": "line-chart" }, children as never),
  PieChart: ({ children }: { children: unknown }) =>
    createElement("div", { "data-testid": "pie-chart" }, children as never),
  Bar: () => null,
  Line: () => null,
  Pie: () => null,
  Cell: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  ResponsiveContainer: ({ children }: { children: unknown }) =>
    createElement("div", { "data-testid": "responsive-container" }, children as never),
}));

// ── mock CustomCard ────────────────────────────────────────

vi.mock("../CustomCard", () => ({
  CustomCard: () => createElement("div", { "data-testid": "custom-card" }),
}));

// ── Helper ──────────────────────────────────────────────────

function makeMetrics(overrides?: Record<string, unknown>) {
  return {
    activeProjects: [],
    totalBudget: 0,
    wonBudget: 0,
    wonProjects: [],
    winRate: 0,
    submittedProjects: [],
    biddingBudget: 0,
    biddingProjects: [],
    presentedProjects: [],
    yearSubmittedCount: 0,
    yearWonCount: 0,
    monthSubmittedCount: 0,
    weekSubmittedCount: 0,
    teamWorkload: [],
    monthlyTrend: [],
    rollingWinRate: [],
    quarterComparison: null,
    typeAnalysis: [],
    statusDistribution: [],
    decisionDistribution: [],
    budgetByStatus: [],
    totalCost: { total: 0, bidDeposit: 0, procurementFee: 0 },
    ...overrides,
  };
}

const baseConfig = { title: "" };
const baseSize = "medium" as const;

// ── Stat 卡片 ──────────────────────────────────────────────

describe("CardRenderer — stat 卡片", () => {
  it("stat-projects：顯示 activeProjects.length", () => {
    render(
      createElement(CardRenderer, {
        type: "stat-projects",
        config: baseConfig,
        metrics: makeMetrics({ activeProjects: [{}, {}, {}] }) as never,
        size: baseSize,
      })
    );
    expect(screen.getByText("3")).toBeTruthy();
  });

  it("stat-budget：顯示 totalBudget 含 $", () => {
    render(
      createElement(CardRenderer, {
        type: "stat-budget",
        config: baseConfig,
        metrics: makeMetrics({ totalBudget: 5000000 }) as never,
        size: baseSize,
      })
    );
    expect(screen.getByText(/5,000,000/)).toBeTruthy();
  });

  it("stat-won：顯示 wonBudget 和 wonProjects.length", () => {
    render(
      createElement(CardRenderer, {
        type: "stat-won",
        config: baseConfig,
        metrics: makeMetrics({ wonBudget: 2000000, wonProjects: [{}, {}] }) as never,
        size: baseSize,
      })
    );
    expect(screen.getByText(/2,000,000/)).toBeTruthy();
    expect(screen.getByText("2 件")).toBeTruthy();
  });

  it("stat-winrate：SVG 顯示百分比", () => {
    const { container } = render(
      createElement(CardRenderer, {
        type: "stat-winrate",
        config: baseConfig,
        metrics: makeMetrics({ winRate: 60 }) as never,
        size: baseSize,
      })
    );
    expect(container.querySelector("svg")).toBeTruthy();
    expect(screen.getByText("60%")).toBeTruthy();
  });

  it("stat-year-submitted：顯示 yearSubmittedCount", () => {
    render(
      createElement(CardRenderer, {
        type: "stat-year-submitted",
        config: baseConfig,
        metrics: makeMetrics({ yearSubmittedCount: 15, yearWonCount: 6 }) as never,
        size: baseSize,
      })
    );
    expect(screen.getByText("15")).toBeTruthy();
    expect(screen.getByText(/得標 6 件/)).toBeTruthy();
  });

  it("gauge-weekly-bid：顯示 weekSubmittedCount", () => {
    render(
      createElement(CardRenderer, {
        type: "gauge-weekly-bid",
        config: baseConfig,
        metrics: makeMetrics({ weekSubmittedCount: 3 }) as never,
        size: baseSize,
      })
    );
    expect(screen.getByText("3")).toBeTruthy();
  });

  it("gauge-cost：顯示 totalCost.total", () => {
    render(
      createElement(CardRenderer, {
        type: "gauge-cost",
        config: baseConfig,
        metrics: makeMetrics({ totalCost: { total: 50000, bidDeposit: 20000, procurementFee: 30000 } }) as never,
        size: baseSize,
      })
    );
    expect(screen.getByText(/50,000/)).toBeTruthy();
  });
});

// ── Chart 空狀態 ───────────────────────────────────────────

describe("CardRenderer — chart 空狀態", () => {
  it("chart-team-workload 空時顯示「尚無企劃人員資料」", () => {
    render(
      createElement(CardRenderer, {
        type: "chart-team-workload",
        config: baseConfig,
        metrics: makeMetrics() as never,
        size: baseSize,
      })
    );
    expect(screen.getByText("尚無企劃人員資料")).toBeTruthy();
  });

  it("chart-monthly-trend 空時顯示「尚無截標時間資料」", () => {
    render(
      createElement(CardRenderer, {
        type: "chart-monthly-trend",
        config: baseConfig,
        metrics: makeMetrics() as never,
        size: baseSize,
      })
    );
    expect(screen.getByText("尚無截標時間資料")).toBeTruthy();
  });

  it("chart-type-analysis 空時顯示「尚無標案類型資料」", () => {
    render(
      createElement(CardRenderer, {
        type: "chart-type-analysis",
        config: baseConfig,
        metrics: makeMetrics() as never,
        size: baseSize,
      })
    );
    expect(screen.getByText("尚無標案類型資料")).toBeTruthy();
  });

  it("chart-status-distribution 空時顯示「尚無狀態分布資料」", () => {
    render(
      createElement(CardRenderer, {
        type: "chart-status-distribution",
        config: baseConfig,
        metrics: makeMetrics() as never,
        size: baseSize,
      })
    );
    expect(screen.getByText("尚無狀態分布資料")).toBeTruthy();
  });

  it("chart-rolling-winrate 空時顯示「尚無足夠月度資料」", () => {
    render(
      createElement(CardRenderer, {
        type: "chart-rolling-winrate",
        config: baseConfig,
        metrics: makeMetrics() as never,
        size: baseSize,
      })
    );
    expect(screen.getByText("尚無足夠月度資料")).toBeTruthy();
  });

  it("chart-quarter-compare 無資料時顯示「尚無季度資料可比較」", () => {
    render(
      createElement(CardRenderer, {
        type: "chart-quarter-compare",
        config: baseConfig,
        metrics: makeMetrics({ quarterComparison: null }) as never,
        size: baseSize,
      })
    );
    expect(screen.getByText("尚無季度資料可比較")).toBeTruthy();
  });
});

// ── Chart 有資料 ───────────────────────────────────────────

describe("CardRenderer — chart 有資料", () => {
  it("chart-team-workload 有資料時渲染長條圖", () => {
    const { container } = render(
      createElement(CardRenderer, {
        type: "chart-team-workload",
        config: baseConfig,
        metrics: makeMetrics({ teamWorkload: [{ name: "王小明", count: 3 }] }) as never,
        size: baseSize,
      })
    );
    expect(container.querySelector("[data-testid='bar-chart']")).toBeTruthy();
  });

  it("chart-monthly-trend 有資料時渲染折線圖", () => {
    const { container } = render(
      createElement(CardRenderer, {
        type: "chart-monthly-trend",
        config: baseConfig,
        metrics: makeMetrics({ monthlyTrend: [{ month: "2025-01", 投標件數: 3, 得標件數: 1 }] }) as never,
        size: baseSize,
      })
    );
    expect(container.querySelector("[data-testid='line-chart']")).toBeTruthy();
  });
});

// ── Custom 型別 ────────────────────────────────────────────

describe("CardRenderer — custom 型別", () => {
  it("type=custom 時渲染 CustomCard", () => {
    const { container } = render(
      createElement(CardRenderer, {
        type: "custom",
        config: baseConfig,
        metrics: makeMetrics() as never,
        size: baseSize,
      })
    );
    expect(container.querySelector("[data-testid='custom-card']")).toBeTruthy();
  });
});

// ── 未知型別 ───────────────────────────────────────────────

describe("CardRenderer — 未知型別", () => {
  it("未知 type 時顯示 fallback 文字", () => {
    render(
      createElement(CardRenderer, {
        type: "unknown-xyz",
        config: baseConfig,
        metrics: makeMetrics() as never,
        size: baseSize,
      })
    );
    expect(screen.getByText(/unknown type: unknown-xyz/)).toBeTruthy();
  });
});
