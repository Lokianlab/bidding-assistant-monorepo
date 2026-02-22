import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { CustomCard } from "../cards/CustomCard";
import type { CustomCardConfig } from "@/lib/dashboard/card-layout/types";
import type { DashboardMetrics } from "@/lib/dashboard/useDashboardMetrics";

// ── Helpers ──────────────────────────────────────────────

function makeMetrics(overrides: Partial<DashboardMetrics> = {}): DashboardMetrics {
  return {
    activeProjects: [],
    biddingProjects: [],
    presentedProjects: [],
    wonProjects: [],
    submittedProjects: [],
    totalBudget: 0,
    biddingBudget: 0,
    wonBudget: 0,
    winRate: 0,
    totalCost: { bidDeposit: 0, procurementFee: 0, total: 0 },
    teamWorkload: [],
    teamAvgLoad: 0,
    teamCount: 0,
    monthSubmittedCount: 0,
    weekSubmittedCount: 0,
    yearSubmittedCount: 0,
    yearWonCount: 0,
    totalCostByPeriod: {
      all: { bidDeposit: 0, procurementFee: 0, total: 0 },
      year: { bidDeposit: 0, procurementFee: 0, total: 0 },
      month: { bidDeposit: 0, procurementFee: 0, total: 0 },
      week: { bidDeposit: 0, procurementFee: 0, total: 0 },
    },
    byPriority: {},
    statusDistribution: [],
    budgetByStatus: [],
    decisionDistribution: [],
    monthlyTrend: [],
    typeAnalysis: [],
    rollingWinRate: [],
    quarterComparison: null,
    ...overrides,
  } as DashboardMetrics;
}

function makeConfig(overrides: Partial<CustomCardConfig> = {}): CustomCardConfig {
  return {
    metric: "activeProjects",
    visualization: "number",
    title: "自訂卡片",
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────

describe("CustomCard", () => {
  it("number 視覺化：顯示整數", () => {
    const metrics = makeMetrics({ totalBudget: 5000000 });
    render(createElement(CustomCard, {
      config: makeConfig({ metric: "totalBudget", visualization: "number" }),
      metrics,
    }));
    expect(screen.getByText("5,000,000")).toBeTruthy();
  });

  it("number 視覺化：貨幣格式", () => {
    const metrics = makeMetrics({ totalBudget: 1234567 });
    render(createElement(CustomCard, {
      config: makeConfig({ metric: "totalBudget", visualization: "number", numberFormat: "currency" }),
      metrics,
    }));
    expect(screen.getByText("$1,234,567")).toBeTruthy();
  });

  it("number 視覺化：百分比格式", () => {
    const metrics = makeMetrics({ winRate: 75 });
    // winRate is divided by 100 in resolveMetricValue → 0.75
    render(createElement(CustomCard, {
      config: makeConfig({ metric: "winRate", visualization: "number", numberFormat: "percentage" }),
      metrics,
    }));
    expect(screen.getByText("75%")).toBeTruthy();
  });

  it("ring 視覺化：顯示百分比", () => {
    const metrics = makeMetrics({ winRate: 60 });
    render(createElement(CustomCard, {
      config: makeConfig({ metric: "winRate", visualization: "ring", title: "得標率" }),
      metrics,
    }));
    expect(screen.getByText("60%")).toBeTruthy();
    expect(screen.getByText("得標率")).toBeTruthy();
  });

  it("gauge 視覺化：顯示百分比", () => {
    const metrics = makeMetrics({ winRate: 42 });
    render(createElement(CustomCard, {
      config: makeConfig({ metric: "winRate", visualization: "gauge", title: "目標達成" }),
      metrics,
    }));
    expect(screen.getByText("42%")).toBeTruthy();
    expect(screen.getByText("目標達成")).toBeTruthy();
  });

  it("bar 視覺化：非陣列資料顯示無資料", () => {
    const metrics = makeMetrics({ totalBudget: 100 });
    render(createElement(CustomCard, {
      config: makeConfig({ metric: "totalBudget", visualization: "bar" }),
      metrics,
    }));
    expect(screen.getByText("-- 無資料 --")).toBeTruthy();
  });

  it("line 視覺化：非陣列資料顯示無資料", () => {
    const metrics = makeMetrics();
    render(createElement(CustomCard, {
      config: makeConfig({ metric: "totalBudget", visualization: "line" }),
      metrics,
    }));
    expect(screen.getByText("-- 無資料 --")).toBeTruthy();
  });

  it("mini-table 視覺化：非陣列資料顯示無資料", () => {
    const metrics = makeMetrics();
    render(createElement(CustomCard, {
      config: makeConfig({ metric: "totalBudget", visualization: "mini-table" }),
      metrics,
    }));
    expect(screen.getByText("-- 無資料 --")).toBeTruthy();
  });

  it("number 視覺化：activeProjects 解析為長度", () => {
    const metrics = makeMetrics({
      activeProjects: [{} as never, {} as never, {} as never],
    });
    render(createElement(CustomCard, {
      config: makeConfig({ metric: "activeProjects", visualization: "number" }),
      metrics,
    }));
    expect(screen.getByText("3")).toBeTruthy();
  });

  it("number 視覺化：零值顯示 0", () => {
    const metrics = makeMetrics();
    render(createElement(CustomCard, {
      config: makeConfig({ metric: "totalBudget", visualization: "number" }),
      metrics,
    }));
    expect(screen.getByText("0")).toBeTruthy();
  });
});
