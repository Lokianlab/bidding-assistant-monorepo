import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { ChartsSection } from "../ChartsSection";

// ── recharts mock ───────────────────────────────────────────

vi.mock("recharts", () => ({
  BarChart: ({ children }: { children: unknown }) =>
    createElement("div", { "data-testid": "bar-chart" }, children as never),
  LineChart: ({ children }: { children: unknown }) =>
    createElement("div", { "data-testid": "line-chart" }, children as never),
  Bar: () => null,
  Line: () => null,
  Cell: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  ResponsiveContainer: ({ children }: { children: unknown }) =>
    createElement("div", { "data-testid": "responsive-container" }, children as never),
}));

// ── 空資料狀態 ─────────────────────────────────────────────

describe("ChartsSection — 空資料", () => {
  it("monthlyTrend=[] 時顯示「尚無截標時間資料」", () => {
    render(
      createElement(ChartsSection, {
        monthlyTrend: [],
        typeAnalysis: [],
        teamWorkload: [],
      })
    );
    expect(screen.getByText("尚無截標時間資料")).toBeTruthy();
  });

  it("typeAnalysis=[] 時顯示「尚無標案類型資料」", () => {
    render(
      createElement(ChartsSection, {
        monthlyTrend: [],
        typeAnalysis: [],
        teamWorkload: [],
      })
    );
    expect(screen.getByText("尚無標案類型資料")).toBeTruthy();
  });

  it("teamWorkload=[] 時顯示「尚無企劃人員資料」", () => {
    render(
      createElement(ChartsSection, {
        monthlyTrend: [],
        typeAnalysis: [],
        teamWorkload: [],
      })
    );
    expect(screen.getByText("尚無企劃人員資料")).toBeTruthy();
  });
});

// ── 有資料 ─────────────────────────────────────────────────

describe("ChartsSection — 有資料", () => {
  it("有 teamWorkload 時渲染長條圖", () => {
    const { container } = render(
      createElement(ChartsSection, {
        monthlyTrend: [],
        typeAnalysis: [],
        teamWorkload: [{ name: "王小明", count: 3 }],
      })
    );
    expect(container.querySelector("[data-testid='bar-chart']")).toBeTruthy();
  });

  it("有 monthlyTrend 時渲染折線圖", () => {
    const { container } = render(
      createElement(ChartsSection, {
        monthlyTrend: [{ month: "2025-01", fullKey: "2025-01", 投標件數: 3, 得標件數: 1 }],
        typeAnalysis: [],
        teamWorkload: [],
      })
    );
    expect(container.querySelector("[data-testid='line-chart']")).toBeTruthy();
  });

  it("有 typeAnalysis 時渲染長條圖", () => {
    const { container } = render(
      createElement(ChartsSection, {
        monthlyTrend: [],
        typeAnalysis: [{ name: "展覽策展", 件數: 5, 預算: 0 }],
        teamWorkload: [],
      })
    );
    // typeAnalysis 用 BarChart
    expect(container.querySelectorAll("[data-testid='bar-chart']").length).toBeGreaterThan(0);
  });
});

// ── 標題 ───────────────────────────────────────────────────

describe("ChartsSection — 標題", () => {
  it("顯示「企劃人員工作量」標題", () => {
    render(
      createElement(ChartsSection, {
        monthlyTrend: [],
        typeAnalysis: [],
        teamWorkload: [],
      })
    );
    expect(screen.getByText("企劃人員工作量")).toBeTruthy();
  });

  it("顯示「月份趨勢（近 12 個月）」標題", () => {
    render(
      createElement(ChartsSection, {
        monthlyTrend: [],
        typeAnalysis: [],
        teamWorkload: [],
      })
    );
    expect(screen.getByText("月份趨勢（近 12 個月）")).toBeTruthy();
  });

  it("顯示「標案類型分析」標題", () => {
    render(
      createElement(ChartsSection, {
        monthlyTrend: [],
        typeAnalysis: [],
        teamWorkload: [],
      })
    );
    expect(screen.getByText("標案類型分析")).toBeTruthy();
  });
});
