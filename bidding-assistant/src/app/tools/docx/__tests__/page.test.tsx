import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DocxPage from "../page";
import { DEFAULT_SETTINGS } from "@/lib/settings/defaults";
import { useSettings } from "@/lib/context/settings-context";

// ── Mock useSettings ──────────────────────────────────────
vi.mock("@/lib/context/settings-context", () => ({
  useSettings: vi.fn(() => ({ settings: DEFAULT_SETTINGS })),
}));

// ── Mock docgen（避免實際生成 docx）──────────────────────
vi.mock("@/lib/docgen/generate-docx", () => ({
  generateDocx: vi.fn(() => Promise.resolve(new Blob(["test"]))),
  downloadBlob: vi.fn(),
}));

// ── Mock sonner ────────────────────────────────────────────
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useSettings).mockReturnValue({
    settings: DEFAULT_SETTINGS,
  } as unknown as ReturnType<typeof useSettings>);
});

// ── Tests ─────────────────────────────────────────────────

describe("DocxPage — 渲染", () => {
  it("顯示頁面標題「文件生成」", () => {
    render(<DocxPage />);
    expect(screen.getByRole("heading", { name: "文件生成" })).toBeTruthy();
  });

  it("顯示「案名」輸入框", () => {
    render(<DocxPage />);
    expect(screen.getByPlaceholderText("輸入標案名稱...")).toBeTruthy();
  });

  it("顯示「文件摘要」卡片", () => {
    render(<DocxPage />);
    expect(screen.getByText("文件摘要")).toBeTruthy();
  });

  it("顯示「生成 DOCX」按鈕", () => {
    render(<DocxPage />);
    expect(screen.getByRole("button", { name: "生成 DOCX" })).toBeTruthy();
  });

  it("顯示初始章節（第壹章標題）", () => {
    render(<DocxPage />);
    // 初始章節中有「第壹章 計畫緣起與目的」
    expect(screen.getByText("第壹章 計畫緣起與目的")).toBeTruthy();
  });

  it("顯示「章節數」統計", () => {
    render(<DocxPage />);
    expect(screen.getByText("章節數")).toBeTruthy();
  });

  it("顯示「新增章節」按鈕", () => {
    render(<DocxPage />);
    expect(screen.getByRole("button", { name: "新增章節" })).toBeTruthy();
  });
});

describe("DocxPage — 互動", () => {
  it("點「新增章節」後出現新章節標題", () => {
    render(<DocxPage />);
    fireEvent.click(screen.getByRole("button", { name: "新增章節" }));
    // 第 6 章的章節標題
    expect(screen.getByText("第6章 新章節")).toBeTruthy();
  });
});
