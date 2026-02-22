import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ScanPage from "../page";

// ── Mock 重度依賴元件 ──────────────────────────────────────
vi.mock("@/components/scan/ScanDashboard", () => ({
  ScanDashboard: () => <div data-testid="scan-dashboard">巡標儀表板</div>,
}));

vi.mock("@/components/layout/Sidebar", () => ({
  MobileMenuButton: () => <button data-testid="mobile-menu-btn">選單</button>,
}));

// ── Tests ─────────────────────────────────────────────────

describe("ScanPage", () => {
  it("顯示頁面標題「行政巡標」", () => {
    render(<ScanPage />);
    expect(screen.getByRole("heading", { name: "行政巡標" })).toBeTruthy();
  });

  it("顯示頁面說明文字", () => {
    render(<ScanPage />);
    expect(screen.getByText(/搜尋 PCC 最新公告/)).toBeTruthy();
  });

  it("渲染 ScanDashboard 元件", () => {
    render(<ScanPage />);
    expect(screen.getByTestId("scan-dashboard")).toBeTruthy();
  });

  it("渲染 MobileMenuButton", () => {
    render(<ScanPage />);
    expect(screen.getByTestId("mobile-menu-btn")).toBeTruthy();
  });
});
