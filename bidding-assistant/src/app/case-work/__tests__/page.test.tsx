import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import CaseWorkPage from "../page";
import { DEFAULT_SETTINGS } from "@/lib/settings/defaults";
import { useSettings } from "@/lib/context/settings-context";

// ── Hoisted mocks ─────────────────────────────────────────
const { mockSearchGet } = vi.hoisted(() => ({
  mockSearchGet: vi.fn(() => null),
}));

// ── Mock next/navigation ──────────────────────────────────
vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: mockSearchGet }),
  useRouter: () => ({ push: vi.fn() }),
}));

// ── Mock useSettings ──────────────────────────────────────
vi.mock("@/lib/context/settings-context", () => ({
  useSettings: vi.fn(() => ({
    settings: DEFAULT_SETTINGS,
    hydrated: true,
  })),
}));

// ── Mock useKnowledgeBase ─────────────────────────────────
vi.mock("@/lib/knowledge-base/useKnowledgeBase", () => ({
  useKnowledgeBase: vi.fn(() => ({
    data: { "00A": [], "00B": [], "00C": [], "00D": [], "00E": [] },
    hydrated: true,
  })),
}));

// ── Mock useFitScore ──────────────────────────────────────
vi.mock("@/lib/strategy/useFitScore", () => ({
  useFitScore: vi.fn(() => ({ fitScore: null, kbMatch: [] })),
}));

// ── Mock intelligence-bridge ──────────────────────────────
vi.mock("@/lib/strategy/intelligence-bridge", () => ({
  readCachedIntelligence: vi.fn(() => ({
    selfAnalysis: null,
    marketTrend: null,
    tenderSummary: null,
  })),
}));

// ── Mock loadCaseById ─────────────────────────────────────
vi.mock("@/lib/case-work/helpers", () => ({
  loadCaseById: vi.fn(() => null),
}));

// ── Mock case-board helpers ───────────────────────────────
vi.mock("@/lib/case-board/helpers", () => ({
  getCaseProgress: vi.fn(() => null),
  saveCaseProgress: vi.fn(),
  calculateProgress: vi.fn(() => 0),
  applyBoardFilters: vi.fn((pages: unknown[]) => pages),
}));

// ── Mock 子元件 ────────────────────────────────────────────
vi.mock("@/components/layout/Sidebar", () => ({
  MobileMenuButton: () => <button data-testid="mobile-menu-btn">選單</button>,
}));

vi.mock("@/components/case-board/StageProgressBar", () => ({
  StageProgressBar: () => <div data-testid="stage-progress-bar">進度條</div>,
}));

vi.mock("@/components/strategy/FitScoreCard", () => ({
  FitScoreCard: () => <div data-testid="fit-score-card">適配度卡片</div>,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockSearchGet.mockReturnValue(null);
  vi.mocked(useSettings).mockReturnValue({
    settings: DEFAULT_SETTINGS,
    hydrated: true,
  } as unknown as ReturnType<typeof useSettings>);
});

// ── Tests ─────────────────────────────────────────────────

describe("CaseWorkPage — 無 pageId（空狀態）", () => {
  it("顯示「案件工作頁」標題", () => {
    // useSearchParams get 回傳 null → 無 pageId
    render(<CaseWorkPage />);
    expect(
      screen.getByRole("heading", { name: "案件工作頁" }),
    ).toBeTruthy();
  });

  it("顯示「請從案件看板選擇一個案件」說明", () => {
    render(<CaseWorkPage />);
    expect(screen.getByText(/請從案件看板選擇一個案件/)).toBeTruthy();
  });

  it("顯示「前往案件看板」按鈕", () => {
    render(<CaseWorkPage />);
    expect(
      screen.getByRole("button", { name: "前往案件看板" }),
    ).toBeTruthy();
  });
});

describe("CaseWorkPage — 有 pageId 但找不到案件", () => {
  it("顯示「找不到案件」標題", async () => {
    mockSearchGet.mockImplementation((key: string) =>
      key === "id" ? "notion-page-123" : null,
    );
    render(<CaseWorkPage />);
    // hydrated 後才能看到 notFound 狀態
    await vi.waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "找不到案件" }),
      ).toBeTruthy();
    });
  });
});
