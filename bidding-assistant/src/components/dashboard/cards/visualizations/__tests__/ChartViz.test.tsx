import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { BarViz } from "../BarViz";
import { LineViz } from "../LineViz";
import { StackedBarViz } from "../StackedBarViz";

// recharts 在 jsdom 環境中有 ESM / ResizeObserver 相容問題，統一 mock
vi.mock("recharts", () => ({
  BarChart: ({ children }: { children: unknown }) =>
    createElement("div", { "data-testid": "bar-chart" }, children as never),
  LineChart: ({ children }: { children: unknown }) =>
    createElement("div", { "data-testid": "line-chart" }, children as never),
  Bar: () => null,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  Cell: () => null,
  ResponsiveContainer: ({ children }: { children: unknown }) =>
    createElement("div", { "data-testid": "responsive-container" }, children as never),
}));

// ── BarViz ─────────────────────────────────────────────────

describe("BarViz — 無資料", () => {
  it("data=null 時顯示「無資料」", () => {
    render(createElement(BarViz, { data: null }));
    expect(screen.getByText("無資料")).toBeTruthy();
  });

  it("data=[] 時顯示「無資料」", () => {
    render(createElement(BarViz, { data: [] }));
    expect(screen.getByText("無資料")).toBeTruthy();
  });

  it("data 為數字時顯示「無資料」", () => {
    render(createElement(BarViz, { data: 42 }));
    expect(screen.getByText("無資料")).toBeTruthy();
  });
});

describe("BarViz — 有效資料渲染", () => {
  const data = [
    { name: "一月", value: 10 },
    { name: "二月", value: 20 },
  ];

  it("有效資料時渲染 ResponsiveContainer", () => {
    const { container } = render(createElement(BarViz, { data }));
    expect(container.querySelector("[data-testid='responsive-container']")).toBeTruthy();
  });

  it("有效資料時渲染 BarChart", () => {
    const { container } = render(createElement(BarViz, { data }));
    expect(container.querySelector("[data-testid='bar-chart']")).toBeTruthy();
  });
});

// ── LineViz ────────────────────────────────────────────────

describe("LineViz — 無資料", () => {
  it("data=null 時顯示「無資料」", () => {
    render(createElement(LineViz, { data: null }));
    expect(screen.getByText("無資料")).toBeTruthy();
  });

  it("data=[] 時顯示「無資料」", () => {
    render(createElement(LineViz, { data: [] }));
    expect(screen.getByText("無資料")).toBeTruthy();
  });

  it("data 中沒有數字值鍵時顯示「無資料」", () => {
    // 所有鍵都是字串值，找不到 valueKeys
    render(createElement(LineViz, { data: [{ label: "A", name: "B" }] }));
    expect(screen.getByText("無資料")).toBeTruthy();
  });
});

describe("LineViz — 有效資料渲染", () => {
  const data = [
    { month: "一月", sales: 100, cost: 80 },
    { month: "二月", sales: 120, cost: 90 },
  ];

  it("有效資料時渲染 ResponsiveContainer", () => {
    const { container } = render(createElement(LineViz, { data }));
    expect(container.querySelector("[data-testid='responsive-container']")).toBeTruthy();
  });

  it("有效資料時渲染 LineChart", () => {
    const { container } = render(createElement(LineViz, { data }));
    expect(container.querySelector("[data-testid='line-chart']")).toBeTruthy();
  });
});

// ── StackedBarViz ──────────────────────────────────────────

describe("StackedBarViz — 無資料", () => {
  it("data=null 時顯示「無資料」", () => {
    render(createElement(StackedBarViz, { data: null }));
    expect(screen.getByText("無資料")).toBeTruthy();
  });

  it("data=[] 時顯示「無資料」", () => {
    render(createElement(StackedBarViz, { data: [] }));
    expect(screen.getByText("無資料")).toBeTruthy();
  });

  it("data 中沒有數字值鍵時顯示「無資料」", () => {
    render(createElement(StackedBarViz, { data: [{ name: "A", label: "B" }] }));
    expect(screen.getByText("無資料")).toBeTruthy();
  });
});

describe("StackedBarViz — 有效資料渲染", () => {
  const data = [
    { name: "Q1", plan: 100, actual: 90 },
    { name: "Q2", plan: 120, actual: 110 },
  ];

  it("有效資料時渲染 ResponsiveContainer", () => {
    const { container } = render(createElement(StackedBarViz, { data }));
    expect(container.querySelector("[data-testid='responsive-container']")).toBeTruthy();
  });

  it("有效資料時渲染 BarChart（stacked）", () => {
    const { container } = render(createElement(StackedBarViz, { data }));
    expect(container.querySelector("[data-testid='bar-chart']")).toBeTruthy();
  });
});
