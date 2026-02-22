import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import ModulesPage from "../page";
import { DEFAULT_SETTINGS } from "@/lib/settings/defaults";
import { useSettings } from "@/lib/context/settings-context";

// ── Hoisted mocks ─────────────────────────────────────────
const { mockUpdateSection, mockUpdateSettings, mockToastSuccess } = vi.hoisted(() => ({
  mockUpdateSection: vi.fn(),
  mockUpdateSettings: vi.fn(),
  mockToastSuccess: vi.fn(),
}));

// ── Mock useSettings ──────────────────────────────────────
vi.mock("@/lib/context/settings-context", () => ({
  useSettings: vi.fn(() => ({
    settings: DEFAULT_SETTINGS,
    hydrated: true,
    updateSection: mockUpdateSection,
    updateSettings: mockUpdateSettings,
  })),
}));

// ── Mock sonner ───────────────────────────────────────────
vi.mock("sonner", () => ({ toast: { success: mockToastSuccess, error: vi.fn() } }));

// ── Mock Select（KB matrix 有大量 Select，jsdom 裡不確定性高）──
vi.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => (
    <div data-value={value}>{children}</div>
  ),
}));

// ── Mock Tabs（讓所有 TabsContent 永遠渲染，可測各 tab 內容）──
vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => (
    <div role="tablist">{children}</div>
  ),
  TabsTrigger: ({
    value,
    children,
  }: {
    value: string;
    children: React.ReactNode;
  }) => <button role="tab" data-value={value}>{children}</button>,
  TabsContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// ── Mock sub-components（避免依賴複雜）───────────────────
vi.mock("@/components/settings/FeatureToggleCard", () => ({
  FeatureToggleCard: ({ feature, enabled }: { feature: { name: string }; enabled: boolean }) => (
    <div data-testid={`toggle-${feature.name}`} data-enabled={String(enabled)}>
      {feature.name}
    </div>
  ),
}));

vi.mock("@/components/settings/FieldMappingEditor", () => ({
  FieldMappingEditor: () => <div data-testid="field-mapping-editor">欄位對照編輯器</div>,
}));

