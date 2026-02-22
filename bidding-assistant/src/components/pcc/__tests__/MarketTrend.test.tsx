import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createElement } from "react";

// ── recharts mock ───────────────────────────────────────────

vi.mock("recharts", () => ({
  ComposedChart: ({ children }: { children: unknown }) =>
    createElement("div", { "data-testid": "composed-chart" }, children as never),
  Bar: () => null,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  ResponsiveContainer: ({ children }: { children: unknown }) =>
    createElement("div", { "data-testid": "responsive-container" }, children as never),
}));

// ── mock useMarketTrend ────────────────────────────────────

const mockRun = vi.fn();
let mockState = {
  data: null as null | object,
  loading: false,
  progress: null as null | { loaded: number; total: number },
  error: null as string | null,
  run: mockRun,
};

vi.mock("@/lib/pcc/useMarketTrend", () => ({
  useMarketTrend: () => mockState,
}));

beforeEach(() => {
  mockState = {
    data: null,
    loading: false,
    progress: null,
    error: null,
    run: mockRun,
  };
  mockRun.mockClear();
});

async function getMarketTrend() {
  const mod = await import("../MarketTrend");
  return mod.MarketTrend;
}

// ── 基本渲染 ───────────────────────────────────────────────

describe("MarketTrend — 基本渲染", () => {
  it("顯示說明文字", async () => {
    const MarketTrend = await getMarketTrend();
    render(createElement(MarketTrend, {}));
    expect(screen.getByText(/輸入標案關鍵字/)).toBeTruthy();
  });

  it("顯示輸入框", async () => {
    const MarketTrend = await getMarketTrend();
    const { container } = render(createElement(MarketTrend, {}));
    expect(container.querySelector("input")).toBeTruthy();
  });

  it("顯示「分析趨勢」按鈕（初始 disabled）", async () => {
    const MarketTrend = await getMarketTrend();
    render(createElement(MarketTrend, {}));
    const btn = screen.getByText("分析趨勢");
    expect(btn).toBeTruthy();
    // 沒有輸入關鍵字，按鈕應 disabled
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it("輸入關鍵字後按鈕可用", async () => {
    const MarketTrend = await getMarketTrend();
    const { container } = render(createElement(MarketTrend, {}));
    const input = container.querySelector("input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "食農教育" } });
    const btn = screen.getByText("分析趨勢") as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  it("點擊按鈕呼叫 run(keyword)", async () => {
    const MarketTrend = await getMarketTrend();
    const { container } = render(createElement(MarketTrend, {}));
    const input = container.querySelector("input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "走讀" } });
    fireEvent.click(screen.getByText("分析趨勢"));
    expect(mockRun).toHaveBeenCalledWith("走讀");
  });

  it("按下 Enter 鍵呼叫 run(keyword)", async () => {
    const MarketTrend = await getMarketTrend();
    const { container } = render(createElement(MarketTrend, {}));
    const input = container.querySelector("input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "導覽" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(mockRun).toHaveBeenCalledWith("導覽");
  });
});

// ── 載入狀態 ───────────────────────────────────────────────

describe("MarketTrend — 載入狀態", () => {
  it("loading=true 顯示「分析中...」", async () => {
    mockState = { ...mockState, loading: true };
    const MarketTrend = await getMarketTrend();
    render(createElement(MarketTrend, {}));
    expect(screen.getByText("分析中...")).toBeTruthy();
  });

  it("loading=true 且有 progress 顯示進度", async () => {
    mockState = { ...mockState, loading: true, progress: { loaded: 3, total: 10 } };
    const MarketTrend = await getMarketTrend();
    render(createElement(MarketTrend, {}));
    expect(screen.getByText(/3\/10/)).toBeTruthy();
  });
});

// ── 錯誤狀態 ───────────────────────────────────────────────

describe("MarketTrend — 錯誤狀態", () => {
  it("error 時顯示錯誤訊息", async () => {
    mockState = { ...mockState, error: "API 連線失敗" };
    const MarketTrend = await getMarketTrend();
    render(createElement(MarketTrend, {}));
    expect(screen.getByText("API 連線失敗")).toBeTruthy();
  });
});

// ── 有資料 ─────────────────────────────────────────────────

describe("MarketTrend — 有資料", () => {
  it("data 不為 null 時顯示「案件總數」", async () => {
    mockState = {
      ...mockState,
      data: {
        totalRecords: 42,
        trendDirection: "增加",
        competitionLevel: "一般",
        yearRange: [2020, 2025],
        yearlyData: [],
        topAgencies: [],
      },
    };
    const MarketTrend = await getMarketTrend();
    render(createElement(MarketTrend, {}));
    expect(screen.getByText("案件總數")).toBeTruthy();
    expect(screen.getByText("42")).toBeTruthy();
  });
});
