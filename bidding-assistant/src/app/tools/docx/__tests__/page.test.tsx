import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DocxPage from "../page";
import { DEFAULT_SETTINGS } from "@/lib/settings/defaults";
import { useSettings } from "@/lib/context/settings-context";

// ── Mock useSettings ──────────────────────────────────────
vi.mock("@/lib/context/settings-context", () => ({
  useSettings: vi.fn(() => ({ settings: DEFAULT_SETTINGS })),
}));

// ── Hoisted mocks ─────────────────────────────────────────
const { mockGenerateDocx, mockDownloadBlob, mockToast } = vi.hoisted(() => ({
  mockGenerateDocx: vi.fn(() => Promise.resolve(new Blob(["test"]))),
  mockDownloadBlob: vi.fn(),
  mockToast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// ── Mock docgen（避免實際生成 docx）──────────────────────
vi.mock("@/lib/docgen/generate-docx", () => ({
  generateDocx: (...args: unknown[]) => mockGenerateDocx(...args),
  downloadBlob: (...args: unknown[]) => mockDownloadBlob(...args),
}));

// ── Mock sonner ────────────────────────────────────────────
vi.mock("sonner", () => ({
  toast: mockToast,
}));

// ── Mock Accordion（避免 Radix 的動畫問題）────────────────
vi.mock("@/components/ui/accordion", () => ({
  Accordion: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AccordionItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AccordionTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AccordionContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
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
});

// ── Tests ─────────────────────────────────────────────────

describe("DocxPage — 渲染", () => {
  it("顯示頁面標題「文件生成」", () => {
    render(<DocxPage />);
    expect(screen.getByRole("heading", { name: "文件生成" })).toBeTruthy();
  });

  it("顯示頁面說明文字", () => {
    render(<DocxPage />);
    expect(screen.getByText(/將各階段 AI 產出的內容貼入對應章節/)).toBeTruthy();
  });

  it("顯示「案名」輸入框", () => {
    render(<DocxPage />);
    expect(screen.getByPlaceholderText("輸入標案名稱...")).toBeTruthy();
  });

  it("顯示「文件資訊」卡片", () => {
    render(<DocxPage />);
    expect(screen.getByText("文件資訊")).toBeTruthy();
  });

  it("顯示「文件摘要」卡片", () => {
    render(<DocxPage />);
    expect(screen.getByText("文件摘要")).toBeTruthy();
  });

  it("顯示「生成 DOCX」按鈕", () => {
    render(<DocxPage />);
    expect(screen.getByRole("button", { name: "生成 DOCX" })).toBeTruthy();
  });

  it("顯示初始 5 個章節標題", () => {
    render(<DocxPage />);
    expect(screen.getByText("第壹章 計畫緣起與目的")).toBeTruthy();
    expect(screen.getByText("第貳章 工作內容與方法")).toBeTruthy();
    expect(screen.getByText("第參章 組織架構與人力配置")).toBeTruthy();
    expect(screen.getByText("第肆章 預定工作進度")).toBeTruthy();
    expect(screen.getByText("第伍章 經費概算")).toBeTruthy();
  });

  it("顯示「新增章節」按鈕", () => {
    render(<DocxPage />);
    expect(screen.getByRole("button", { name: "新增章節" })).toBeTruthy();
  });

  it("顯示「章節數」和「總字數」統計", () => {
    render(<DocxPage />);
    expect(screen.getByText("章節數")).toBeTruthy();
    expect(screen.getByText("總字數")).toBeTruthy();
  });

  it("顯示文件格式設定（字型、紙張、行距）", () => {
    render(<DocxPage />);
    expect(screen.getByText("字型")).toBeTruthy();
    expect(screen.getByText("紙張")).toBeTruthy();
    expect(screen.getByText("行距")).toBeTruthy();
    // 預設值
    expect(screen.getByText("標楷體")).toBeTruthy();
    expect(screen.getByText("A4")).toBeTruthy();
    expect(screen.getByText("1.5")).toBeTruthy();
  });

  it("初始章節數顯示為 5", () => {
    render(<DocxPage />);
    // 章節數 "5" 出現在多處（badge + 摘要），用 getAllByText 確認至少有一處
    expect(screen.getAllByText("5").length).toBeGreaterThan(0);
  });

  it("顯示「輸出格式」為 DOCX", () => {
    render(<DocxPage />);
    expect(screen.getByText("DOCX")).toBeTruthy();
  });
});

describe("DocxPage — 互動", () => {
  it("點「新增章節」後出現新章節標題", () => {
    render(<DocxPage />);
    fireEvent.click(screen.getByRole("button", { name: "新增章節" }));
    expect(screen.getByText("第6章 新章節")).toBeTruthy();
  });

  it("輸入案名後值更新", () => {
    render(<DocxPage />);
    const input = screen.getByPlaceholderText("輸入標案名稱...");
    fireEvent.change(input, { target: { value: "測試標案" } });
    expect((input as HTMLInputElement).value).toBe("測試標案");
  });

  it("案名為空時點「生成 DOCX」會呼叫 toast.error", async () => {
    render(<DocxPage />);
    fireEvent.click(screen.getByRole("button", { name: "生成 DOCX" }));
    expect(mockToast.error).toHaveBeenCalledWith("請輸入案名");
  });

  it("有案名但章節無內容時點「生成 DOCX」會呼叫 toast.error", async () => {
    render(<DocxPage />);
    fireEvent.change(screen.getByPlaceholderText("輸入標案名稱..."), {
      target: { value: "測試標案" },
    });
    fireEvent.click(screen.getByRole("button", { name: "生成 DOCX" }));
    expect(mockToast.error).toHaveBeenCalledWith("請至少在一個章節中輸入內容");
  });

  it("章節有「刪除章節」按鈕", () => {
    render(<DocxPage />);
    const deleteBtns = screen.getAllByRole("button", { name: "刪除章節" });
    expect(deleteBtns.length).toBe(5);
  });

  it("點「刪除章節」後章節減少", () => {
    render(<DocxPage />);
    const deleteBtns = screen.getAllByRole("button", { name: "刪除章節" });
    fireEvent.click(deleteBtns[0]);
    // 刪掉一個，剩 4 個刪除按鈕
    expect(screen.getAllByRole("button", { name: "刪除章節" }).length).toBe(4);
  });

  it("章節有上移/下移按鈕", () => {
    render(<DocxPage />);
    expect(screen.getAllByRole("button", { name: "上移" }).length).toBe(5);
    expect(screen.getAllByRole("button", { name: "下移" }).length).toBe(5);
  });
});
