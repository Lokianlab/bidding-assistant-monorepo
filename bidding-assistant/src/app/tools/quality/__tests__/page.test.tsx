import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import QualityPage from "../page";
import { DEFAULT_SETTINGS } from "@/lib/settings/defaults";
import { useSettings } from "@/lib/context/settings-context";

// ── Mock useSettings ──────────────────────────────────────
vi.mock("@/lib/context/settings-context", () => ({
  useSettings: vi.fn(() => ({ settings: DEFAULT_SETTINGS })),
}));

// ── Mock quality 模組（避免依賴真實規則引擎）──────────────
const mockRunChecks = vi.fn(() => []);
const mockCalculateScore = vi.fn(() => ({ value: 85, label: "良好", errorCount: 0, warningCount: 0, infoCount: 0 }));

vi.mock("@/lib/quality/rules", () => ({
  runChecks: (...args: unknown[]) => mockRunChecks(...args),
}));

vi.mock("@/lib/quality/score", () => ({
  calculateScore: (...args: unknown[]) => mockCalculateScore(...args),
}));

vi.mock("@/lib/quality/constants", () => ({
  IRON_LAW_LABELS: {
    crossValidateNumbers: "數據交叉驗證",
    budgetConsistency: "預算一致性",
    dateConsistency: "日期一致性",
    teamConsistency: "人力一致性",
    scopeConsistency: "範圍一致性",
  },
}));

// ── Mock Sidebar ──────────────────────────────────────────
vi.mock("@/components/layout/Sidebar", () => ({
  MobileMenuButton: () => <button data-testid="mobile-menu-btn">選單</button>,
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useSettings).mockReturnValue({
    settings: DEFAULT_SETTINGS,
  } as unknown as ReturnType<typeof useSettings>);
  mockRunChecks.mockReturnValue([]);
  mockCalculateScore.mockReturnValue({ value: 85, label: "良好", errorCount: 0, warningCount: 0, infoCount: 0 });
});

// ── Tests ─────────────────────────────────────────────────

describe("QualityPage — 渲染", () => {
  it("顯示頁面標題「品質檢查」", () => {
    render(<QualityPage />);
    expect(screen.getByRole("heading", { name: "品質檢查" })).toBeTruthy();
  });

  it("顯示頁面說明文字", () => {
    render(<QualityPage />);
    expect(screen.getByText(/檢查禁用詞/)).toBeTruthy();
  });

  it("顯示 textarea 輸入區", () => {
    render(<QualityPage />);
    expect(screen.getByRole("textbox")).toBeTruthy();
  });

  it("textarea 無內容時「執行檢查」按鈕 disabled", () => {
    render(<QualityPage />);
    const btn = screen.getByRole("button", {
      name: "執行檢查",
    }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it("顯示「待檢文字」卡片", () => {
    render(<QualityPage />);
    expect(screen.getByText("待檢文字")).toBeTruthy();
  });

  it("顯示「檢查規則」卡片（右側）", () => {
    render(<QualityPage />);
    expect(screen.getByText("檢查規則")).toBeTruthy();
  });

  it("顯示禁用詞、用語對照、自訂規則的統計數字", () => {
    render(<QualityPage />);
    expect(screen.getByText("禁用詞清單")).toBeTruthy();
    expect(screen.getByText("用語對照")).toBeTruthy();
    expect(screen.getByText("自訂規則")).toBeTruthy();
  });

  it("顯示鐵律檢查項目標籤", () => {
    render(<QualityPage />);
    expect(screen.getByText("鐵律檢查")).toBeTruthy();
    expect(screen.getByText("數據交叉驗證")).toBeTruthy();
    expect(screen.getByText("預算一致性")).toBeTruthy();
  });

  it("顯示字數為 0（初始狀態）", () => {
    render(<QualityPage />);
    expect(screen.getByText("0 字")).toBeTruthy();
  });
});

describe("QualityPage — 互動", () => {
  it("輸入文字後「執行檢查」按鈕 enabled", () => {
    render(<QualityPage />);
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "這是測試文字" },
    });
    const btn = screen.getByRole("button", {
      name: "執行檢查",
    }) as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  it("輸入文字後字數更新", () => {
    render(<QualityPage />);
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "測試" },
    });
    expect(screen.getByText("2 字")).toBeTruthy();
  });

  it("點「執行檢查」後呼叫 runChecks", () => {
    render(<QualityPage />);
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "這是測試文字" },
    });
    fireEvent.click(screen.getByRole("button", { name: "執行檢查" }));
    expect(mockRunChecks).toHaveBeenCalledTimes(1);
  });

  it("點「執行檢查」後顯示「檢查結果」卡片", () => {
    render(<QualityPage />);
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "這是測試文字" },
    });
    fireEvent.click(screen.getByRole("button", { name: "執行檢查" }));
    expect(screen.getByText("檢查結果")).toBeTruthy();
  });

  it("點「執行檢查」後顯示錯誤/警告/提示統計 badge", () => {
    mockRunChecks.mockReturnValue([
      { type: "error", rule: "blacklist", message: "禁用詞" },
      { type: "warning", rule: "terminology", message: "用語修正" },
      { type: "info", rule: "length", message: "段落偏長" },
    ]);
    render(<QualityPage />);
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "這是測試文字" },
    });
    fireEvent.click(screen.getByRole("button", { name: "執行檢查" }));
    expect(screen.getByText("1 錯誤")).toBeTruthy();
    expect(screen.getByText("1 警告")).toBeTruthy();
    expect(screen.getByText("1 提示")).toBeTruthy();
  });

  it("無問題時顯示「通過所有檢查」", () => {
    mockRunChecks.mockReturnValue([]);
    render(<QualityPage />);
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "這是測試文字" },
    });
    fireEvent.click(screen.getByRole("button", { name: "執行檢查" }));
    expect(screen.getByText("通過所有檢查")).toBeTruthy();
  });

  it("修改文字後 checked 重置（檢查結果消失）", () => {
    render(<QualityPage />);
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "這是測試文字" },
    });
    fireEvent.click(screen.getByRole("button", { name: "執行檢查" }));
    expect(screen.getByText("檢查結果")).toBeTruthy();

    // 再修改文字 → checked=false → 結果消失
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "修改後的文字" },
    });
    expect(screen.queryByText("檢查結果")).toBeNull();
  });

  it("檢查後顯示品質分數", () => {
    mockCalculateScore.mockReturnValue({ value: 92, label: "優秀", errorCount: 0, warningCount: 0, infoCount: 0 });
    render(<QualityPage />);
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "這是測試文字" },
    });
    fireEvent.click(screen.getByRole("button", { name: "執行檢查" }));
    expect(screen.getByText("品質分數")).toBeTruthy();
    expect(screen.getByText("92")).toBeTruthy();
  });
});
