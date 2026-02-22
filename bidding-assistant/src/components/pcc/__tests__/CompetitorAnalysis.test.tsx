import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createElement } from "react";

// ── recharts mock ─────────────────────────────────────────

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

// ── mock useSettings ───────────────────────────────────────

vi.mock("@/lib/context/settings-context", () => ({
  useSettings: () => ({
    settings: { company: { brand: "測試公司" } },
    updateSettings: vi.fn(),
  }),
}));

// ── mock useCompetitorAnalysis ────────────────────────────

const mockRun = vi.fn();
let mockState = {
  data: null as null | object,
  loading: false,
  progress: null as null | { loaded: number; total: number },
  error: null as string | null,
  run: mockRun,
};

vi.mock("@/lib/pcc/useCompetitorAnalysis", () => ({
  useCompetitorAnalysis: () => mockState,
}));

// ── mock useAgencyIntel ───────────────────────────────────

vi.mock("@/lib/pcc/useAgencyIntel", () => ({
  useAgencyIntel: () => ({ data: null, loading: false, error: null }),
}));

// ── mock helpers ──────────────────────────────────────────

vi.mock("@/lib/pcc/helpers", () => ({
  formatPCCDate: (d: string) => d,
  parseCompanyRoles: () => [],
  calcWinRate: () => ({ rate: 0, wins: 0, total: 0 }),
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

async function getCompetitorAnalysis() {
  const mod = await import("../CompetitorAnalysis");
  return mod.CompetitorAnalysis;
}

// ── 基本渲染 ───────────────────────────────────────────────

describe("CompetitorAnalysis — 基本渲染", () => {
  it("顯示輸入框", async () => {
    const CompetitorAnalysis = await getCompetitorAnalysis();
    const { container } = render(createElement(CompetitorAnalysis, {}));
    expect(container.querySelector("input")).toBeTruthy();
  });

  it("預設帶入 settings.company.brand", async () => {
    const CompetitorAnalysis = await getCompetitorAnalysis();
    const { container } = render(createElement(CompetitorAnalysis, {}));
    const input = container.querySelector("input") as HTMLInputElement;
    expect(input.value).toBe("測試公司");
  });

  it("顯示「開始分析」按鈕（有預設值，按鈕可用）", async () => {
    const CompetitorAnalysis = await getCompetitorAnalysis();
    render(createElement(CompetitorAnalysis, {}));
    const btn = screen.getByText("開始分析") as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  it("清空輸入後按鈕 disabled", async () => {
    const CompetitorAnalysis = await getCompetitorAnalysis();
    const { container } = render(createElement(CompetitorAnalysis, {}));
    const input = container.querySelector("input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "" } });
    const btn = screen.getByText("開始分析") as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it("點擊按鈕呼叫 run(companyName)", async () => {
    const CompetitorAnalysis = await getCompetitorAnalysis();
    const { container } = render(createElement(CompetitorAnalysis, {}));
    const input = container.querySelector("input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "大員洛川" } });
    fireEvent.click(screen.getByText("開始分析"));
    expect(mockRun).toHaveBeenCalledWith("大員洛川");
  });

  it("Enter 鍵呼叫 run", async () => {
    const CompetitorAnalysis = await getCompetitorAnalysis();
    const { container } = render(createElement(CompetitorAnalysis, {}));
    const input = container.querySelector("input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "測試廠商" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(mockRun).toHaveBeenCalledWith("測試廠商");
  });
});

// ── 載入狀態 ───────────────────────────────────────────────

describe("CompetitorAnalysis — 載入狀態", () => {
  it("loading=true 顯示「分析中...」", async () => {
    mockState = { ...mockState, loading: true };
    const CompetitorAnalysis = await getCompetitorAnalysis();
    render(createElement(CompetitorAnalysis, {}));
    expect(screen.getByText("分析中...")).toBeTruthy();
  });

  it("loading=true 且有 progress 顯示進度", async () => {
    mockState = { ...mockState, loading: true, progress: { loaded: 4, total: 12 } };
    const CompetitorAnalysis = await getCompetitorAnalysis();
    render(createElement(CompetitorAnalysis, {}));
    expect(screen.getByText(/載入中 4\/12/)).toBeTruthy();
  });
});

// ── 錯誤狀態 ───────────────────────────────────────────────

describe("CompetitorAnalysis — 錯誤狀態", () => {
  it("error 時顯示錯誤訊息", async () => {
    mockState = { ...mockState, error: "找不到公司資料" };
    const CompetitorAnalysis = await getCompetitorAnalysis();
    render(createElement(CompetitorAnalysis, {}));
    expect(screen.getByText("找不到公司資料")).toBeTruthy();
  });
});

// ── 有資料 ─────────────────────────────────────────────────

describe("CompetitorAnalysis — 有資料", () => {
  const mockData = {
    totalRecords: 30,
    awardRecords: 20,
    winRate: 0.6,
    wins: 12,
    losses: 8,
    yearlyStats: [],
    competitors: [],
    agencies: [],
  };

  it("顯示「投標紀錄」總覽", async () => {
    mockState = { ...mockState, data: mockData };
    const CompetitorAnalysis = await getCompetitorAnalysis();
    render(createElement(CompetitorAnalysis, {}));
    expect(screen.getByText("投標紀錄")).toBeTruthy();
    expect(screen.getByText("30 筆")).toBeTruthy();
  });

  it("顯示得標率計算", async () => {
    mockState = { ...mockState, data: mockData };
    const CompetitorAnalysis = await getCompetitorAnalysis();
    render(createElement(CompetitorAnalysis, {}));
    expect(screen.getByText("60%")).toBeTruthy();
    expect(screen.getByText("12 勝 / 8 敗")).toBeTruthy();
  });

  it("顯示「決標案件」", async () => {
    mockState = { ...mockState, data: mockData };
    const CompetitorAnalysis = await getCompetitorAnalysis();
    render(createElement(CompetitorAnalysis, {}));
    expect(screen.getByText("決標案件")).toBeTruthy();
    expect(screen.getByText("20 件")).toBeTruthy();
  });

  it("競爭對手為空時不顯示對手列表", async () => {
    mockState = { ...mockState, data: { ...mockData, competitors: [] } };
    const CompetitorAnalysis = await getCompetitorAnalysis();
    render(createElement(CompetitorAnalysis, {}));
    expect(screen.queryByText("常遇對手排行")).toBeNull();
  });
});
