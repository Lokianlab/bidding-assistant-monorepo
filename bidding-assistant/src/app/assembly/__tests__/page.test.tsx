import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import AssemblyPage from "../page";

// ── Hoisted mocks ─────────────────────────────────────
const { mockSearchGet } = vi.hoisted(() => ({
  mockSearchGet: vi.fn(() => null),
}));

// ── Mock next/navigation ──────────────────────────────
vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: mockSearchGet }),
}));

// ── Mock sonner ───────────────────────────────────────
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// ── Mock Sidebar ──────────────────────────────────────
vi.mock("@/components/layout/Sidebar", () => ({
  MobileMenuButton: () => <button data-testid="mobile-menu-btn">選單</button>,
}));

// ── Mock useKnowledgeBase ─────────────────────────────
// 必須使用穩定物件參考：assembly page 有 useEffect([kbData, kbHydrated])，
// 若每次渲染回傳新物件會觸發無限重渲染循環導致 OOM 崩潰
const stableKbData = { "00A": [], "00B": [], "00C": [], "00D": [], "00E": [] };
const stableKbResult = { data: stableKbData, hydrated: true };

vi.mock("@/lib/knowledge-base/useKnowledgeBase", () => ({
  useKnowledgeBase: vi.fn(() => stableKbResult),
}));

// ── Mock renderKBToMarkdown ───────────────────────────
vi.mock("@/lib/knowledge-base/helpers", () => ({
  renderKBToMarkdown: vi.fn(() => ""),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockSearchGet.mockReturnValue(null);
  Object.assign(navigator, {
    clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
});

// ── Tests ─────────────────────────────────────────────

describe("AssemblyPage — 基本渲染", () => {
  it("顯示「提示詞組裝引擎」標題", () => {
    render(<AssemblyPage />);
    expect(
      screen.getByRole("heading", { name: "提示詞組裝引擎" }),
    ).toBeTruthy();
  });

  it("顯示副標說明文字", () => {
    render(<AssemblyPage />);
    expect(
      screen.getByText(/選擇階段.*自動選取.*一鍵複製到 Claude/),
    ).toBeTruthy();
  });

  it("顯示 MobileMenuButton", () => {
    render(<AssemblyPage />);
    expect(screen.getByTestId("mobile-menu-btn")).toBeTruthy();
  });

  it("顯示「選擇階段」卡片標題", () => {
    render(<AssemblyPage />);
    expect(screen.getByText("選擇階段")).toBeTruthy();
  });

  it("顯示「投標階段」分組標籤", () => {
    render(<AssemblyPage />);
    expect(screen.getByText("投標階段")).toBeTruthy();
  });

  it("顯示「評選階段」分組標籤", () => {
    render(<AssemblyPage />);
    expect(screen.getByText("評選階段")).toBeTruthy();
  });

  it("顯示「案件唯一碼（選填）」標籤", () => {
    render(<AssemblyPage />);
    expect(screen.getByText("案件唯一碼（選填）")).toBeTruthy();
  });

  it("顯示「組裝提示詞」按鈕", () => {
    render(<AssemblyPage />);
    expect(screen.getByRole("button", { name: /組裝提示詞/ })).toBeTruthy();
  });

  it("顯示「使用方式」提示卡", () => {
    render(<AssemblyPage />);
    expect(screen.getByText("使用方式")).toBeTruthy();
  });

  it("無 caseName 時不顯示評分 badge", () => {
    render(<AssemblyPage />);
    expect(screen.queryByText(/建議投標|值得評估|不建議/)).toBeNull();
  });
});

describe("AssemblyPage — 案件上下文 banner", () => {
  it("caseName 存在時顯示案件名稱", () => {
    mockSearchGet.mockImplementation((key: string) => {
      if (key === "caseName") return "測試標案名稱";
      return null;
    });
    render(<AssemblyPage />);
    expect(screen.getByText("測試標案名稱")).toBeTruthy();
  });

  it("verdict 和 total 存在時顯示評分 badge", () => {
    mockSearchGet.mockImplementation((key: string) => {
      if (key === "caseName") return "某標案";
      if (key === "verdict") return "建議投標";
      if (key === "total") return "82";
      return null;
    });
    render(<AssemblyPage />);
    expect(screen.getByText("建議投標 82/100")).toBeTruthy();
  });
});