vi.mock("@/components/scan/KeywordManager", () => ({
  KeywordManager: ({ keywords }: { keywords: string[] }) => (
    <div data-testid="keyword-manager">{keywords.length} 個關鍵字</div>
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useSettings).mockReturnValue({
    settings: DEFAULT_SETTINGS,
    hydrated: true,
    updateSection: mockUpdateSection,
    updateSettings: mockUpdateSettings,
  } as unknown as ReturnType<typeof useSettings>);
});

// ── Tests ─────────────────────────────────────────────────

describe("ModulesPage — 渲染", () => {
  it("顯示頁面標題", () => {
    render(<ModulesPage />);
    expect(screen.getByRole("heading", { name: "功能模組管理" })).toBeTruthy();
  });

  it("顯示六個 tab 按鈕", () => {
    render(<ModulesPage />);
    expect(screen.getByRole("tab", { name: "功能開關" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "欄位對照" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "知識庫矩陣" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "品質規則" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "報價參數" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "巡標關鍵字" })).toBeTruthy();
  });

  it("渲染功能開關 section（核心功能）", () => {
    render(<ModulesPage />);
    expect(screen.getByText("核心功能")).toBeTruthy();
  });

  it("渲染 FieldMappingEditor", () => {
    render(<ModulesPage />);
    expect(screen.getByTestId("field-mapping-editor")).toBeTruthy();
  });

  it("渲染 KeywordManager", () => {
    render(<ModulesPage />);
    expect(screen.getByTestId("keyword-manager")).toBeTruthy();
  });
});

describe("ModulesPage — 功能開關", () => {
  it("渲染所有功能 toggle card（含備標指揮部）", () => {
    render(<ModulesPage />);
    expect(screen.getByText("備標指揮部")).toBeTruthy();
  });

  it("點儲存功能開關呼叫 updateSettings with featureToggles", () => {
    render(<ModulesPage />);
    fireEvent.click(screen.getByRole("button", { name: "儲存功能開關" }));
    expect(mockUpdateSettings).toHaveBeenCalledWith(
      expect.objectContaining({ featureToggles: expect.any(Object) }),
    );
    expect(mockToastSuccess).toHaveBeenCalledWith("功能開關已儲存，側欄已更新");
  });
});

describe("ModulesPage — 品質規則", () => {
  it("顯示鐵律檢查區塊", () => {
    render(<ModulesPage />);
    expect(screen.getByText("鐵律檢查")).toBeTruthy();
  });

  it("顯示五個鐵律 checkbox", () => {
    render(<ModulesPage />);
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes.length).toBe(5);
  });

  it("鐵律 checkbox 初始狀態為 checked（預設全啟用）", () => {
    render(<ModulesPage />);
    const checkboxes = screen.getAllByRole("checkbox");
    checkboxes.forEach((cb) => {
      expect(cb.getAttribute("data-state")).toBe("checked");
    });
  });

  it("點鐵律 checkbox 可切換狀態", () => {
    render(<ModulesPage />);
    const firstCheckbox = screen.getAllByRole("checkbox")[0];
    fireEvent.click(firstCheckbox);
    expect(firstCheckbox.getAttribute("data-state")).toBe("unchecked");
  });

  it("顯示禁用詞清單（含預設禁用詞「豐富的經驗」）", () => {
    render(<ModulesPage />);
    expect(screen.getByText(/豐富的經驗/)).toBeTruthy();
  });

  it("按 Enter 可新增禁用詞", () => {
    render(<ModulesPage />);
    const input = screen.getByPlaceholderText("新增禁用詞...");
    fireEvent.change(input, { target: { value: "測試禁用詞" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByText(/測試禁用詞/)).toBeTruthy();
  });

  it("顯示用語修正對照表（含「貴單位」→「貴機關」）", () => {
    render(<ModulesPage />);
    expect(screen.getByText("貴單位")).toBeTruthy();
    expect(screen.getByText("貴機關")).toBeTruthy();
  });

  it("點儲存模組參數（品質規則）呼叫 updateSection", () => {
    render(<ModulesPage />);
    // 多個儲存模組參數按鈕（品質規則/知識庫矩陣/報價參數各一）
    const saveBtns = screen.getAllByRole("button", { name: "儲存模組參數" });
    fireEvent.click(saveBtns[0]);
    expect(mockUpdateSection).toHaveBeenCalledWith("modules", expect.any(Object));
    expect(mockToastSuccess).toHaveBeenCalledWith("模組參數已儲存");
  });
});

describe("ModulesPage — 報價參數", () => {
  it("顯示稅率輸入（含預設值 0.05）", () => {
    render(<ModulesPage />);
    expect(screen.getByText("營業稅率")).toBeTruthy();
    const taxInputs = screen.getAllByRole("spinbutton");
    const taxInput = taxInputs.find(
      (el) => (el as HTMLInputElement).value === "0.05",
    );
    expect(taxInput).toBeTruthy();
  });

  it("修改稅率後點儲存傳入新值", () => {
    render(<ModulesPage />);
    const taxInputs = screen.getAllByRole("spinbutton");
    const taxInput = taxInputs.find(
      (el) => (el as HTMLInputElement).value === "0.05",
    ) as HTMLInputElement;
    fireEvent.change(taxInput, { target: { value: "0.08" } });
    const saveBtns = screen.getAllByRole("button", { name: "儲存模組參數" });
    fireEvent.click(saveBtns[0]);
    expect(mockUpdateSection).toHaveBeenCalledWith(
      "modules",
      expect.objectContaining({
        pricing: expect.objectContaining({ taxRate: 0.08 }),
      }),
    );
  });
});

describe("ModulesPage — 巡標關鍵字", () => {
  it("點儲存關鍵字呼叫 updateSettings with scan", () => {
    render(<ModulesPage />);
    fireEvent.click(screen.getByRole("button", { name: "儲存關鍵字" }));
    expect(mockUpdateSettings).toHaveBeenCalledWith(
      expect.objectContaining({ scan: expect.any(Object) }),
    );
    expect(mockToastSuccess).toHaveBeenCalledWith("巡標關鍵字已儲存");
  });
});

describe("ModulesPage — 欄位對照", () => {
  it("點儲存欄位對照呼叫 updateSettings with fieldMapping", () => {
    render(<ModulesPage />);
    fireEvent.click(screen.getByRole("button", { name: "儲存欄位對照" }));
    expect(mockUpdateSettings).toHaveBeenCalledWith(
      expect.objectContaining({ fieldMapping: expect.any(Object) }),
    );
    expect(mockToastSuccess).toHaveBeenCalledWith("欄位對照已儲存");
  });
});
