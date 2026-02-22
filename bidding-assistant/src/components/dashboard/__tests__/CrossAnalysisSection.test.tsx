import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import {
  CrossAnalysisPanel,
} from "../CrossAnalysisSection";
import type { CrossAnalysisResult } from "@/lib/dashboard/useCrossAnalysis";

// ── mock recharts（有資料時的圖表渲染用）─────────────────

vi.mock("recharts", () => ({
  BarChart: ({ children }: { children?: unknown }) => createElement("div", { "data-testid": "bar-chart" }, children as never),
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children?: unknown }) => createElement("div", {}, children as never),
}));

// ── 空資料結構 ────────────────────────────────────────────

const emptyAnalysis: CrossAnalysisResult = {
  byWriter: [],
  byAgency: [],
  byType: [],
  byMethod: [],
  byBudgetRange: [],
  byPriority: [],
  byDecision: [],
  globalInsights: [],
  costAnalysis: {
    sunkCostPages: [],
    sunkCostTotal: 0,
    agencyROI: [],
    typeROI: [],
    totalInvested: 0,
    totalWonBudget: 0,
    overallROI: 0,
  },
  writerNames: [],
};

// ── CrossAnalysisPanel ─────────────────────────────────────

describe("CrossAnalysisPanel — 基本渲染", () => {
  it("顯示「多維交叉分析」標題", () => {
    render(createElement(CrossAnalysisPanel, { analysis: emptyAnalysis, pages: [] }));
    expect(screen.getByText("多維交叉分析")).toBeTruthy();
  });

  it("顯示「維度 A」選擇器", () => {
    render(createElement(CrossAnalysisPanel, { analysis: emptyAnalysis, pages: [] }));
    expect(screen.getByText(/維度 A/)).toBeTruthy();
  });

  it("顯示「維度 B」選擇器", () => {
    render(createElement(CrossAnalysisPanel, { analysis: emptyAnalysis, pages: [] }));
    expect(screen.getByText(/維度 B/)).toBeTruthy();
  });

  it("空資料時顯示「尚無資料」", () => {
    render(createElement(CrossAnalysisPanel, { analysis: emptyAnalysis, pages: [] }));
    // BreakdownChart 在 data 為空時直接渲染「尚無資料」
    expect(screen.getAllByText("尚無資料").length).toBeGreaterThan(0);
  });
});
