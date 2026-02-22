import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createElement } from "react";
import type { ReactNode } from "react";
import { CardPickerDialog } from "../cards/CardPickerDialog";

// Mock Dialog to avoid Radix portal issues in jsdom
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: ReactNode; open: boolean }) =>
    open ? createElement("div", { "data-testid": "dialog" }, children) : null,
  DialogContent: ({ children }: { children: ReactNode }) =>
    createElement("div", null, children),
  DialogHeader: ({ children }: { children: ReactNode }) =>
    createElement("div", null, children),
  DialogTitle: ({ children }: { children: ReactNode }) =>
    createElement("h2", null, children),
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: ReactNode }) =>
    createElement("div", null, children),
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: ReactNode }) =>
    createElement("span", null, children),
}));

// ── Tests ────────────────────────────────────────────────

describe("CardPickerDialog", () => {
  const baseProps = {
    open: true,
    onOpenChange: vi.fn(),
    onAdd: vi.fn(),
  };

  it("顯示對話框標題「新增卡片」", () => {
    render(createElement(CardPickerDialog, baseProps));
    expect(screen.getByText("新增卡片")).toBeTruthy();
  });

  it("顯示所有分類標題", () => {
    render(createElement(CardPickerDialog, baseProps));
    expect(screen.getByText("統計卡片")).toBeTruthy();
    expect(screen.getByText("圖表卡片")).toBeTruthy();
    expect(screen.getByText("儀表卡片")).toBeTruthy();
    // 「自訂卡片」出現兩次（分類標題 + 卡片名稱），用 getAllByText
    expect(screen.getAllByText("自訂卡片").length).toBeGreaterThanOrEqual(1);
  });

  it("顯示統計卡片名稱", () => {
    render(createElement(CardPickerDialog, baseProps));
    expect(screen.getByText("當前標案數")).toBeTruthy();
    expect(screen.getByText("預算總額")).toBeTruthy();
    expect(screen.getByText("得標金額")).toBeTruthy();
    expect(screen.getByText("得標率")).toBeTruthy();
  });

  it("點擊卡片呼叫 onAdd", () => {
    const onAdd = vi.fn();
    render(createElement(CardPickerDialog, { ...baseProps, onAdd }));
    fireEvent.click(screen.getByText("當前標案數"));
    expect(onAdd).toHaveBeenCalledWith("stat-projects");
  });

  it("點擊卡片後關閉對話框", () => {
    const onOpenChange = vi.fn();
    render(createElement(CardPickerDialog, { ...baseProps, onOpenChange }));
    fireEvent.click(screen.getByText("預算總額"));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("open=false 時不渲染", () => {
    render(createElement(CardPickerDialog, { ...baseProps, open: false }));
    expect(screen.queryByText("新增卡片")).toBeNull();
  });

  it("顯示圖表分類卡片數量", () => {
    render(createElement(CardPickerDialog, baseProps));
    // chart category has 8 cards, gauge has 2, stat has 8, custom has 1
    // Check that badge count "2" exists (gauge category)
    expect(screen.getByText("2")).toBeTruthy();
  });
});
