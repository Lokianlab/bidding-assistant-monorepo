import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import IntelligencePage from "../page";

// ── Mock next/navigation ──────────────────────────────────
vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: () => null }),
}));

// ── Mock Radix UI Tabs（避免 lazy render 問題）────────────
vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => (
    <div role="tablist">{children}</div>
  ),
  TabsTrigger: ({
    value,
    children,
  }: {
    value: string;
    children: React.ReactNode;
  }) => <button role="tab" data-value={value}>{children}</button>,
  TabsContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

// ── Mock 子元件 ────────────────────────────────────────────
vi.mock("@/components/layout/Sidebar", () => ({
  MobileMenuButton: () => <button data-testid="mobile-menu-btn">選單</button>,
}));

vi.mock("@/components/pcc/PCCSearchPanel", () => ({
  PCCSearchPanel: () => <div data-testid="pcc-search-panel">案件搜尋面板</div>,
}));

vi.mock("@/components/pcc/CompetitorAnalysis", () => ({
  CompetitorAnalysis: () => (
    <div data-testid="competitor-analysis">競爭分析面板</div>
  ),
}));

vi.mock("@/components/pcc/MarketTrend", () => ({
  MarketTrend: () => <div data-testid="market-trend">市場趨勢面板</div>,
}));

vi.mock("@/components/pcc/CommitteeNetwork", () => ({
  CommitteeNetwork: () => (
    <div data-testid="committee-network">評委分析面板</div>
  ),
}));

// ── Tests ─────────────────────────────────────────────────

describe("IntelligencePage — 渲染", () => {
  it("顯示頁面標題「情報搜尋」", () => {
    render(<IntelligencePage />);
    expect(screen.getByRole("heading", { name: "情報搜尋" })).toBeTruthy();
  });

  it("顯示頁面說明文字", () => {
    render(<IntelligencePage />);
    expect(screen.getByText(/查詢政府標案公開資料/)).toBeTruthy();
  });

  it("顯示四個 Tab", () => {
    render(<IntelligencePage />);
    expect(screen.getByRole("tab", { name: "案件搜尋" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "競爭分析" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "市場趨勢" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "評委分析" })).toBeTruthy();
  });

  it("渲染 PCCSearchPanel", () => {
    render(<IntelligencePage />);
    expect(screen.getByTestId("pcc-search-panel")).toBeTruthy();
  });

  it("渲染 CompetitorAnalysis", () => {
    render(<IntelligencePage />);
    expect(screen.getByTestId("competitor-analysis")).toBeTruthy();
  });

  it("渲染 MarketTrend", () => {
    render(<IntelligencePage />);
    expect(screen.getByTestId("market-trend")).toBeTruthy();
  });

  it("渲染 CommitteeNetwork", () => {
    render(<IntelligencePage />);
    expect(screen.getByTestId("committee-network")).toBeTruthy();
  });

  it("渲染 MobileMenuButton", () => {
    render(<IntelligencePage />);
    expect(screen.getByTestId("mobile-menu-btn")).toBeTruthy();
  });
});
