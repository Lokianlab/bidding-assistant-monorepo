import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { KpiSummary } from "../KpiSummary";
import type { AnalyticsTotals } from "@/lib/dashboard/useAnalyticsMetrics";

// ── Helper ──────────────────────────────────────────────────

function makeTotals(overrides?: Partial<AnalyticsTotals>): AnalyticsTotals {
  return {
    submitted: 10,
    won: 4,
    winRate: 40,
    wonBudget: 5000000,
    totalCostAmount: 200000,
    ...overrides,
  };
}

// ── 基本顯示 ───────────────────────────────────────────────

describe("KpiSummary — 基本顯示", () => {
  it("顯示投標件數", () => {
    render(createElement(KpiSummary, { totals: makeTotals({ submitted: 10 }) }));
    expect(screen.getByText("10")).toBeTruthy();
    expect(screen.getByText("投標件數")).toBeTruthy();
  });

  it("顯示得標件數", () => {
    render(createElement(KpiSummary, { totals: makeTotals({ won: 4 }) }));
    expect(screen.getByText("4")).toBeTruthy();
    expect(screen.getByText("得標件數")).toBeTruthy();
  });

  it("顯示得標率（含 %）", () => {
    render(createElement(KpiSummary, { totals: makeTotals({ winRate: 40 }) }));
    expect(screen.getByText("40%")).toBeTruthy();
    expect(screen.getByText("得標率")).toBeTruthy();
  });

  it("顯示得標金額（含 $ 前綴）", () => {
    render(createElement(KpiSummary, { totals: makeTotals({ wonBudget: 5000000 }) }));
    expect(screen.getByText(/\$5,000,000/)).toBeTruthy();
    expect(screen.getByText("得標金額")).toBeTruthy();
  });

  it("顯示投入成本（含 $ 前綴）", () => {
    render(createElement(KpiSummary, { totals: makeTotals({ totalCostAmount: 200000 }) }));
    expect(screen.getByText(/\$200,000/)).toBeTruthy();
    expect(screen.getByText("投入成本")).toBeTruthy();
  });
});

// ── 顏色 ───────────────────────────────────────────────────

describe("KpiSummary — 顏色", () => {
  it("得標件數使用 text-emerald-600", () => {
    const { container } = render(createElement(KpiSummary, { totals: makeTotals() }));
    expect(container.querySelector(".text-emerald-600")).toBeTruthy();
  });

  it("得標率使用 text-amber-600", () => {
    const { container } = render(createElement(KpiSummary, { totals: makeTotals() }));
    expect(container.querySelector(".text-amber-600")).toBeTruthy();
  });
});
