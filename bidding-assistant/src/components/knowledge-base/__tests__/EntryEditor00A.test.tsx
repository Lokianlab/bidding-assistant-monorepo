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

async function getEntryEditor00A() {
  const mod = await import("../EntryEditor00A");
  return mod.default;
}

// ── 基本渲染 ───────────────────────────────────────────────

describe("EntryEditor00A — 基本渲染", () => {
  const baseProps = {
    onSave: vi.fn(),
    onCancel: vi.fn(),
    nextId: "00A-001",
  };

  it("顯示編號欄位（值為 nextId）", async () => {
    const EntryEditor00A = await getEntryEditor00A();
    render(createElement(EntryEditor00A, baseProps));
    const inputs = screen.getAllByDisplayValue("00A-001");
    expect(inputs.length).toBeGreaterThan(0);
  });

  it("「姓名」為空時儲存按鈕 disabled", async () => {
    const EntryEditor00A = await getEntryEditor00A();
    render(createElement(EntryEditor00A, baseProps));
    // 儲存按鈕是最後一個「新增」（前面還有角色區的「新增」按鈕）
    const btns = screen.getAllByText("新增");
    const saveBtn = btns[btns.length - 1] as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(true);
  });

  it("輸入姓名後儲存按鈕可用", async () => {
    const EntryEditor00A = await getEntryEditor00A();
    render(createElement(EntryEditor00A, baseProps));
    const nameInput = screen.getByPlaceholderText("王○○");
    fireEvent.change(nameInput, { target: { value: "張三" } });
    const btns = screen.getAllByText("新增");
    const saveBtn = btns[btns.length - 1] as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(false);
  });

  it("點擊「取消」呼叫 onCancel", async () => {
    const onCancel = vi.fn();
    const EntryEditor00A = await getEntryEditor00A();
    render(createElement(EntryEditor00A, { ...baseProps, onCancel }));
    fireEvent.click(screen.getByText("取消"));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("顯示「在職狀態」預設選項", async () => {
    const EntryEditor00A = await getEntryEditor00A();
    render(createElement(EntryEditor00A, baseProps));
    expect(screen.getAllByText("在職").length).toBeGreaterThan(0);
  });

  it("編輯模式：按鈕文字為「更新」", async () => {
    const initial = {
      id: "00A-001",
      name: "王小明",
      title: "企劃師",
      status: "在職" as const,
      authorizedRoles: [],
      education: [],
      certifications: [],
      experiences: [],
      projects: [],
      additionalCapabilities: "",
      entryStatus: "active" as const,
      updatedAt: new Date().toISOString(),
    };
    const EntryEditor00A = await getEntryEditor00A();
    render(createElement(EntryEditor00A, { ...baseProps, initial }));
    expect(screen.getByText("更新")).toBeTruthy();
  });

  it("角色輸入：Enter 鍵新增角色 badge", async () => {
    const EntryEditor00A = await getEntryEditor00A();
    render(createElement(EntryEditor00A, baseProps));
    // 找到角色輸入框
    const roleInput = screen.getByPlaceholderText(/輸入角色/);
    fireEvent.change(roleInput, { target: { value: "企劃主筆" } });
    fireEvent.keyDown(roleInput, { key: "Enter" });
    expect(screen.getByText("企劃主筆")).toBeTruthy();
  });
});
