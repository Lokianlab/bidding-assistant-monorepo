import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createElement } from "react";
import { DashboardGrid } from "../DashboardGrid";
import type { DashboardMetrics } from "@/lib/dashboard/useDashboardMetrics";

// ── mock @dnd-kit ───────────────────────────────────────────

vi.mock("@dnd-kit/core", () => ({
  DndContext: ({ children }: { children: unknown }) =>
    createElement("div", { "data-testid": "dnd-context" }, children as never),
  closestCenter: vi.fn(),
  PointerSensor: class {},
  useSensor: () => ({}),
  useSensors: () => [],
}));

vi.mock("@dnd-kit/sortable", () => ({
  SortableContext: ({ children }: { children: unknown }) =>
    createElement("div", { "data-testid": "sortable-context" }, children as never),
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
  verticalListSortingStrategy: {},
}));

vi.mock("@dnd-kit/utilities", () => ({
  CSS: { Transform: { toString: () => "" } },
}));

// ── mock useCardLayout ──────────────────────────────────────

const mockAdd = vi.fn();
const mockRemove = vi.fn();
const mockReorder = vi.fn();
const mockResize = vi.fn();
const mockReset = vi.fn();
const mockLayout = {
  gridCols: 4,
  cards: [] as Array<{ cardId: string; type: string; size: string; config: { title: string } }>,
};

vi.mock("@/lib/dashboard/card-layout/useCardLayout", () => ({
  useCardLayout: () => ({
    layout: mockLayout,
    add: mockAdd,
    remove: mockRemove,
    reorder: mockReorder,
    resize: mockResize,
    reset: mockReset,
  }),
}));

// ── mock card-registry ──────────────────────────────────────

vi.mock("@/lib/dashboard/card-layout/card-registry", () => ({
  CARD_REGISTRY: [
    { type: "stat-test", name: "測試卡片", category: "stat", allowedSizes: ["small", "medium"], defaultSize: "small", defaultConfig: { title: "測試" }, icon: "📋", description: "測試用" },
  ],
  getCardDefinition: (type: string) => {
    if (type === "stat-test") return { name: "測試卡片", allowedSizes: ["small", "medium"] };
    return undefined;
  },
}));

// ── mock CardRenderer ───────────────────────────────────────

vi.mock("../cards/CardRenderer", () => ({
  CardRenderer: ({ type }: { type: string }) =>
    createElement("div", { "data-testid": `card-renderer-${type}` }),
}));

// ── mock CardPickerDialog ───────────────────────────────────

vi.mock("../cards/CardPickerDialog", () => ({
  CardPickerDialog: ({ open }: { open: boolean }) =>
    open ? createElement("div", { "data-testid": "card-picker" }, "新增卡片對話框") : null,
}));

// ── helpers ─────────────────────────────────────────────────

function makeMetrics(): DashboardMetrics {
  return {
    activeProjects: [],
    totalBudget: 0,
    wonBudget: 0,
    winRate: 0,
    biddingBudget: 0,
    yearSubmittedCount: 0,
    yearWonCount: 0,
    monthSubmittedCount: 0,
    weekSubmittedCount: 0,
    teamWorkload: [],
    monthlyTrend: [],
    typeAnalysis: [],
    statusDistribution: [],
    totalCost: { total: 0, bidDeposit: 0, procurementFee: 0 },
    totalCostByPeriod: undefined,
    rollingWinRate: [],
    quarterComparison: null,
  } as unknown as DashboardMetrics;
}

function renderGrid(overrides: Partial<{
  showSkeleton: boolean;
}> = {}) {
  return render(
    createElement(DashboardGrid, {
      metrics: makeMetrics(),
      yearlyGoal: 1000000,
      onGoalEdit: vi.fn(),
      monthlyTarget: 3,
      onMonthlyTargetEdit: vi.fn(),
      weeklyTarget: 1,
      onWeeklyTargetEdit: vi.fn(),
      showSkeleton: false,
      ...overrides,
    }),
  );
}

// ── tests ───────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockLayout.cards = [];
});

describe("DashboardGrid — skeleton", () => {
  it("showSkeleton=true 時顯示骨架屏", () => {
    const { container } = renderGrid({ showSkeleton: true });
    const pulses = container.querySelectorAll(".animate-pulse");
    expect(pulses.length).toBe(8);
  });

  it("showSkeleton=true 時不顯示編輯按鈕", () => {
    renderGrid({ showSkeleton: true });
    expect(screen.queryByText("編輯佈局")).toBeNull();
  });
});

describe("DashboardGrid — 空狀態", () => {
  it("無卡片時顯示「尚未新增任何卡片」", () => {
    renderGrid();
    expect(screen.getByText("尚未新增任何卡片")).toBeTruthy();
  });

  it("無卡片時仍有「新增卡片」按鈕", () => {
    renderGrid();
    expect(screen.getByText("新增卡片")).toBeTruthy();
  });
});

describe("DashboardGrid — 編輯模式切換", () => {
  it("初始顯示「編輯佈局」按鈕", () => {
    renderGrid();
    expect(screen.getByText("編輯佈局")).toBeTruthy();
  });

  it("點擊「編輯佈局」後變成「完成編輯」", () => {
    renderGrid();
    fireEvent.click(screen.getByText("編輯佈局"));
    expect(screen.getByText("完成編輯")).toBeTruthy();
  });

  it("編輯模式下顯示「還原預設」按鈕", () => {
    renderGrid();
    fireEvent.click(screen.getByText("編輯佈局"));
    expect(screen.getByText("還原預設")).toBeTruthy();
  });

  it("非編輯模式下不顯示「還原預設」", () => {
    renderGrid();
    expect(screen.queryByText("還原預設")).toBeNull();
  });

  it("點「還原預設」呼叫 reset()", () => {
    renderGrid();
    fireEvent.click(screen.getByText("編輯佈局"));
    fireEvent.click(screen.getByText("還原預設"));
    expect(mockReset).toHaveBeenCalledOnce();
  });
});

describe("DashboardGrid — 有卡片時渲染", () => {
  beforeEach(() => {
    mockLayout.cards = [
      { cardId: "card-1", type: "stat-test", size: "small", config: { title: "測試卡片" } },
    ];
  });

  it("渲染 CardRenderer", () => {
    const { container } = renderGrid();
    expect(container.querySelector("[data-testid='card-renderer-stat-test']")).toBeTruthy();
  });

  it("有卡片時不顯示空狀態", () => {
    renderGrid();
    expect(screen.queryByText("尚未新增任何卡片")).toBeNull();
  });
});
