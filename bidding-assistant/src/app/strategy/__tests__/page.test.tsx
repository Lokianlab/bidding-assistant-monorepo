import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import StrategyPage from "../page";
import { DEFAULT_SETTINGS } from "@/lib/settings/defaults";
import { useSettings } from "@/lib/context/settings-context";

// ── Hoisted mocks ─────────────────────────────────────────
const { mockPush, mockSearchGet } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockSearchGet: vi.fn().mockReturnValue(null),
}));

// ── Mock next/navigation ──────────────────────────────────
vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: mockSearchGet }),
  useRouter: () => ({ push: mockPush }),
}));

// ── Mock next/link ────────────────────────────────────────
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

// ── Mock useSettings ──────────────────────────────────────
vi.mock("@/lib/context/settings-context", () => ({
  useSettings: vi.fn(() => ({
    settings: DEFAULT_SETTINGS,
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
const mockFitScore = {
  total: 78,
  verdict: "推薦",
  dimensions: {
    keyword: 90, budget: 80, agency: 70, performance: 75, kb: 65,
  },
};
vi.mock("@/lib/strategy/useFitScore", () => ({
  useFitScore: vi.fn(() => ({ fitScore: mockFitScore, kbMatch: [] })),
}));

// ── Mock intelligence-bridge ──────────────────────────────
vi.mock("@/lib/strategy/intelligence-bridge", () => ({
  readCachedIntelligence: vi.fn(() => ({
    selfAnalysis: null,
    marketTrend: null,
    tenderSummary: null,
  })),
}));

// ── Mock sub-components ───────────────────────────────────
vi.mock("@/components/strategy/FitScoreCard", () => ({
  FitScoreCard: ({ fitScore }: { fitScore: { verdict: string; total: number } }) => (
    <div data-testid="fit-score-card">
      評分：{fitScore.total}｜{fitScore.verdict}
    </div>
  ),
}));

vi.mock("@/components/layout/Sidebar", () => ({
  MobileMenuButton: () => <button data-testid="mobile-menu-btn">選單</button>,
}));

// ── Mock loadCache（控制 cachedPages）─────────────────────
vi.mock("@/lib/dashboard/helpers", () => ({
  loadCache: vi.fn(() => null), // 預設空快取
  fmt: vi.fn((n: number) => n.toLocaleString()),
  fmtDateTime: vi.fn((s: string) => s ?? ""),
}));

import { loadCache } from "@/lib/dashboard/helpers";

beforeEach(() => {
  vi.clearAllMocks();
  mockSearchGet.mockReturnValue(null); // 預設：所有 searchParams 回傳 null
  vi.mocked(loadCache).mockReturnValue(null); // 預設：無快取資料
  vi.mocked(useSettings).mockReturnValue({
    settings: DEFAULT_SETTINGS,
  } as unknown as ReturnType<typeof useSettings>);
});

// ── Tests ─────────────────────────────────────────────────

describe("StrategyPage — 渲染", () => {
  it("顯示頁面標題「戰略分析」", () => {
    render(<StrategyPage />);
    expect(screen.getByRole("heading", { name: "戰略分析" })).toBeTruthy();
  });

  it("無 URL params + 無快取資料時：顯示「選擇要分析的案件」", () => {
    render(<StrategyPage />);
    expect(screen.getByText("選擇要分析的案件")).toBeTruthy();
  });

  it("無 URL params + 無快取資料時：顯示「尚無 Notion 案件資料」提示", () => {
    render(<StrategyPage />);
    expect(screen.getByText(/尚無 Notion 案件資料/)).toBeTruthy();
  });

  it("無 URL params 時：不顯示「開始分析」按鈕（canAnalyze=false）", () => {
    render(<StrategyPage />);
    expect(screen.queryByRole("button", { name: "開始分析" })).toBeNull();
  });
});

describe("StrategyPage — URL 參數模式", () => {
  // 注意：頁面在 hydrated=true + hasUrlParams=true 時會自動呼叫 handleAnalyze()
  // 所以初始渲染後 submitted 已為 true，FitScoreCard 已顯示，「開始分析」按鈕已隱藏

  beforeEach(() => {
    mockSearchGet.mockImplementation((key: string) => {
      if (key === "caseName") return "食農教育推廣計畫";
      return null;
    });
  });

  it("有 caseName URL param 時：顯示「分析案件」區塊", () => {
    render(<StrategyPage />);
    expect(screen.getByText("分析案件")).toBeTruthy();
  });

  it("有 caseName URL param 時：頁面中有案件名稱", () => {
    render(<StrategyPage />);
    // 案件名稱出現在資訊區塊和分析結果標題（auto-analyze 後）
    const elements = screen.getAllByText("食農教育推廣計畫");
    expect(elements.length).toBeGreaterThan(0);
  });

  it("有 caseName URL param 時（auto-analyze 後）：顯示 FitScoreCard", () => {
    render(<StrategyPage />);
    // auto-analyze 在 useEffect 中執行，hydrated=true 故立即觸發
    expect(screen.getByTestId("fit-score-card")).toBeTruthy();
  });

  it("有 caseName URL param 時：不顯示選擇器區塊", () => {
    render(<StrategyPage />);
    expect(screen.queryByText("選擇要分析的案件")).toBeNull();
  });
});

describe("StrategyPage — KB 警告", () => {
  it("選擇器模式選案後 + 知識庫無資料時顯示警告（canAnalyze=true, !submitted）", () => {
    // 提供快取資料讓使用者可以選案
    vi.mocked(loadCache).mockReturnValue({
      pages: [{ id: "p1", url: "", properties: { 標案名稱: "食農教育推廣計畫", 招標機關: "農委會", 預算: 500000 } }],
      fetchedAt: "",
    } as unknown as ReturnType<typeof loadCache>);
    render(<StrategyPage />);
    // 點選案件（按下案件列表中的按鈕）
    fireEvent.click(screen.getByText("食農教育推廣計畫"));
    // selectedPage 設定後 canAnalyze=true, submitted=false, hydrated=true, !hasKBData → 顯示警告
    expect(screen.getByText(/知識庫尚無資料/)).toBeTruthy();
  });

  it("無 URL params 時（canAnalyze=false）：不顯示 KB 警告", () => {
    render(<StrategyPage />);
    expect(screen.queryByText(/知識庫尚無資料/)).toBeNull();
  });
});

describe("StrategyPage — 分析結果", () => {
  it("URL 參數模式：auto-analyze 後顯示 FitScoreCard", () => {
    mockSearchGet.mockImplementation((key: string) => {
      if (key === "caseName") return "食農教育推廣計畫";
      return null;
    });
    render(<StrategyPage />);
    // hydrated=true + hasUrlParams=true → useEffect 自動呼叫 handleAnalyze
    expect(screen.getByTestId("fit-score-card")).toBeTruthy();
  });

  it("URL 參數模式：auto-analyze 後顯示「開始撰寫（進入提示詞組裝）」按鈕", () => {
    mockSearchGet.mockImplementation((key: string) => {
      if (key === "caseName") return "食農教育推廣計畫";
      return null;
    });
    render(<StrategyPage />);
    expect(screen.getByRole("button", { name: "開始撰寫（進入提示詞組裝）" })).toBeTruthy();
  });

  it("選擇器模式：點「開始分析」後顯示 FitScoreCard", () => {
    vi.mocked(loadCache).mockReturnValue({
      pages: [{ id: "p1", url: "", properties: { 標案名稱: "食農教育推廣計畫", 招標機關: "農委會", 預算: 500000 } }],
      fetchedAt: "",
    } as unknown as ReturnType<typeof loadCache>);
    render(<StrategyPage />);
    fireEvent.click(screen.getByText("食農教育推廣計畫"));
    fireEvent.click(screen.getByRole("button", { name: "開始分析" }));
    expect(screen.getByTestId("fit-score-card")).toBeTruthy();
  });

  it("點「開始撰寫」呼叫 router.push 帶 /assembly 和 stage=L1", () => {
    mockSearchGet.mockImplementation((key: string) => {
      if (key === "caseName") return "食農教育推廣計畫";
      return null;
    });
    render(<StrategyPage />);
    fireEvent.click(screen.getByRole("button", { name: "開始撰寫（進入提示詞組裝）" }));
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush.mock.calls[0][0]).toContain("/assembly");
    expect(mockPush.mock.calls[0][0]).toContain("stage=L1");
    expect(mockPush.mock.calls[0][0]).toContain("caseName=");
  });
});

describe("StrategyPage — 回到案件導覽", () => {
  it("無 caseId 時不顯示「回到案件」按鈕", () => {
    render(<StrategyPage />);
    expect(screen.queryByRole("button", { name: "← 回到案件" })).toBeNull();
  });

  it("有 caseId 時顯示「← 回到案件」按鈕", () => {
    mockSearchGet.mockImplementation((key: string) =>
      key === "caseId" ? "page-abc" : null,
    );
    render(<StrategyPage />);
    expect(screen.getByRole("button", { name: "← 回到案件" })).toBeTruthy();
  });

  it("點「← 回到案件」導向 /case-work?id={caseId}", () => {
    mockSearchGet.mockImplementation((key: string) =>
      key === "caseId" ? "page-abc" : null,
    );
    render(<StrategyPage />);
    fireEvent.click(screen.getByRole("button", { name: "← 回到案件" }));
    expect(mockPush).toHaveBeenCalledWith("/case-work?id=page-abc");
  });

  it("點「開始撰寫」時帶 caseId 到 /assembly", () => {
    mockSearchGet.mockImplementation((key: string) => {
      if (key === "caseId") return "page-abc";
      if (key === "caseName") return "食農教育推廣計畫";
      return null;
    });
    render(<StrategyPage />);
    // URL 參數模式：auto-analyze 後直接顯示「開始撰寫」按鈕
    fireEvent.click(screen.getByRole("button", { name: "開始撰寫（進入提示詞組裝）" }));
    expect(mockPush.mock.calls[0][0]).toContain("/assembly");
    expect(mockPush.mock.calls[0][0]).toContain("caseId=page-abc");
  });
});
