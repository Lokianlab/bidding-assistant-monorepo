import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { CustomCard } from "../CustomCard";

// ── Helper ──────────────────────────────────────────────────

function makeMetrics(overrides: Record<string, unknown> = {}) {
  return {
    activeProjects: [],
    totalBudget: 0,
    wonBudget: 0,
    winRate: 0,
    biddingBudget: 0,
    yearSubmittedCount: 0,
    yearWonCount: 0,
    monthSubmittedCount: 0,
    weekSubmittedCount: 0,
    teamWorkload: [],
    monthlyTrend: [],
    typeAnalysis: [],
    statusDistribution: [],
    totalCost: { total: 0, bidDeposit: 0, procurementFee: 0 },
    totalCostByPeriod: undefined,
    rollingWinRate: [],
    quarterComparison: null,
    ...overrides,
  };
}

function makeConfig(overrides: Record<string, unknown> = {}) {
  return {
    title: "測試卡片",
    metric: "activeProjects",
    visualization: "number",
    ...overrides,
  };
}

// ── number 格式 ────────────────────────────────────────────

describe("CustomCard — number 視覺化", () => {
  it("數字格式：顯示 activeProjects.length", () => {
    render(
      createElement(CustomCard, {
        config: makeConfig({ metric: "activeProjects", visualization: "number" }) as never,
        metrics: makeMetrics({ activeProjects: [{}, {}, {}] }) as never,
      })
    );
    expect(screen.getByText("3")).toBeTruthy();
  });

  it("currency 格式：顯示 $ 前綴與千分位", () => {
    render(
      createElement(CustomCard, {
        config: makeConfig({ metric: "totalBudget", visualization: "number", numberFormat: "currency" }) as never,
        metrics: makeMetrics({ totalBudget: 1500000 }) as never,
      })
    );
    expect(screen.getByText(/\$1,500,000/)).toBeTruthy();
  });

  it("percentage 格式：winRate 0.6 → 60%", () => {
    render(
      createElement(CustomCard, {
        config: makeConfig({ metric: "winRate", visualization: "number", numberFormat: "percentage" }) as never,
        metrics: makeMetrics({ winRate: 60 }) as never, // 60 / 100 = 0.6, Math.round(0.6*100)=60
      })
    );
    expect(screen.getByText("60%")).toBeTruthy();
  });
});

// ── ring 視覺化 ────────────────────────────────────────────

describe("CustomCard — ring 視覺化", () => {
  it("渲染 SVG", () => {
    const { container } = render(
      createElement(CustomCard, {
        config: makeConfig({ metric: "winRate", visualization: "ring" }) as never,
        metrics: makeMetrics({ winRate: 75 }) as never,
      })
    );
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("顯示百分比文字（winRate 50 → 50%）", () => {
    render(
      createElement(CustomCard, {
        config: makeConfig({ metric: "winRate", visualization: "ring" }) as never,
        metrics: makeMetrics({ winRate: 50 }) as never,
      })
    );
    expect(screen.getByText("50%")).toBeTruthy();
  });
});

// ── bar 視覺化（空資料）──────────────────────────────────

describe("CustomCard — bar 視覺化", () => {
  it("空資料時顯示「-- 無資料 --」", () => {
    render(
      createElement(CustomCard, {
        config: makeConfig({ metric: "totalBudget", visualization: "bar" }) as never,
        metrics: makeMetrics({ totalBudget: 0 }) as never,
      })
    );
    expect(screen.getByText("-- 無資料 --")).toBeTruthy();
  });

  it("陣列資料時顯示 items 數量", () => {
    render(
      createElement(CustomCard, {
        config: makeConfig({ metric: "teamWorkload", visualization: "bar" }) as never,
        metrics: makeMetrics({ teamWorkload: [{ name: "A", count: 1 }, { name: "B", count: 2 }] }) as never,
      })
    );
    expect(screen.getByText(/2 items/)).toBeTruthy();
  });
});

// ── gauge 視覺化 ───────────────────────────────────────────

describe("CustomCard — gauge 視覺化", () => {
  it("顯示百分比", () => {
    render(
      createElement(CustomCard, {
        config: makeConfig({ title: "達成率", metric: "winRate", visualization: "gauge" }) as never,
        metrics: makeMetrics({ winRate: 80 }) as never,
      })
    );
    expect(screen.getByText("80%")).toBeTruthy();
  });
});

// ── 未知 visualization ────────────────────────────────────

describe("CustomCard — 未知 visualization", () => {
  it("未知類型顯示 fallback 文字", () => {
    render(
      createElement(CustomCard, {
        config: makeConfig({ visualization: "unknown-type" }) as never,
        metrics: makeMetrics() as never,
      })
    );
    expect(screen.getByText(/unknown visualization type: unknown-type/)).toBeTruthy();
  });
});
