import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import PerformancePage from "../page";
import { DEFAULT_SETTINGS } from "@/lib/settings/defaults";
import { useSettings } from "@/lib/context/settings-context";

// ── Mock useSettings ──────────────────────────────────
vi.mock("@/lib/context/settings-context", () => ({
  useSettings: vi.fn(() => ({
    settings: DEFAULT_SETTINGS,
    hydrated: true,
  })),
}));

// ── Mock usePerformanceData（穩定物件參考）────────────
const stablePerfData = {
  allPages: [],
  loading: false,
  connected: false,
  bgLoading: false,
  loadProgress: 0,
  fetchData: vi.fn(),
};

vi.mock("@/lib/performance/usePerformanceData", () => ({
  usePerformanceData: vi.fn(() => stablePerfData),
}));

// ── Mock useAnalyticsMetrics / computeYoY ────────────
const stableTotals = { submitted: 0, won: 0, winRate: 0, wonBudget: 0, totalCostAmount: 0 };
const stableMetrics = {
  monthlyStats: [],
  weeklyStats: [],
  writerStats: [],
  writerMonthly: [],
  totals: stableTotals,
  statusBreakdown: [],
  monthlyStatusTable: [],
  weeklyStatusTable: [],
  monthlyCumulative: [],
  weeklyCumulative: [],
};
vi.mock("@/lib/dashboard/useAnalyticsMetrics", () => ({
  useAnalyticsMetrics: vi.fn(() => stableMetrics),
  computeYoY: vi.fn(() => null),
}));

// ── Mock useCrossAnalysis ─────────────────────────────
const stableCross = { byWriter: [], byStatus: [] };
vi.mock("@/lib/dashboard/useCrossAnalysis", () => ({
  useCrossAnalysis: vi.fn(() => stableCross),
}));

// ── Mock CrossAnalysisSection（引入 recharts，必須 mock）
vi.mock("@/components/dashboard/CrossAnalysisSection", () => ({
  CrossAnalysisPanel: () => <div data-testid="cross-analysis-panel" />,
  PersonReportPanel: () => <div data-testid="person-report-panel" />,
  GlobalReviewPanel: () => <div data-testid="global-review-panel" />,
  CostAnalysisPanel: () => <div data-testid="cost-analysis-panel" />,
}));

// ── Mock dashboard helpers（純函式，保留或 mock 都行）
vi.mock("@/lib/dashboard/helpers", () => ({
  filterReviewPages: vi.fn((pages: unknown[]) => pages),
  extractAvailableYears: vi.fn(() => []),
  filterByYear: vi.fn((pages: unknown[]) => pages),
}));

// ── Mock Sidebar ──────────────────────────────────────
vi.mock("@/components/layout/Sidebar", () => ({
  MobileMenuButton: () => <button data-testid="mobile-menu-btn">選單</button>,
}));

// ── Mock 子元件 ────────────────────────────────────────
vi.mock("@/components/dashboard/YearSelector", () => ({
  YearSelector: () => <div data-testid="year-selector" />,
}));

vi.mock("@/components/performance/KpiSummary", () => ({
  KpiSummary: () => <div data-testid="kpi-summary" />,
}));

vi.mock("@/components/performance/PerformanceCharts", () => ({
  TrendLineChart: () => <div data-testid="trend-chart" />,
  WriterBarChart: () => <div data-testid="writer-chart" />,
  StatusPieWithInsights: () => <div data-testid="status-pie" />,
  WonBudgetBarChart: () => <div data-testid="budget-chart" />,
  CumulativeChart: () => <div data-testid="cumulative-chart" />,
}));

vi.mock("@/components/performance/YoYSection", () => ({
  YoYSection: () => <div data-testid="yoy-section" />,
}));

vi.mock("@/components/performance/PeriodStatusTable", () => ({
  PeriodStatusTable: () => <div data-testid="period-table" />,
}));

vi.mock("@/components/performance/WriterRankingTable", () => ({
  WriterRankingTable: () => <div data-testid="writer-ranking" />,
}));

vi.mock("@/components/performance/CaseDetailTable", () => ({
  CaseDetailTable: () => <div data-testid="case-detail" />,
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useSettings).mockReturnValue({
    settings: DEFAULT_SETTINGS,
    hydrated: true,
  } as unknown as ReturnType<typeof useSettings>);
});

// ── Tests ─────────────────────────────────────────────

describe("PerformancePage — 基本渲染（未連線）", () => {
  it("顯示「標案績效檢視中心」標題", () => {
    render(<PerformancePage />);
    expect(
      screen.getByRole("heading", { name: "標案績效檢視中心" }),
    ).toBeTruthy();
  });

  it("顯示 MobileMenuButton", () => {
    render(<PerformancePage />);
    expect(screen.getByTestId("mobile-menu-btn")).toBeTruthy();
  });

  it("顯示「重新整理」按鈕", () => {
    render(<PerformancePage />);
    expect(screen.getByRole("button", { name: "重新整理" })).toBeTruthy();
  });

  it("未連線時顯示「尚未連線 Notion」提示", () => {
    render(<PerformancePage />);
    expect(screen.getByText(/尚未連線 Notion/)).toBeTruthy();
  });

  it("未連線時顯示外部連線設定連結", () => {
    render(<PerformancePage />);
    expect(screen.getByRole("link", { name: "外部連線設定" })).toBeTruthy();
  });

  it("hydrated=false 時回傳 null（不渲染）", () => {
    vi.mocked(useSettings).mockReturnValue({
      settings: DEFAULT_SETTINGS,
      hydrated: false,
    } as unknown as ReturnType<typeof useSettings>);
    const { container } = render(<PerformancePage />);
    expect(container.firstChild).toBeNull();
  });
});
