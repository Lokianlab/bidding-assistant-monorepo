import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createElement } from "react";

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

// ── mock SmugMugPhotoPicker ───────────────────────────────

vi.mock("../SmugMugPhotoPicker", () => ({
  SmugMugPhotoPicker: () => createElement("div", { "data-testid": "smugmug-photo-picker" }),
}));

async function getEntryEditor00B() {
  const mod = await import("../EntryEditor00B");
  return mod.default;
}

// ── 基本渲染 ───────────────────────────────────────────────

describe("EntryEditor00B — 基本渲染", () => {
  const baseProps = {
    onSave: vi.fn(),
    onCancel: vi.fn(),
    nextId: "00B-001",
  };

  it("顯示編號欄位（值為 nextId）", async () => {
    const EntryEditor00B = await getEntryEditor00B();
    render(createElement(EntryEditor00B, baseProps));
    const inputs = screen.getAllByDisplayValue("00B-001");
    expect(inputs.length).toBeGreaterThan(0);
  });

  it("「案名」為空時儲存按鈕 disabled", async () => {
    const EntryEditor00B = await getEntryEditor00B();
    render(createElement(EntryEditor00B, baseProps));
    const saveBtn = screen.getByText("新增") as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(true);
  });

  it("輸入案名後儲存按鈕可用", async () => {
    const EntryEditor00B = await getEntryEditor00B();
    render(createElement(EntryEditor00B, baseProps));
    const nameInput = screen.getByPlaceholderText("臺灣形象展規劃執行");
    fireEvent.change(nameInput, { target: { value: "食農教育案" } });
    const saveBtn = screen.getByText("新增") as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(false);
  });

  it("點擊「取消」呼叫 onCancel", async () => {
    const onCancel = vi.fn();
    const EntryEditor00B = await getEntryEditor00B();
    render(createElement(EntryEditor00B, { ...baseProps, onCancel }));
    fireEvent.click(screen.getByText("取消"));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("渲染 SmugMugPhotoPicker（圖片選取器）", async () => {
    const EntryEditor00B = await getEntryEditor00B();
    render(createElement(EntryEditor00B, baseProps));
    // SmugMugPhotoPicker 在折疊的 Accordion 裡，需先點展開
    const photoTrigger = screen.getByText(/實績照片/);
    fireEvent.click(photoTrigger);
    expect(screen.getByTestId("smugmug-photo-picker")).toBeTruthy();
  });

  it("顯示「履約狀態」預設選項（履約中）", async () => {
    const EntryEditor00B = await getEntryEditor00B();
    render(createElement(EntryEditor00B, baseProps));
    // completionStatus 用 EditableSelect（已 mock 為 input），用 getByDisplayValue 查
    expect(screen.getByDisplayValue("履約中")).toBeTruthy();
  });

  it("編輯模式：按鈕文字為「更新」", async () => {
    const initial = {
      id: "00B-001",
      projectName: "食農教育案",
      client: "桃園市政府",
      contractAmount: "150萬",
      period: "2024-2025",
      entity: "大員洛川",
      role: "主辦",
      completionStatus: "已完成" as const,
      teamMembers: "",
      workItems: [],
      outcomes: "",
      documentLinks: "",
      entryStatus: "active" as const,
      updatedAt: new Date().toISOString(),
    };
    const EntryEditor00B = await getEntryEditor00B();
    render(createElement(EntryEditor00B, { ...baseProps, initial }));
    expect(screen.getByText("更新")).toBeTruthy();
  });
});
