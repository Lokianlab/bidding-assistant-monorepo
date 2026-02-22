import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createElement } from "react";

// ── mock @dnd-kit（jsdom 不支援拖曳事件，統一 passthrough）──────

vi.mock("@dnd-kit/core", () => ({
  DndContext: ({ children }: { children: unknown }) => children,
  closestCenter: vi.fn(),
  PointerSensor: vi.fn(),
  useSensor: vi.fn(() => ({})),
  useSensors: vi.fn((...args: unknown[]) => args),
}));

vi.mock("@dnd-kit/sortable", () => ({
  SortableContext: ({ children }: { children: unknown }) => children,
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
  }),
  verticalListSortingStrategy: vi.fn(),
}));

vi.mock("@dnd-kit/utilities", () => ({
  CSS: { Transform: { toString: () => "" } },
}));

// ── mock useCardLayout ────────────────────────────────────────

const mockReorder = vi.fn();
const mockResize = vi.fn();
const mockAdd = vi.fn();
const mockRemove = vi.fn();
const mockReset = vi.fn();
const mockLayout = vi.fn();

vi.mock("@/lib/dashboard/card-layout/useCardLayout", () => ({
  useCardLayout: () => mockLayout(),
}));

// ── mock 子元件（避免複雜 props 依賴）────────────────────────

vi.mock("../cards/CardRenderer", () => ({
  CardRenderer: ({ type }: { type: string }) =>
    createElement("div", { "data-testid": `card-renderer-${type}` }, type),
}));

vi.mock("../cards/CardPickerDialog", () => ({
  CardPickerDialog: ({ open }: { open: boolean }) =>
    open ? createElement("div", { "data-testid": "card-picker-dialog" }, "選取卡片") : null,
}));

vi.mock("../cards/DashboardCard", () => ({
  DashboardCard: ({ title, children }: { title: string; children: unknown }) =>
    createElement("div", { "data-testid": "dashboard-card" },
      createElement("span", null, title),
      children as never,
    ),
}));

// ── mock card-registry（getCardDefinition）────────────────────

vi.mock("@/lib/dashboard/card-layout/card-registry", () => ({
  getCardDefinition: () => ({ name: "測試卡片", allowedSizes: ["medium"] }),
}));

// ── Helpers ───────────────────────────────────────────────────

function makeEmptyLayout() {
  return {
    layout: { cards: [], gridCols: 4 },
    reorder: mockReorder,
    resize: mockResize,
    add: mockAdd,
    remove: mockRemove,
    reset: mockReset,
    updateConfig: vi.fn(),
  };
}

function makeLayoutWithCards() {
  return {
    layout: {
      cards: [
        { cardId: "c1", type: "revenue-summary", position: 0, size: "medium", config: { title: "收益卡片" } },
        { cardId: "c2", type: "bid-status", position: 1, size: "medium", config: { title: "狀態卡片" } },
      ],
      gridCols: 4,
    },
    reorder: mockReorder,
    resize: mockResize,
    add: mockAdd,
    remove: mockRemove,
    reset: mockReset,
    updateConfig: vi.fn(),
  };
}

function makeBaseProps(overrides: Record<string, unknown> = {}) {
  return {
    metrics: {} as never,
    yearlyGoal: 1_000_000,
    onGoalEdit: vi.fn(),
    monthlyTarget: 100_000,
    onMonthlyTargetEdit: vi.fn(),
    weeklyTarget: 25_000,
    onWeeklyTargetEdit: vi.fn(),
    showSkeleton: false,
    ...overrides,
  };
}

// ── 非同步 import（避免 mock 順序問題）───────────────────────

async function renderDashboardGrid(props: Record<string, unknown>) {
  const { DashboardGrid } = await import("../DashboardGrid");
  return render(createElement(DashboardGrid, props as never));
}

// ── Tests ─────────────────────────────────────────────────────

describe("DashboardGrid — Skeleton 模式", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLayout.mockReturnValue(makeEmptyLayout());
  });

  it("showSkeleton=true 時顯示 8 個佔位卡片", async () => {
    const { container } = await renderDashboardGrid(makeBaseProps({ showSkeleton: true }));
    const skeletonCards = container.querySelectorAll(".animate-pulse");
    expect(skeletonCards.length).toBe(8);
  });

  it("showSkeleton=true 時不顯示編輯按鈕", async () => {
    await renderDashboardGrid(makeBaseProps({ showSkeleton: true }));
    expect(screen.queryByText("編輯佈局")).toBeNull();
  });
});

