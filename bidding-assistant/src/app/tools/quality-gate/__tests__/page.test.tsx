import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import QualityGatePage from "../page";

// ── Hoisted mocks ─────────────────────────────────────────
const { mockAnalyze, mockClear } = vi.hoisted(() => ({
  mockAnalyze: vi.fn(),
  mockClear: vi.fn(),
}));

// ── Mock useQualityGate ────────────────────────────────────
const mockUseQualityGate = vi.fn(() => ({
  report: null as Record<string, unknown> | null,
  isAnalyzing: false,
  analyze: mockAnalyze,
  clear: mockClear,
}));

vi.mock("@/lib/quality-gate/useQualityGate", () => ({
  useQualityGate: () => mockUseQualityGate(),
}));

// ── Mock 子元件 ────────────────────────────────────────────
vi.mock("@/components/quality-gate/QualityGateDashboard", () => ({
  QualityGateDashboard: () => (
    <div data-testid="quality-gate-dashboard">品質閘門報告</div>
  ),
}));

vi.mock("@/components/layout/Sidebar", () => ({
  MobileMenuButton: () => <button data-testid="mobile-menu-btn">選單</button>,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockUseQualityGate.mockReturnValue({
    report: null,
    isAnalyzing: false,
    analyze: mockAnalyze,
    clear: mockClear,
  });
});

// ── Tests ─────────────────────────────────────────────────

describe("QualityGatePage — 渲染", () => {
  it("顯示頁面標題「品質閘門」", () => {
    render(<QualityGatePage />);
    expect(screen.getByRole("heading", { name: "品質閘門" })).toBeTruthy();
  });

  it("顯示頁面說明文字", () => {
    render(<QualityGatePage />);
    expect(screen.getByText(/四道檢查/)).toBeTruthy();
  });

  it("顯示 textarea 輸入區", () => {
    render(<QualityGatePage />);
    expect(screen.getByRole("textbox")).toBeTruthy();
  });

  it("textarea 無內容時「開始檢查」按鈕 disabled", () => {
    render(<QualityGatePage />);
    const btn = screen.getByRole("button", {
      name: "開始檢查",
    }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });
});

describe("QualityGatePage — 表單互動", () => {
  it("輸入文字後「開始檢查」按鈕 enabled", () => {
    render(<QualityGatePage />);
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "這是一段測試文字" },
    });
    const btn = screen.getByRole("button", {
      name: "開始檢查",
    }) as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  it("點「開始檢查」後呼叫 analyze", () => {
    render(<QualityGatePage />);
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "這是一段測試文字" },
    });
    fireEvent.click(screen.getByRole("button", { name: "開始檢查" }));
    expect(mockAnalyze).toHaveBeenCalledTimes(1);
    expect(mockAnalyze).toHaveBeenCalledWith({ text: "這是一段測試文字" });
  });

  it("isAnalyzing=true 時按鈕文字改為「分析中...」且 disabled", () => {
    mockUseQualityGate.mockReturnValue({
      report: null,
      isAnalyzing: true,
      analyze: mockAnalyze,
      clear: mockClear,
    });
    render(<QualityGatePage />);
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "內容" },
    });
    const btn = screen.getByRole("button", {
      name: "分析中...",
    }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });
});

describe("QualityGatePage — 報告顯示", () => {
  it("report 存在時顯示 QualityGateDashboard", () => {
    mockUseQualityGate.mockReturnValue({
      report: { overall: "pass" },
      isAnalyzing: false,
      analyze: mockAnalyze,
      clear: mockClear,
    });
    render(<QualityGatePage />);
    expect(screen.getByTestId("quality-gate-dashboard")).toBeTruthy();
  });

  it("report 存在時顯示「清除結果」按鈕", () => {
    mockUseQualityGate.mockReturnValue({
      report: { overall: "pass" },
      isAnalyzing: false,
      analyze: mockAnalyze,
      clear: mockClear,
    });
    render(<QualityGatePage />);
    expect(screen.getByRole("button", { name: "清除結果" })).toBeTruthy();
  });

  it("點「清除結果」呼叫 clear", () => {
    mockUseQualityGate.mockReturnValue({
      report: { overall: "pass" },
      isAnalyzing: false,
      analyze: mockAnalyze,
      clear: mockClear,
    });
    render(<QualityGatePage />);
    fireEvent.click(screen.getByRole("button", { name: "清除結果" }));
    expect(mockClear).toHaveBeenCalledTimes(1);
  });

  it("report 存在時顯示「匯出文件」連結按鈕", () => {
    mockUseQualityGate.mockReturnValue({
      report: { overall: "pass" },
      isAnalyzing: false,
      analyze: mockAnalyze,
      clear: mockClear,
    });
    render(<QualityGatePage />);
    expect(
      screen.getByRole("link", { name: "匯出文件（進入文件生成）" }),
    ).toBeTruthy();
  });

  it("report 為 null 時不顯示 QualityGateDashboard", () => {
    render(<QualityGatePage />);
    expect(screen.queryByTestId("quality-gate-dashboard")).toBeNull();
  });
});
