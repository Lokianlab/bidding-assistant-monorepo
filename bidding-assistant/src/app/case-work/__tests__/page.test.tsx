import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CaseWorkPage from "../page";
import { DEFAULT_SETTINGS } from "@/lib/settings/defaults";
import { useSettings } from "@/lib/context/settings-context";
import { loadCaseById } from "@/lib/case-work/helpers";

// ── Hoisted mocks ─────────────────────────────────────────
const { mockSearchGet, mockPush } = vi.hoisted(() => ({
  mockSearchGet: vi.fn(() => null),
  mockPush: vi.fn(),
}));

// ── Mock next/navigation ──────────────────────────────────
vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: mockSearchGet }),
  useRouter: () => ({ push: mockPush }),
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

describe("CaseWorkPage — 有 pageId 且找到案件", () => {
  const CASE_PROPS = {
    "標案名稱": "食農教育推廣計畫",
    "招標機關": "教育局",
  };

  beforeEach(() => {
    mockSearchGet.mockImplementation((key: string) =>
      key === "id" ? "abc123def" : null,
    );
    vi.mocked(loadCaseById).mockReturnValue({
      id: "abc123def",
      url: "https://www.notion.so/abc123def",
      properties: CASE_PROPS,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  });

  it("顯示案件名稱", async () => {
    render(<CaseWorkPage />);
    await vi.waitFor(() => {
      expect(screen.getByText("食農教育推廣計畫")).toBeTruthy();
    });
  });

  it("顯示招標機關", async () => {
    render(<CaseWorkPage />);
    await vi.waitFor(() => {
      expect(screen.getByText("教育局")).toBeTruthy();
    });
  });

  it("顯示備標進度區塊", async () => {
    render(<CaseWorkPage />);
    await vi.waitFor(() => {
      expect(screen.getByText("備標進度")).toBeTruthy();
    });
  });

  it("進度 0% 時顯示「開始撰寫」按鈕", async () => {
    render(<CaseWorkPage />);
    await vi.waitFor(() => {
      expect(screen.getByRole("button", { name: "開始撰寫" })).toBeTruthy();
    });
  });

  it("點「開始撰寫」帶 caseId=pageId 到 assembly", async () => {
    render(<CaseWorkPage />);
    const btn = await vi.waitFor(() =>
      screen.getByRole("button", { name: "開始撰寫" }),
    );
    fireEvent.click(btn);
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining("caseId=abc123def"),
    );
  });
});
