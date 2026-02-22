import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import StrategyPage from "../page";
import { DEFAULT_SETTINGS } from "@/lib/settings/defaults";
import { useSettings } from "@/lib/context/settings-context";

// ── Hoisted mocks ─────────────────────────────────────────
const { mockPush } = vi.hoisted(() => ({ mockPush: vi.fn() }));

// ── Mock next/navigation ──────────────────────────────────
vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: () => null }),
  useRouter: () => ({ push: mockPush }),
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

beforeEach(() => {
  vi.clearAllMocks();
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

  it("顯示「案件資訊」輸入表單", () => {
    render(<StrategyPage />);
    expect(screen.getByText("案件資訊")).toBeTruthy();
  });

  it("顯示三個輸入欄位", () => {
    render(<StrategyPage />);
    expect(screen.getByLabelText("案件名稱 *")).toBeTruthy();
    expect(screen.getByLabelText("機關名稱")).toBeTruthy();
    expect(screen.getByLabelText("預算金額（元）")).toBeTruthy();
  });

  it("空 caseName 時「開始分析」按鈕 disabled", () => {
    render(<StrategyPage />);
    const btn = screen.getByRole("button", { name: "開始分析" }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });
});

describe("StrategyPage — KB 警告", () => {
  it("知識庫無資料時顯示警告（00A/00B 空陣列）", () => {
    render(<StrategyPage />);
    expect(screen.getByText(/知識庫尚無資料/)).toBeTruthy();
  });
});

describe("StrategyPage — 表單互動", () => {
  it("填入案件名稱後「開始分析」按鈕 enabled", () => {
    render(<StrategyPage />);
    fireEvent.change(screen.getByLabelText("案件名稱 *"), {
      target: { value: "食農教育推廣計畫" },
    });
    const btn = screen.getByRole("button", { name: "開始分析" }) as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  it("點「開始分析」後顯示 FitScoreCard", () => {
    render(<StrategyPage />);
    fireEvent.change(screen.getByLabelText("案件名稱 *"), {
      target: { value: "食農教育推廣計畫" },
    });
    fireEvent.click(screen.getByRole("button", { name: "開始分析" }));
    expect(screen.getByTestId("fit-score-card")).toBeTruthy();
  });

  it("點「開始分析」後顯示「開始撰寫」按鈕", () => {
    render(<StrategyPage />);
    fireEvent.change(screen.getByLabelText("案件名稱 *"), {
      target: { value: "食農教育推廣計畫" },
    });
    fireEvent.click(screen.getByRole("button", { name: "開始分析" }));
    expect(screen.getByRole("button", { name: "開始撰寫（進入提示詞組裝）" })).toBeTruthy();
  });

  it("點「開始撰寫」呼叫 router.push 帶 stage=L1 與 caseName", () => {
    render(<StrategyPage />);
    fireEvent.change(screen.getByLabelText("案件名稱 *"), {
      target: { value: "食農教育推廣計畫" },
    });
    fireEvent.click(screen.getByRole("button", { name: "開始分析" }));
    fireEvent.click(screen.getByRole("button", { name: "開始撰寫（進入提示詞組裝）" }));
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining("/assembly"),
    );
    expect(mockPush.mock.calls[0][0]).toContain("stage=L1");
    expect(mockPush.mock.calls[0][0]).toContain("caseName=%E9%A3%9F%E8%BE%B2%E6%95%99%E8%82%B2%E6%8E%A8%E5%BB%A3%E8%A8%88%E7%95%AB");
  });

  it("修改案件名稱後 submitted 重置（FitScoreCard 消失）", () => {
    render(<StrategyPage />);
    fireEvent.change(screen.getByLabelText("案件名稱 *"), {
      target: { value: "食農教育推廣計畫" },
    });
    fireEvent.click(screen.getByRole("button", { name: "開始分析" }));
    expect(screen.getByTestId("fit-score-card")).toBeTruthy();

    // 再修改 caseName → submitted 設為 false → FitScoreCard 消失
    fireEvent.change(screen.getByLabelText("案件名稱 *"), {
      target: { value: "新案件名稱" },
    });
    expect(screen.queryByTestId("fit-score-card")).toBeNull();
  });
});