describe("DashboardGrid — 一般模式", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLayout.mockReturnValue(makeEmptyLayout());
  });

  it("顯示「編輯佈局」按鈕", async () => {
    await renderDashboardGrid(makeBaseProps());
    expect(screen.getByText("編輯佈局")).toBeTruthy();
  });

  it("非編輯模式下不顯示「還原預設」按鈕", async () => {
    await renderDashboardGrid(makeBaseProps());
    expect(screen.queryByText("還原預設")).toBeNull();
  });
});

describe("DashboardGrid — 編輯模式切換", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLayout.mockReturnValue(makeEmptyLayout());
  });

  it("點擊「編輯佈局」後按鈕文字變為「完成編輯」", async () => {
    await renderDashboardGrid(makeBaseProps());
    fireEvent.click(screen.getByText("編輯佈局"));
    expect(screen.getByText("完成編輯")).toBeTruthy();
  });

  it("進入編輯模式後顯示「新增卡片」和「還原預設」", async () => {
    await renderDashboardGrid(makeBaseProps());
    fireEvent.click(screen.getByText("編輯佈局"));
    // 空卡片狀態：header 有一個「新增卡片」，empty state 也有一個，總共 >= 2
    expect(screen.getAllByText("新增卡片").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("還原預設")).toBeTruthy();
  });

  it("再次點擊「完成編輯」後退出編輯模式", async () => {
    await renderDashboardGrid(makeBaseProps());
    fireEvent.click(screen.getByText("編輯佈局"));
    fireEvent.click(screen.getByText("完成編輯"));
    expect(screen.getByText("編輯佈局")).toBeTruthy();
    // 退出編輯模式後：header 的「還原預設」消失
    expect(screen.queryByText("還原預設")).toBeNull();
  });

  it("點擊「還原預設」呼叫 reset", async () => {
    await renderDashboardGrid(makeBaseProps());
    fireEvent.click(screen.getByText("編輯佈局"));
    fireEvent.click(screen.getByText("還原預設"));
    expect(mockReset).toHaveBeenCalledOnce();
  });
});

describe("DashboardGrid — 空卡片狀態", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLayout.mockReturnValue(makeEmptyLayout());
  });

  it("無卡片時顯示空狀態文字", async () => {
    await renderDashboardGrid(makeBaseProps());
    expect(screen.getByText("尚未新增任何卡片")).toBeTruthy();
  });

  it("空狀態下也有「新增卡片」按鈕（empty state 內）", async () => {
    await renderDashboardGrid(makeBaseProps());
    // 空狀態區域有「新增卡片」button
    expect(screen.getByText("新增卡片")).toBeTruthy();
  });
});

describe("DashboardGrid — 有卡片時", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLayout.mockReturnValue(makeLayoutWithCards());
  });

  it("有卡片時不顯示空狀態文字", async () => {
    await renderDashboardGrid(makeBaseProps());
    expect(screen.queryByText("尚未新增任何卡片")).toBeNull();
  });

  it("渲染對應數量的 DashboardCard", async () => {
    await renderDashboardGrid(makeBaseProps());
    const cards = screen.getAllByTestId("dashboard-card");
    expect(cards.length).toBe(2);
  });

  it("渲染 CardRenderer（對應卡片 type）", async () => {
    await renderDashboardGrid(makeBaseProps());
    expect(screen.getByTestId("card-renderer-revenue-summary")).toBeTruthy();
    expect(screen.getByTestId("card-renderer-bid-status")).toBeTruthy();
  });
});

describe("DashboardGrid — CardPickerDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLayout.mockReturnValue(makeEmptyLayout());
  });

  it("初始狀態下 CardPickerDialog 不顯示", async () => {
    await renderDashboardGrid(makeBaseProps());
    expect(screen.queryByTestId("card-picker-dialog")).toBeNull();
  });

  it("點擊空狀態的「新增卡片」→ CardPickerDialog 開啟", async () => {
    await renderDashboardGrid(makeBaseProps());
    fireEvent.click(screen.getByText("新增卡片"));
    expect(screen.getByTestId("card-picker-dialog")).toBeTruthy();
  });

  it("點擊編輯模式的「新增卡片」→ CardPickerDialog 開啟", async () => {
    await renderDashboardGrid(makeBaseProps());
    fireEvent.click(screen.getByText("編輯佈局"));
    const addBtns = screen.getAllByText("新增卡片");
    fireEvent.click(addBtns[0]);
    expect(screen.getByTestId("card-picker-dialog")).toBeTruthy();
  });
});
