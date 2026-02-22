import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createElement } from "react";
import { DashboardCard } from "../DashboardCard";

// ── Helper ──────────────────────────────────────────────────

function makeProps(overrides: Record<string, unknown> = {}) {
  return {
    cardId: "test-card",
    title: "測試卡片",
    size: "medium" as const,
    allowedSizes: ["small", "medium", "large"] as const,
    isEditing: false,
    onResize: vi.fn(),
    onRemove: vi.fn(),
    children: createElement("div", { "data-testid": "card-child" }, "子元件內容"),
    ...overrides,
  };
}

// ── 基本渲染 ───────────────────────────────────────────────

describe("DashboardCard — 基本渲染", () => {
  it("顯示標題", () => {
    render(createElement(DashboardCard, makeProps() as never));
    expect(screen.getByText("測試卡片")).toBeTruthy();
  });

  it("渲染 children", () => {
    render(createElement(DashboardCard, makeProps() as never));
    expect(screen.getByTestId("card-child")).toBeTruthy();
    expect(screen.getByText("子元件內容")).toBeTruthy();
  });

  it("非編輯模式：不顯示拖曳把手", () => {
    render(createElement(DashboardCard, makeProps({ isEditing: false }) as never));
    expect(screen.queryByLabelText("拖曳排序")).toBeNull();
  });

  it("非編輯模式：不顯示移除按鈕", () => {
    render(createElement(DashboardCard, makeProps({ isEditing: false }) as never));
    expect(screen.queryByTitle("移除卡片")).toBeNull();
  });
});

// ── 編輯模式 ───────────────────────────────────────────────

describe("DashboardCard — 編輯模式", () => {
  it("顯示拖曳把手", () => {
    render(createElement(DashboardCard, makeProps({ isEditing: true }) as never));
    expect(screen.getByLabelText("拖曳排序")).toBeTruthy();
  });

  it("顯示移除卡片按鈕", () => {
    render(createElement(DashboardCard, makeProps({ isEditing: true }) as never));
    expect(screen.getByTitle("移除卡片")).toBeTruthy();
  });

  it("顯示大小切換按鈕（有多個 allowedSizes）", () => {
    render(createElement(DashboardCard, makeProps({ isEditing: true }) as never));
    // 目前大小 medium → 顯示 "M" 按鈕
    expect(screen.getByTitle(/目前大小: M/)).toBeTruthy();
  });

  it("點擊移除按鈕呼叫 onRemove", () => {
    const onRemove = vi.fn();
    render(createElement(DashboardCard, makeProps({ isEditing: true, onRemove }) as never));
    fireEvent.click(screen.getByTitle("移除卡片"));
    expect(onRemove).toHaveBeenCalledOnce();
  });

  it("點擊大小按鈕呼叫 onResize（循環到下一個大小）", () => {
    const onResize = vi.fn();
    render(
      createElement(DashboardCard, makeProps({
        isEditing: true,
        size: "medium",
        allowedSizes: ["small", "medium", "large"],
        onResize,
      }) as never)
    );
    fireEvent.click(screen.getByTitle(/目前大小: M/));
    expect(onResize).toHaveBeenCalledWith("large");
  });

  it("點擊設定按鈕呼叫 onOpenSettings", () => {
    const onOpenSettings = vi.fn();
    render(
      createElement(DashboardCard, makeProps({
        isEditing: true,
        onOpenSettings,
      }) as never)
    );
    expect(screen.getByTitle("卡片設定")).toBeTruthy();
    fireEvent.click(screen.getByTitle("卡片設定"));
    expect(onOpenSettings).toHaveBeenCalledOnce();
  });

  it("allowedSizes 只有一個時不顯示大小按鈕", () => {
    render(
      createElement(DashboardCard, makeProps({
        isEditing: true,
        size: "medium",
        allowedSizes: ["medium"],
      }) as never)
    );
    expect(screen.queryByTitle(/目前大小/)).toBeNull();
  });
});

// ── 無設定按鈕 ────────────────────────────────────────────

describe("DashboardCard — 沒有 onOpenSettings", () => {
  it("編輯模式但 onOpenSettings 為 undefined 時不顯示設定按鈕", () => {
    render(
      createElement(DashboardCard, makeProps({
        isEditing: true,
        onOpenSettings: undefined,
      }) as never)
    );
    expect(screen.queryByTitle("卡片設定")).toBeNull();
  });
});
