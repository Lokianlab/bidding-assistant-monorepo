import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { YoYSection } from "../YoYSection";
import type { YoYSummary } from "@/lib/dashboard/useAnalyticsMetrics";

// ── recharts mock ───────────────────────────────────────────

vi.mock("recharts", () => ({
  LineChart: ({ children }: { children: unknown }) =>
    createElement("div", { "data-testid": "line-chart" }, children as never),
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  ResponsiveContainer: ({ children }: { children: unknown }) =>
    createElement("div", { "data-testid": "responsive-container" }, children as never),
}));

// ── Radix Select 需要 scrollIntoView ───────────────────────

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

// ── Helpers ─────────────────────────────────────────────────

function makeYoYData(overrides?: Partial<YoYSummary>): YoYSummary {
  return {
    baseYear: 2024,
    compareYear: 2025,
    data: [
      { period: "1月", periodNum: 1, baseSubmitted: 3, baseWon: 1, baseWonBudget: 0, compareSubmitted: 5, compareWon: 2, compareWonBudget: 0 },
    ],
    baseTotals: { submitted: 10, won: 4, wonBudget: 2000000 },
    compareTotals: { submitted: 8, won: 3, wonBudget: 1500000 },
    ...overrides,
  };
}

const defaultProps = {
  availableYears: [2024, 2025],
  yoyBaseYear: 2024,
  setYoyBaseYear: vi.fn(),
  yoyCompareYear: 2025,
  setYoyCompareYear: vi.fn(),
  yoyData: null as YoYSummary | null,
};

// ── 隱藏條件 ───────────────────────────────────────────────

describe("YoYSection — 顯示條件", () => {
  it("availableYears < 2 時不渲染任何內容", () => {
    const { container } = render(
      createElement(YoYSection, {
        ...defaultProps,
        availableYears: [2024],
      })
    );
    expect(container.firstChild).toBeNull();
  });

  it("availableYears=[] 時不渲染任何內容", () => {
    const { container } = render(
      createElement(YoYSection, {
        ...defaultProps,
        availableYears: [],
      })
    );
    expect(container.firstChild).toBeNull();
  });
});

// ── 標題 ───────────────────────────────────────────────────

describe("YoYSection — 標題", () => {
  it("顯示「年度同期比較」標題", () => {
    render(createElement(YoYSection, { ...defaultProps, yoyData: makeYoYData() }));
    expect(screen.getByText("年度同期比較")).toBeTruthy();
  });
});

// ── 無資料狀態 ─────────────────────────────────────────────

describe("YoYSection — 無資料狀態", () => {
  it("yoyData=null 時顯示「所選年度無可比較的資料」", () => {
    render(createElement(YoYSection, { ...defaultProps, yoyData: null }));
    expect(screen.getByText("所選年度無可比較的資料")).toBeTruthy();
  });

  it("yoyData.data=[] 時顯示「所選年度無可比較的資料」", () => {
    render(
      createElement(YoYSection, {
        ...defaultProps,
        yoyData: makeYoYData({ data: [] }),
      })
    );
    expect(screen.getByText("所選年度無可比較的資料")).toBeTruthy();
  });

  it("baseYear === compareYear 時顯示「請選擇不同的年度進行比較」", () => {
    render(
      createElement(YoYSection, {
        ...defaultProps,
        yoyBaseYear: 2024,
        yoyCompareYear: 2024,
        yoyData: null,
      })
    );
    expect(screen.getByText("請選擇不同的年度進行比較")).toBeTruthy();
  });
});

// ── 有資料 ─────────────────────────────────────────────────

describe("YoYSection — 有資料", () => {
  it("有 yoyData 時渲染折線圖", () => {
    const { container } = render(
      createElement(YoYSection, { ...defaultProps, yoyData: makeYoYData() })
    );
    expect(container.querySelector("[data-testid='line-chart']")).toBeTruthy();
  });

  it("顯示摘要卡片（投標件數、得標件數、得標金額）", () => {
    render(createElement(YoYSection, { ...defaultProps, yoyData: makeYoYData() }));
    expect(screen.getByText("投標件數")).toBeTruthy();
    expect(screen.getByText("得標件數")).toBeTruthy();
    expect(screen.getByText("得標金額")).toBeTruthy();
  });

  it("摘要卡片顯示基準年數值", () => {
    render(
      createElement(YoYSection, {
        ...defaultProps,
        yoyData: makeYoYData({
          baseTotals: { submitted: 10, won: 4, wonBudget: 2000000 },
        }),
      })
    );
    // baseTotals.submitted = 10
    expect(screen.getByText(/10 件/)).toBeTruthy();
  });
});
