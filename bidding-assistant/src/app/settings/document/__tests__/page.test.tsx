import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DocumentSettingsPage from "../page";
import { DEFAULT_SETTINGS } from "@/lib/settings/defaults";
import { useSettings } from "@/lib/context/settings-context";

// ── Hoisted mocks（在 vi.mock 工廠提升前初始化）─────────────
const { mockUpdateSection, mockToastSuccess, mockToastError } = vi.hoisted(() => ({
  mockUpdateSection: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}));

// ── Mock useSettings ──────────────────────────────────────
vi.mock("@/lib/context/settings-context", () => ({
  useSettings: vi.fn(() => ({
    settings: DEFAULT_SETTINGS,
    hydrated: true,
    updateSection: mockUpdateSection,
  })),
}));

// ── Mock sonner ───────────────────────────────────────────
vi.mock("sonner", () => ({
  toast: { success: mockToastSuccess, error: mockToastError },
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useSettings).mockReturnValue({
    settings: DEFAULT_SETTINGS,
    hydrated: true,
    updateSection: mockUpdateSection,
  } as unknown as ReturnType<typeof useSettings>);
});

// ── Tests ─────────────────────────────────────────────────

describe("DocumentSettingsPage — 渲染", () => {
  it("顯示頁面標題", () => {
    render(<DocumentSettingsPage />);
    expect(screen.getByText("輸出文件設定")).toBeTruthy();
  });

  it("顯示字型設定區塊", () => {
    render(<DocumentSettingsPage />);
    expect(screen.getByText("字型")).toBeTruthy();
  });

  it("顯示字級設定區塊", () => {
    render(<DocumentSettingsPage />);
    expect(screen.getByText("字級（pt）")).toBeTruthy();
  });

  it("顯示頁面設定區塊", () => {
    render(<DocumentSettingsPage />);
    expect(screen.getByText("頁面")).toBeTruthy();
  });

  it("顯示頁首/頁尾設定區塊", () => {
    render(<DocumentSettingsPage />);
    expect(screen.getByText("頁首 / 頁尾")).toBeTruthy();
  });
});

describe("DocumentSettingsPage — 自訂字型管理", () => {
  it("可新增自訂字型", () => {
    render(<DocumentSettingsPage />);
    const fontInput = screen.getByPlaceholderText("輸入字型名稱...");
    fireEvent.change(fontInput, { target: { value: "思源黑體" } });
    fireEvent.click(screen.getByText("新增字型"));
    expect(screen.getByText(/思源黑體/)).toBeTruthy();
    expect(mockToastSuccess).toHaveBeenCalledWith('已新增自訂字型「思源黑體」');
  });

  it("可用 Enter 鍵新增自訂字型", () => {
    render(<DocumentSettingsPage />);
    const fontInput = screen.getByPlaceholderText("輸入字型名稱...");
    fireEvent.change(fontInput, { target: { value: "王漢宗字型" } });
    fireEvent.keyDown(fontInput, { key: "Enter" });
    expect(screen.getByText(/王漢宗字型/)).toBeTruthy();
  });

  it("新增後清空輸入框", () => {
    render(<DocumentSettingsPage />);
    const fontInput = screen.getByPlaceholderText("輸入字型名稱...") as HTMLInputElement;
    fireEvent.change(fontInput, { target: { value: "新字型" } });
    fireEvent.click(screen.getByText("新增字型"));
    expect(fontInput.value).toBe("");
  });

  it("不允許新增重複字型（顯示 error toast）", () => {
    render(<DocumentSettingsPage />);
    const fontInput = screen.getByPlaceholderText("輸入字型名稱...");
    fireEvent.change(fontInput, { target: { value: "重複字型" } });
    fireEvent.click(screen.getByText("新增字型"));
    fireEvent.change(fontInput, { target: { value: "重複字型" } });
    fireEvent.click(screen.getByText("新增字型"));
    expect(mockToastError).toHaveBeenCalledWith("此字型已存在");
  });

  it("不允許新增空白字型名稱", () => {
    render(<DocumentSettingsPage />);
    const fontInput = screen.getByPlaceholderText("輸入字型名稱...");
    fireEvent.change(fontInput, { target: { value: "   " } });
    fireEvent.click(screen.getByText("新增字型"));
    expect(mockToastSuccess).not.toHaveBeenCalled();
  });

  it("可移除自訂字型（點擊 badge）", () => {
    render(<DocumentSettingsPage />);
    const fontInput = screen.getByPlaceholderText("輸入字型名稱...");
    fireEvent.change(fontInput, { target: { value: "可刪字型" } });
    fireEvent.click(screen.getByText("新增字型"));
    expect(screen.getByText(/可刪字型/)).toBeTruthy();

    // 點擊 badge 移除字型
    const badge = screen.getByText(/可刪字型/);
    fireEvent.click(badge);
    expect(screen.queryByText(/可刪字型 ×/)).toBeNull();
  });
});

describe("DocumentSettingsPage — 儲存與取消", () => {
  it("點儲存呼叫 updateSection('document', ...)", () => {
    render(<DocumentSettingsPage />);
    fireEvent.click(screen.getByText("儲存文件設定"));
    expect(mockUpdateSection).toHaveBeenCalledTimes(1);
    expect(mockUpdateSection).toHaveBeenCalledWith("document", DEFAULT_SETTINGS.document);
  });

  it("點儲存顯示成功 toast", () => {
    render(<DocumentSettingsPage />);
    fireEvent.click(screen.getByText("儲存文件設定"));
    expect(mockToastSuccess).toHaveBeenCalledWith("文件設定已儲存");
  });

  it("新增字型後點儲存傳送更新後的 document", () => {
    render(<DocumentSettingsPage />);
    const fontInput = screen.getByPlaceholderText("輸入字型名稱...");
    fireEvent.change(fontInput, { target: { value: "新增字型A" } });
    fireEvent.click(screen.getByText("新增字型"));
    fireEvent.click(screen.getByText("儲存文件設定"));

    expect(mockUpdateSection).toHaveBeenCalledWith(
      "document",
      expect.objectContaining({
        fonts: expect.objectContaining({
          customFonts: expect.arrayContaining([
            expect.objectContaining({ name: "新增字型A" }),
          ]),
        }),
      })
    );
  });

  it("點取消還原 doc 到設定值（無自訂字型）", () => {
    render(<DocumentSettingsPage />);
    const fontInput = screen.getByPlaceholderText("輸入字型名稱...");
    fireEvent.change(fontInput, { target: { value: "暫時字型" } });
    fireEvent.click(screen.getByText("新增字型"));
    expect(screen.getByText(/暫時字型/)).toBeTruthy();

    fireEvent.click(screen.getByText("取消"));
    expect(screen.queryByText(/暫時字型 ×/)).toBeNull();
  });

  it("點取消不呼叫 updateSection", () => {
    render(<DocumentSettingsPage />);
    fireEvent.click(screen.getByText("取消"));
    expect(mockUpdateSection).not.toHaveBeenCalled();
  });
});
