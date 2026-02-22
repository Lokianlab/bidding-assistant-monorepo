import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ExplorePage from "../page";

// ── Mock Sidebar ─────────────────────────────────────────────────
vi.mock("@/components/layout/Sidebar", () => ({
  MobileMenuButton: () => <button data-testid="mobile-menu-btn">選單</button>,
}));

// ── Mock ExplorerPage（避免拉入 recharts / PCC API 等依賴）─────────
vi.mock("@/components/explore/ExplorerPage", () => ({
  ExplorerPage: () => <div data-testid="explorer-page" />,
}));

// ── Tests ────────────────────────────────────────────────────────

describe("ExplorePage — 基本渲染", () => {
  it("顯示「情報探索」標題", () => {
    render(<ExplorePage />);
    expect(screen.getByRole("heading", { name: "情報探索" })).toBeTruthy();
  });

  it("顯示副標題說明文字", () => {
    render(<ExplorePage />);
    expect(
      screen.getByText("搜尋標案、點進詳情、再鑽進廠商或機關，無限探索")
    ).toBeTruthy();
  });

  it("顯示 MobileMenuButton", () => {
    render(<ExplorePage />);
    expect(screen.getByTestId("mobile-menu-btn")).toBeTruthy();
  });

  it("渲染 ExplorerPage 主體元件", () => {
    render(<ExplorePage />);
    expect(screen.getByTestId("explorer-page")).toBeTruthy();
  });
});
