import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import CaseBoardPage from "../page";
import { DEFAULT_SETTINGS } from "@/lib/settings/defaults";
import { useSettings } from "@/lib/context/settings-context";

// ── Mock useSettings ──────────────────────────────────────
vi.mock("@/lib/context/settings-context", () => ({
  useSettings: vi.fn(() => ({ settings: DEFAULT_SETTINGS, hydrated: true })),
}));

// ── Mock fetch（避免實際 API 呼叫）───────────────────────
vi.stubGlobal(
  "fetch",
  vi.fn(() =>
    Promise.resolve({
      ok: false,
      json: () => Promise.resolve({ error: "mock" }),
    }),
  ),
);

// ── Mock 子元件 ────────────────────────────────────────────
vi.mock("@/components/layout/Sidebar", () => ({
  MobileMenuButton: () => <button data-testid="mobile-menu-btn">選單</button>,
}));

vi.mock("@/components/dashboard/ProjectDetailSheet", () => ({
  ProjectDetailSheet: () => (
    <div data-testid="project-detail-sheet">案件詳情</div>
  ),
}));

vi.mock("@/components/case-board/CaseKanbanView", () => ({
  CaseKanbanView: () => <div data-testid="case-kanban-view">看板視圖</div>,
}));

vi.mock("@/components/case-board/CaseListView", () => ({
  CaseListView: () => <div data-testid="case-list-view">清單視圖</div>,
}));

vi.mock("@/components/case-board/CaseCalendarView", () => ({
  CaseCalendarView: () => <div data-testid="case-calendar-view">行事曆視圖</div>,
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useSettings).mockReturnValue({
    settings: DEFAULT_SETTINGS,
    hydrated: true,
  } as unknown as ReturnType<typeof useSettings>);
  vi.mocked(fetch).mockResolvedValue({
    ok: false,
    json: () => Promise.resolve({ error: "mock" }),
  } as Response);
});

// ── Tests ─────────────────────────────────────────────────

describe("CaseBoardPage — 渲染", () => {
  it("顯示頁面標題「案件看板」", () => {
    render(<CaseBoardPage />);
    expect(screen.getByRole("heading", { name: "案件看板" })).toBeTruthy();
  });

  it("顯示「重新整理」按鈕", () => {
    render(<CaseBoardPage />);
    expect(
      screen.getByRole("button", { name: "重新整理" }),
    ).toBeTruthy();
  });

  it("渲染 MobileMenuButton", () => {
    render(<CaseBoardPage />);
    expect(screen.getByTestId("mobile-menu-btn")).toBeTruthy();
  });

  it("fetch 失敗時顯示「展示模式」badge", async () => {
    render(<CaseBoardPage />);
    // fetch 回傳 ok:false → 展示模式 badge 出現
    // 需要等 effect 完成
    await vi.waitFor(() => {
      expect(screen.getByText("展示模式")).toBeTruthy();
    });
  });
});
