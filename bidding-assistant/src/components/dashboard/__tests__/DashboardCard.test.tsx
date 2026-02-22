import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createElement } from "react";
import { DashboardCard } from "../cards/DashboardCard";

// ── Tests ────────────────────────────────────────────────

describe("DashboardCard", () => {
  const baseProps = {
    cardId: "card-1",
    title: "測試卡片",
    size: "medium" as const,
    allowedSizes: ["small" as const, "medium" as const, "large" as const],
    isEditing: false,
    onResize: vi.fn(),
    onRemove: vi.fn(),
  };

  it("顯示卡片標題", () => {
    render(createElement(DashboardCard, baseProps, "內容"));
    expect(screen.getByText("測試卡片")).toBeTruthy();
  });

  it("渲染子元素", () => {
    render(createElement(DashboardCard, baseProps, "卡片內容文字"));
    expect(screen.getByText("卡片內容文字")).toBeTruthy();
  });

  it("非編輯模式不顯示拖曳把手", () => {
    render(createElement(DashboardCard, baseProps, "內容"));
    expect(screen.queryByLabelText("拖曳排序")).toBeNull();
  });

  it("非編輯模式不顯示移除按鈕", () => {
    render(createElement(DashboardCard, baseProps, "內容"));
    expect(screen.queryByTitle("移除卡片")).toBeNull();
  });

  it("編輯模式顯示拖曳把手", () => {
    render(createElement(DashboardCard, { ...baseProps, isEditing: true }, "內容"));
    expect(screen.getByLabelText("拖曳排序")).toBeTruthy();
  });

  it("編輯模式顯示移除按鈕", () => {
    render(createElement(DashboardCard, { ...baseProps, isEditing: true }, "內容"));
    expect(screen.getByTitle("移除卡片")).toBeTruthy();
  });

  it("點擊移除按鈕呼叫 onRemove", () => {
    const onRemove = vi.fn();
    render(createElement(DashboardCard, { ...baseProps, isEditing: true, onRemove }, "內容"));
    fireEvent.click(screen.getByTitle("移除卡片"));
    expect(onRemove).toHaveBeenCalled();
  });

  it("編輯模式顯示尺寸切換按鈕（多尺寸時）", () => {
    render(createElement(DashboardCard, { ...baseProps, isEditing: true }, "內容"));
    // Current size is "medium" → label "M"
    expect(screen.getByText("M")).toBeTruthy();
  });

  it("點擊尺寸切換循環到下一個尺寸", () => {
    const onResize = vi.fn();
    render(createElement(DashboardCard, {
      ...baseProps,
      isEditing: true,
      size: "medium" as const,
      onResize,
    }, "內容"));
    // medium is index 1 in [small, medium, large], next is large
    fireEvent.click(screen.getByText("M"));
    expect(onResize).toHaveBeenCalledWith("large");
  });

  it("單一尺寸時不顯示尺寸切換按鈕", () => {
    render(createElement(DashboardCard, {
      ...baseProps,
      isEditing: true,
      allowedSizes: ["small" as const],
      size: "small" as const,
    }, "內容"));
    expect(screen.queryByText("S")).toBeNull();
  });

  it("有 onOpenSettings 時顯示設定按鈕", () => {
    render(createElement(DashboardCard, {
      ...baseProps,
      isEditing: true,
      onOpenSettings: vi.fn(),
    }, "內容"));
    expect(screen.getByTitle("卡片設定")).toBeTruthy();
  });

  it("沒有 onOpenSettings 時不顯示設定按鈕", () => {
    render(createElement(DashboardCard, { ...baseProps, isEditing: true }, "內容"));
    expect(screen.queryByTitle("卡片設定")).toBeNull();
  });
});
