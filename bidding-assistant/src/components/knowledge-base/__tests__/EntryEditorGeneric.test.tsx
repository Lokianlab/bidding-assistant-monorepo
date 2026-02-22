import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createElement } from "react";
import { EntryEditor00C, EntryEditor00D, EntryEditor00E } from "../EntryEditorGeneric";

// ── Radix Accordion 需要 scrollIntoView ───────────────────

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

// ── mock useCustomOptions ─────────────────────────────────

vi.mock("@/lib/knowledge-base/useCustomOptions", () => ({
  useCustomOptions: () => ({
    getOptions: () => [],
    addOption: vi.fn(),
    removeOption: vi.fn(),
  }),
}));

// ── mock EditableSelect ───────────────────────────────────

vi.mock("../EditableSelect", () => ({
  EditableSelect: ({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) =>
    createElement("input", {
      "data-testid": "editable-select",
      value,
      placeholder,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value),
    }),
}));

// ── EntryEditor00C ─────────────────────────────────────────

describe("EntryEditor00C — 時程範本", () => {
  const baseProps = {
    onSave: vi.fn(),
    onCancel: vi.fn(),
    nextId: "00C-001",
  };

  it("顯示編號欄位（值為 nextId）", () => {
    render(createElement(EntryEditor00C, baseProps));
    const inputs = screen.getAllByDisplayValue("00C-001");
    expect(inputs.length).toBeGreaterThan(0);
  });

  it("「範本名稱」為空時儲存按鈕 disabled", () => {
    render(createElement(EntryEditor00C, baseProps));
    // 找第一個「新增」按鈕
    const saveBtn = screen.getByText("新增") as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(true);
  });

  it("輸入範本名稱後儲存按鈕可用", () => {
    render(createElement(EntryEditor00C, baseProps));
    // 找到範本名稱 placeholder 的 input
    const nameInput = screen.getByPlaceholderText("展覽策展");
    fireEvent.change(nameInput, { target: { value: "自然導覽" } });
    const saveBtn = screen.getByText("新增") as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(false);
  });

  it("點擊「取消」呼叫 onCancel", () => {
    const onCancel = vi.fn();
    render(createElement(EntryEditor00C, { ...baseProps, onCancel }));
    fireEvent.click(screen.getByText("取消"));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("編輯模式：按鈕文字為「更新」", () => {
    const initial = {
      id: "00C-001",
      templateName: "展覽策展",
      applicableType: "",
      budgetRange: "",
      durationRange: "",
      phases: [],
      warnings: "",
      entryStatus: "active" as const,
      updatedAt: new Date().toISOString(),
    };
    render(createElement(EntryEditor00C, { ...baseProps, initial }));
    expect(screen.getByText("更新")).toBeTruthy();
  });

  it("顯示「資料狀態」下拉", () => {
    render(createElement(EntryEditor00C, baseProps));
    // Select trigger 初始值 "草稿"
    expect(screen.getAllByText("草稿").length).toBeGreaterThan(0);
  });
});

// ── EntryEditor00D ─────────────────────────────────────────

describe("EntryEditor00D — 應變SOP", () => {
  const baseProps = {
    onSave: vi.fn(),
    onCancel: vi.fn(),
    nextId: "00D-001",
  };

  it("顯示編號欄位（值為 nextId）", () => {
    render(createElement(EntryEditor00D, baseProps));
    const inputs = screen.getAllByDisplayValue("00D-001");
    expect(inputs.length).toBeGreaterThan(0);
  });

  it("「風險名稱」為空時儲存按鈕 disabled", () => {
    render(createElement(EntryEditor00D, baseProps));
    const saveBtn = screen.getByText("新增") as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(true);
  });

  it("點擊「取消」呼叫 onCancel", () => {
    const onCancel = vi.fn();
    render(createElement(EntryEditor00D, { ...baseProps, onCancel }));
    fireEvent.click(screen.getByText("取消"));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("顯示風險等級選項（預設「中」）", () => {
    render(createElement(EntryEditor00D, baseProps));
    expect(screen.getAllByText("中").length).toBeGreaterThan(0);
  });
});

// ── EntryEditor00E ─────────────────────────────────────────

describe("EntryEditor00E — 案後檢討", () => {
  const baseProps = {
    onSave: vi.fn(),
    onCancel: vi.fn(),
    nextId: "00E-001",
  };

  it("顯示編號欄位（值為 nextId）", () => {
    render(createElement(EntryEditor00E, baseProps));
    const inputs = screen.getAllByDisplayValue("00E-001");
    expect(inputs.length).toBeGreaterThan(0);
  });

  it("「案名」為空時儲存按鈕 disabled", () => {
    render(createElement(EntryEditor00E, baseProps));
    const saveBtn = screen.getByText("新增") as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(true);
  });

  it("輸入案名後儲存按鈕可用", () => {
    render(createElement(EntryEditor00E, baseProps));
    const nameInput = screen.getByPlaceholderText("○○案");
    fireEvent.change(nameInput, { target: { value: "食農教育案" } });
    const saveBtn = screen.getByText("新增") as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(false);
  });

  it("點擊「取消」呼叫 onCancel", () => {
    const onCancel = vi.fn();
    render(createElement(EntryEditor00E, { ...baseProps, onCancel }));
    fireEvent.click(screen.getByText("取消"));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("顯示「一句話總結」欄位", () => {
    render(createElement(EntryEditor00E, baseProps));
    expect(screen.getByPlaceholderText("一句話描述此案的關鍵教訓")).toBeTruthy();
  });
});
