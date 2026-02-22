import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createElement } from "react";
import { CardPickerDialog } from "../CardPickerDialog";

// ── mock CARD_REGISTRY ──────────────────────────────────────
// 提供最小的 registry 讓測試可控
vi.mock("@/lib/dashboard/card-layout/card-registry", () => ({
  CARD_REGISTRY: [
    {
      type: "stat-projects",
      name: "當前標案數",
      description: "顯示目前進行中的標案總數",
      icon: "📋",
      category: "stat",
      allowedSizes: ["small"],
      defaultSize: "small",
      defaultConfig: { title: "當前標案數" },
    },
    {
      type: "stat-budget",
      name: "預算總額",
      description: "所有進行中標案的預算加總",
      icon: "💰",
      category: "stat",
      allowedSizes: ["small"],
      defaultSize: "small",
      defaultConfig: { title: "預算總額" },
    },
    {
      type: "chart-monthly-trend",
      name: "月份趨勢",
      description: "近期各月的投標與得標件數趨勢",
      icon: "📉",
      category: "chart",
      allowedSizes: ["large"],
      defaultSize: "large",
      defaultConfig: { title: "月份趨勢" },
    },
    {
      type: "gauge-weekly-bid",
      name: "本週投標進度",
      description: "本週投標件數佔週目標的進度",
      icon: "⏱️",
      category: "gauge",
      allowedSizes: ["small"],
      defaultSize: "small",
      defaultConfig: { title: "本週投標進度" },
    },
    {
      type: "custom",
      name: "自訂卡片",
      description: "使用者可自行選擇指標的卡片",
      icon: "🛠️",
      category: "custom",
      allowedSizes: ["medium"],
      defaultSize: "medium",
      defaultConfig: { metric: "activeProjects", visualization: "number", title: "自訂卡片" },
    },
  ],
}));

// ── helpers ──────────────────────────────────────────────────

function renderDialog(overrides: Partial<{
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAdd: (type: string) => void;
}> = {}) {
  const props = {
    open: true,
    onOpenChange: vi.fn(),
    onAdd: vi.fn(),
    ...overrides,
  };
  render(createElement(CardPickerDialog, props));
  return props;
}

// ── 基本渲染 ────────────────────────────────────────────────

describe("CardPickerDialog — 基本渲染", () => {
  it("open=true 時顯示標題「新增卡片」", () => {
    renderDialog();
    expect(screen.getByText("新增卡片")).toBeTruthy();
  });

  it("open=false 時不渲染對話框內容", () => {
    renderDialog({ open: false });
    expect(screen.queryByText("新增卡片")).toBeNull();
  });
});

// ── 類別分組 ────────────────────────────────────────────────

describe("CardPickerDialog — 類別分組", () => {
  it("顯示四個類別標題", () => {
    renderDialog();
    expect(screen.getByText("統計卡片")).toBeTruthy();
    expect(screen.getByText("圖表卡片")).toBeTruthy();
    expect(screen.getByText("儀表卡片")).toBeTruthy();
    // 「自訂卡片」同時是類別標題和卡片名稱，會出現 2 次
    expect(screen.getAllByText("自訂卡片").length).toBe(2);
  });

  it("統計卡片類別顯示數量 badge (2)", () => {
    renderDialog();
    // 統計卡片下有 stat-projects 和 stat-budget
    const statHeading = screen.getByText("統計卡片");
    const badge = statHeading.parentElement?.querySelector(".text-\\[10px\\]");
    expect(badge?.textContent).toBe("2");
  });

  it("顯示所有卡片名稱", () => {
    renderDialog();
    expect(screen.getByText("當前標案數")).toBeTruthy();
    expect(screen.getByText("預算總額")).toBeTruthy();
    expect(screen.getByText("月份趨勢")).toBeTruthy();
    expect(screen.getByText("本週投標進度")).toBeTruthy();
    // 「自訂卡片」同時出現在類別標題和卡片按鈕
    expect(screen.getAllByText("自訂卡片").length).toBeGreaterThanOrEqual(1);
  });

  it("顯示卡片描述文字", () => {
    renderDialog();
    expect(screen.getByText("顯示目前進行中的標案總數")).toBeTruthy();
    expect(screen.getByText("近期各月的投標與得標件數趨勢")).toBeTruthy();
  });
});

// ── 點擊行為 ────────────────────────────────────────────────

describe("CardPickerDialog — 點擊新增", () => {
  it("點擊卡片按鈕呼叫 onAdd 帶 type", () => {
    const { onAdd } = renderDialog();
    fireEvent.click(screen.getByText("當前標案數"));
    expect(onAdd).toHaveBeenCalledWith("stat-projects");
  });

  it("點擊後自動關閉對話框（onOpenChange(false)）", () => {
    const { onOpenChange } = renderDialog();
    fireEvent.click(screen.getByText("月份趨勢"));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("不同卡片帶不同 type", () => {
    const { onAdd } = renderDialog();
    fireEvent.click(screen.getByText("本週投標進度"));
    expect(onAdd).toHaveBeenCalledWith("gauge-weekly-bid");
  });
});
