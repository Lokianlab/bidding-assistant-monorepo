import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createElement } from "react";

// ── mock useSettings ───────────────────────────────────────

vi.mock("@/lib/context/settings-context", () => ({
  useSettings: () => ({
    settings: { company: { brand: "大員洛川" } },
    updateSettings: vi.fn(),
  }),
}));

// ── mock usePCCSearch ─────────────────────────────────────

const mockSearch = vi.fn();
let mockState = {
  results: null as null | object,
  loading: false,
  error: null as string | null,
  search: mockSearch,
};

vi.mock("@/lib/pcc/usePCCSearch", () => ({
  usePCCSearch: () => mockState,
}));

// ── mock helpers ──────────────────────────────────────────

vi.mock("@/lib/pcc/helpers", () => ({
  formatPCCDate: (d: string) => d,
  parseCompanyRoles: () => [],
  calcWinRate: () => ({ rate: 0.5, wins: 5, total: 10 }),
}));

// ── mock PCCTenderSheet ───────────────────────────────────

vi.mock("../PCCTenderSheet", () => ({
  PCCTenderSheet: () => null,
}));

beforeEach(() => {
  mockState = {
    results: null,
    loading: false,
    error: null,
    search: mockSearch,
  };
  mockSearch.mockClear();
});

async function getPCCSearchPanel() {
  const mod = await import("../PCCSearchPanel");
  return mod.PCCSearchPanel;
}

// ── 基本渲染 ───────────────────────────────────────────────

describe("PCCSearchPanel — 基本渲染", () => {
  it("顯示「按案名搜尋」和「按廠商搜尋」分頁", async () => {
    const PCCSearchPanel = await getPCCSearchPanel();
    render(createElement(PCCSearchPanel, {}));
    expect(screen.getByText("按案名搜尋")).toBeTruthy();
    expect(screen.getByText("按廠商搜尋")).toBeTruthy();
  });

  it("顯示輸入框", async () => {
    const PCCSearchPanel = await getPCCSearchPanel();
    const { container } = render(createElement(PCCSearchPanel, {}));
    expect(container.querySelector("input")).toBeTruthy();
  });

  it("顯示「搜尋」按鈕（初始 disabled）", async () => {
    const PCCSearchPanel = await getPCCSearchPanel();
    render(createElement(PCCSearchPanel, {}));
    const btn = screen.getByText("搜尋") as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it("輸入後按鈕可用", async () => {
    const PCCSearchPanel = await getPCCSearchPanel();
    const { container } = render(createElement(PCCSearchPanel, {}));
    fireEvent.change(container.querySelector("input")!, { target: { value: "食農教育" } });
    const btn = screen.getByText("搜尋") as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  it("點擊搜尋呼叫 search(query, mode)", async () => {
    const PCCSearchPanel = await getPCCSearchPanel();
    const { container } = render(createElement(PCCSearchPanel, {}));
    fireEvent.change(container.querySelector("input")!, { target: { value: "走讀" } });
    fireEvent.click(screen.getByText("搜尋"));
    expect(mockSearch).toHaveBeenCalledWith("走讀", "title");
  });

  it("Enter 鍵觸發搜尋", async () => {
    const PCCSearchPanel = await getPCCSearchPanel();
    const { container } = render(createElement(PCCSearchPanel, {}));
    const input = container.querySelector("input")!;
    fireEvent.change(input, { target: { value: "導覽" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(mockSearch).toHaveBeenCalledWith("導覽", "title");
  });

  it("「按案名搜尋」時 placeholder 含「關鍵字」", async () => {
    const PCCSearchPanel = await getPCCSearchPanel();
    const { container } = render(createElement(PCCSearchPanel, {}));
    const input = container.querySelector("input") as HTMLInputElement;
    expect(input.placeholder).toMatch(/關鍵字/);
  });
});

// ── 載入狀態 ───────────────────────────────────────────────

describe("PCCSearchPanel — 載入狀態", () => {
  it("loading=true 顯示「搜尋中...」", async () => {
    mockState = { ...mockState, loading: true };
    const PCCSearchPanel = await getPCCSearchPanel();
    render(createElement(PCCSearchPanel, {}));
    expect(screen.getByText("搜尋中...")).toBeTruthy();
  });
});

// ── 錯誤狀態 ───────────────────────────────────────────────

describe("PCCSearchPanel — 錯誤狀態", () => {
  it("error 時顯示錯誤訊息", async () => {
    mockState = { ...mockState, error: "搜尋服務無法連線" };
    const PCCSearchPanel = await getPCCSearchPanel();
    render(createElement(PCCSearchPanel, {}));
    expect(screen.getByText("搜尋服務無法連線")).toBeTruthy();
  });
});

// ── 有搜尋結果 ─────────────────────────────────────────────

describe("PCCSearchPanel — 有搜尋結果", () => {
  it("顯示結果摘要（total_records）", async () => {
    mockState = {
      ...mockState,
      results: {
        total_records: 42,
        total_pages: 3,
        page: 1,
        records: [],
      },
    };
    const PCCSearchPanel = await getPCCSearchPanel();
    render(createElement(PCCSearchPanel, {}));
    expect(screen.getByText(/42/)).toBeTruthy();
  });

  it("多頁時顯示分頁按鈕", async () => {
    mockState = {
      ...mockState,
      results: {
        total_records: 50,
        total_pages: 3,
        page: 2,
        records: [],
      },
    };
    const PCCSearchPanel = await getPCCSearchPanel();
    render(createElement(PCCSearchPanel, {}));
    expect(screen.getByText("上一頁")).toBeTruthy();
    expect(screen.getByText("下一頁")).toBeTruthy();
  });

  it("第一頁時「上一頁」按鈕 disabled", async () => {
    mockState = {
      ...mockState,
      results: {
        total_records: 30,
        total_pages: 2,
        page: 1,
        records: [],
      },
    };
    const PCCSearchPanel = await getPCCSearchPanel();
    render(createElement(PCCSearchPanel, {}));
    const prevBtn = screen.getByText("上一頁") as HTMLButtonElement;
    expect(prevBtn.disabled).toBe(true);
  });
});
