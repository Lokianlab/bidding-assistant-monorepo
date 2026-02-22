import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import DashboardPage from "../page";
import { DEFAULT_SETTINGS } from "@/lib/settings/defaults";
import { useSettings } from "@/lib/context/settings-context";

// ── Mock useSettings ───────────────────────────────────────────────
vi.mock("@/lib/context/settings-context", () => ({
  useSettings: vi.fn(() => ({
    settings: DEFAULT_SETTINGS,
    hydrated: true,
    updateSettings: vi.fn(),
  })),
}));

// ── Mock useDashboardMetrics（穩定物件參考）─────────────────────────
// page.tsx 直接存取 metrics.wonBudget 及 xxxProjects.length，不只是 pass-through
const stableMetrics = {
  wonBudget: 0,
  biddingProjects: [],
  presentedProjects: [],
  wonProjects: [],
  submittedProjects: [],
  totalBudget: 0,
  biddingBudget: 0,
  winRate: 0,
  totalCost: 0,
  totalCostByPeriod: {},
  monthSubmittedCount: 0,
  weekSubmittedCount: 0,
  yearSubmittedCount: 0,
  yearWonCount: 0,
  monthlyTrend: [],
  typeAnalysis: [],
  teamWorkload: [],
};
vi.mock("@/lib/dashboard/useDashboardMetrics", () => ({
  useDashboardMetrics: vi.fn(() => stableMetrics),
}));

// ── Mock ChartsSection（引入 recharts，必須 mock）────────────────────
vi.mock("@/components/dashboard/ChartsSection", () => ({
  ChartsSection: () => <div data-testid="charts-section" />,
}));

// ── Mock DashboardGrid（→ CardRenderer → recharts，必須 mock）────────
vi.mock("@/components/dashboard/DashboardGrid", () => ({
  DashboardGrid: () => <div data-testid="dashboard-grid" />,
}));

// ── Mock 其餘 dashboard 子元件 ─────────────────────────────────────
vi.mock("@/components/dashboard/StatsGrid", () => ({
  StatsGrid: () => <div data-testid="stats-grid" />,
}));

vi.mock("@/components/dashboard/QuickStart", () => ({
  QuickStart: () => <div data-testid="quick-start" />,
}));

// useDebouncedValue 是 hook，直接回傳原值以避免 setTimeout 問題
vi.mock("@/components/dashboard/SearchBar", () => ({
  SearchBar: () => <div data-testid="search-bar" />,
  useDebouncedValue: (val: string) => val,
}));

vi.mock("@/components/dashboard/ProjectDetailSheet", () => ({
  ProjectDetailSheet: () => <div data-testid="project-detail-sheet" />,
}));

// ── Mock Sidebar ──────────────────────────────────────────────────
vi.mock("@/components/layout/Sidebar", () => ({
  MobileMenuButton: () => <button data-testid="mobile-menu-btn">選單</button>,
}));

// ── Mock feature-registry（預設關閉自訂儀表板，走固定佈局分支）────────
vi.mock("@/lib/modules/feature-registry", () => ({
  isFeatureEnabled: vi.fn(() => false),
}));

// ── Mock logger ──────────────────────────────────────────────────
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// ── beforeEach ───────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useSettings).mockReturnValue({
    settings: DEFAULT_SETTINGS,
    hydrated: true,
    updateSettings: vi.fn(),
  } as unknown as ReturnType<typeof useSettings>);
});

// ── Tests ────────────────────────────────────────────────────────

describe("DashboardPage — 基本渲染（未連線）", () => {
  it("顯示「企劃備標指揮部」標題", () => {
    render(<DashboardPage />);
    expect(screen.getByRole("heading", { name: "企劃備標指揮部" })).toBeTruthy();
  });

  it("顯示 MobileMenuButton", () => {
    render(<DashboardPage />);
    expect(screen.getByTestId("mobile-menu-btn")).toBeTruthy();
  });

  it("未連線時顯示「展示模式」badge", () => {
    // DEFAULT_SETTINGS.connections.notion.token="" → fetchData 走 mock 分支
    // → connected=false, showFullSkeleton=false → badge 顯示
    render(<DashboardPage />);
    expect(screen.getByText("展示模式")).toBeTruthy();
  });

  it("顯示「重新整理」按鈕（fetchData 後 loading=false）", () => {
    render(<DashboardPage />);
    expect(screen.getByRole("button", { name: "重新整理" })).toBeTruthy();
  });

  it("顯示「第一順位」分頁標籤", () => {
    render(<DashboardPage />);
    expect(screen.getByText("第一順位")).toBeTruthy();
  });

  it("渲染 StatsGrid 子元件", () => {
    render(<DashboardPage />);
    expect(screen.getByTestId("stats-grid")).toBeTruthy();
  });

  it("渲染 QuickStart 子元件", () => {
    render(<DashboardPage />);
    expect(screen.getByTestId("quick-start")).toBeTruthy();
  });
});
