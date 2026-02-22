import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import {
  TrendLineChart,
  WriterBarChart,
  StatusPieWithInsights,
  WonBudgetBarChart,
  CumulativeChart,
} from "../PerformanceCharts";
import type { MonthStat, WriterStat, CumulativeStat, AnalyticsTotals } from "@/lib/dashboard/useAnalyticsMetrics";

// ── recharts mock（避免 ESM/ResizeObserver 問題） ──────────

vi.mock("recharts", () => ({
  LineChart: ({ children }: { children: unknown }) =>
    createElement("div", { "data-testid": "line-chart" }, children as never),
  BarChart: ({ children }: { children: unknown }) =>
    createElement("div", { "data-testid": "bar-chart" }, children as never),
  PieChart: ({ children }: { children: unknown }) =>
    createElement("div", { "data-testid": "pie-chart" }, children as never),
  AreaChart: ({ children }: { children: unknown }) =>
    createElement("div", { "data-testid": "area-chart" }, children as never),
  Line: () => null,
  Bar: () => null,
  Pie: () => null,
  Area: () => null,
  Cell: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  ResponsiveContainer: ({ children }: { children: unknown }) =>
    createElement("div", { "data-testid": "responsive-container" }, children as never),
}));

// ── Helpers ─────────────────────────────────────────────────

function makeMonthStat(overrides?: Partial<MonthStat>): MonthStat {
  return {
    key: "2025-01",
    label: "2025年1月",
    submitted: 5,
    won: 2,
    winRate: 40,
    wonBudget: 500000,
    ...overrides,
  };
}

function makeWriterStat(overrides?: Partial<WriterStat>): WriterStat {
  return {
    name: "王小明",
    submitted: 8,
    won: 4,
    winRate: 50,
    wonBudget: 2000000,
    ...overrides,
  };
}

function makeCumulativeStat(overrides?: Partial<CumulativeStat>): CumulativeStat {
  return {
    key: "2025-01",
    label: "2025年1月",
    submitted: 5,
    won: 2,
    wonBudget: 500000,
    cumSubmitted: 5,
    cumWon: 2,
    cumWonBudget: 500000,
    ...overrides,
  };
}

function makeTotals(overrides?: Partial<AnalyticsTotals>): AnalyticsTotals {
  return {
    submitted: 10,
    won: 4,
    winRate: 40,
    wonBudget: 2000000,
    totalCostAmount: 100000,
    ...overrides,
  };
}

// ── TrendLineChart ──────────────────────────────────────────

describe("TrendLineChart", () => {
  it("data=[] 時顯示「尚無資料」", () => {
    render(createElement(TrendLineChart, { data: [], timeGranularity: "month" }));
    expect(screen.getByText("尚無資料")).toBeTruthy();
  });

  it("有資料時渲染圖表", () => {
    const { container } = render(
      createElement(TrendLineChart, { data: [makeMonthStat()], timeGranularity: "month" })
    );
    expect(container.querySelector("[data-testid='responsive-container']")).toBeTruthy();
    expect(container.querySelector("[data-testid='line-chart']")).toBeTruthy();
  });

  it("月份模式標題含「月份」", () => {
    render(createElement(TrendLineChart, { data: [makeMonthStat()], timeGranularity: "month" }));
    expect(screen.getByText(/月份.*投標 vs 得標趨勢/)).toBeTruthy();
  });

  it("週次模式標題含「每週」", () => {
    render(createElement(TrendLineChart, { data: [makeMonthStat()], timeGranularity: "week" }));
    expect(screen.getByText(/每週.*投標 vs 得標趨勢/)).toBeTruthy();
  });
});

// ── WriterBarChart ──────────────────────────────────────────

describe("WriterBarChart", () => {
  it("data=[] 時顯示「尚無企劃人員資料」", () => {
    render(createElement(WriterBarChart, { data: [] }));
    expect(screen.getByText("尚無企劃人員資料")).toBeTruthy();
  });

  it("有資料時渲染長條圖", () => {
    const { container } = render(
      createElement(WriterBarChart, { data: [makeWriterStat()] })
    );
    expect(container.querySelector("[data-testid='responsive-container']")).toBeTruthy();
    expect(container.querySelector("[data-testid='bar-chart']")).toBeTruthy();
  });
});

// ── StatusPieWithInsights ───────────────────────────────────

describe("StatusPieWithInsights", () => {
  it("breakdown=[] 時顯示「尚無資料」", () => {
    render(
      createElement(StatusPieWithInsights, {
        breakdown: [],
        totals: makeTotals(),
        monthCount: 3,
      })
    );
    expect(screen.getByText("尚無資料")).toBeTruthy();
  });

  it("有 breakdown 時渲染圓餅圖", () => {
    const { container } = render(
      createElement(StatusPieWithInsights, {
        breakdown: [{ name: "得標", value: 3 }, { name: "未獲青睞", value: 2 }],
        totals: makeTotals({ winRate: 60, won: 3 }),
        monthCount: 3,
      })
    );
    expect(container.querySelector("[data-testid='pie-chart']")).toBeTruthy();
  });

  it("顯示「案件成敗分布與洞見分析」標題", () => {
    render(
      createElement(StatusPieWithInsights, {
        breakdown: [{ name: "得標", value: 3 }],
        totals: makeTotals({ won: 3 }),
        monthCount: 3,
      })
    );
    expect(screen.getByText("案件成敗分布與洞見分析")).toBeTruthy();
  });
});

// ── WonBudgetBarChart ───────────────────────────────────────

describe("WonBudgetBarChart", () => {
  it("data=[] 時顯示「尚無資料」", () => {
    render(createElement(WonBudgetBarChart, { data: [], timeGranularity: "month" }));
    expect(screen.getByText("尚無資料")).toBeTruthy();
  });

  it("有資料時渲染長條圖", () => {
    const { container } = render(
      createElement(WonBudgetBarChart, { data: [makeMonthStat()], timeGranularity: "month" })
    );
    expect(container.querySelector("[data-testid='bar-chart']")).toBeTruthy();
  });

  it("月份模式標題含「月份」", () => {
    render(createElement(WonBudgetBarChart, { data: [makeMonthStat()], timeGranularity: "month" }));
    expect(screen.getByText(/月份.*得標金額/)).toBeTruthy();
  });
});

// ── CumulativeChart ─────────────────────────────────────────

describe("CumulativeChart", () => {
  it("data=[] 時顯示「尚無資料」", () => {
    render(createElement(CumulativeChart, { data: [], timeGranularity: "month" }));
    expect(screen.getByText("尚無資料")).toBeTruthy();
  });

  it("有資料時渲染面積圖", () => {
    const { container } = render(
      createElement(CumulativeChart, { data: [makeCumulativeStat()], timeGranularity: "month" })
    );
    expect(container.querySelector("[data-testid='area-chart']")).toBeTruthy();
  });

  it("月份模式標題含「月份」", () => {
    render(createElement(CumulativeChart, { data: [makeCumulativeStat()], timeGranularity: "month" }));
    expect(screen.getByText(/月份.*累計趨勢/)).toBeTruthy();
  });
});
