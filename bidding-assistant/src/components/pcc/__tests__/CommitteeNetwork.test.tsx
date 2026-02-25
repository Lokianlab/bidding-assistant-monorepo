import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { createElement } from "react";

// ── mock useCommitteeAnalysis ─────────────────────────────

const mockRun = vi.fn();
let mockState = {
  data: null as null | object,
  loading: false,
  progress: null as null | { loaded: number; total: number },
  error: null as string | null,
  run: mockRun,
};

vi.mock("@/lib/pcc/useCommitteeAnalysis", () => ({
  useCommitteeAnalysis: () => mockState,
}));

// ── mock pccApiFetch ───────────────────────────────────────

vi.mock("@/lib/pcc/api", () => ({
  pccApiFetch: vi.fn().mockResolvedValue({
    records: [
      { unit_id: "A10001", unit_name: "臺北市教育局" },
    ],
  }),
}));

// ── mock formatPCCDate ─────────────────────────────────────

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

async function getCommitteeNetwork() {
  const mod = await import("../CommitteeNetwork");
  return mod.CommitteeNetwork;
}

// ── 基本渲染 ───────────────────────────────────────────────

describe("CommitteeNetwork — 基本渲染", () => {
  it("顯示一個搜尋輸入框", async () => {
    const CommitteeNetwork = await getCommitteeNetwork();
    const { container } = render(createElement(CommitteeNetwork, {}));
    expect(container.querySelectorAll("input").length).toBe(1);
  });

  it("顯示「搜尋機關」按鈕（初始 disabled）", async () => {
    const CommitteeNetwork = await getCommitteeNetwork();
    render(createElement(CommitteeNetwork, {}));
    const btn = screen.getByText("搜尋機關") as HTMLButtonElement;
    expect(btn).toBeTruthy();
    expect(btn.disabled).toBe(true);
  });

  it("輸入關鍵字後搜尋按鈕可用", async () => {
    const CommitteeNetwork = await getCommitteeNetwork();
    const { container } = render(createElement(CommitteeNetwork, {}));
    const input = container.querySelector("input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "臺北市教育局" } });
    const btn = screen.getByText("搜尋機關") as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  it("點擊搜尋後顯示機關選項並可選取觸發 run", async () => {
    const CommitteeNetwork = await getCommitteeNetwork();
    const { container } = render(createElement(CommitteeNetwork, {}));
    const input = container.querySelector("input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "教育局" } });
    fireEvent.click(screen.getByText("搜尋機關"));
    await waitFor(() => expect(screen.getByText("臺北市教育局")).toBeTruthy());
    fireEvent.click(screen.getByText("臺北市教育局"));
    await waitFor(() => expect(mockRun).toHaveBeenCalledWith("A10001", "臺北市教育局"));
  });

  it("Enter 鍵觸發搜尋並顯示結果", async () => {
    const CommitteeNetwork = await getCommitteeNetwork();
    const { container } = render(createElement(CommitteeNetwork, {}));
    const input = container.querySelector("input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "教育局" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(screen.getByText("臺北市教育局")).toBeTruthy());
  });
});

// ── 載入狀態 ───────────────────────────────────────────────

describe("CommitteeNetwork — 載入狀態", () => {
  it("loading=true 時輸入框 disabled", async () => {
    mockState = { ...mockState, loading: true };
    const CommitteeNetwork = await getCommitteeNetwork();
    const { container } = render(createElement(CommitteeNetwork, {}));
    const input = container.querySelector("input") as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });

  it("loading=true 且有 progress 顯示進度條", async () => {
    mockState = { ...mockState, loading: true, progress: { loaded: 5, total: 20 } };
    const CommitteeNetwork = await getCommitteeNetwork();
    render(createElement(CommitteeNetwork, {}));
    expect(screen.getByText(/5 \/ 20/)).toBeTruthy();
    expect(screen.getByText("正在取得標案詳情...")).toBeTruthy();
  });
});

// ── 錯誤狀態 ───────────────────────────────────────────────

describe("CommitteeNetwork — 錯誤狀態", () => {
  it("error 時顯示錯誤訊息", async () => {
    mockState = { ...mockState, error: "API 呼叫失敗" };
    const CommitteeNetwork = await getCommitteeNetwork();
    render(createElement(CommitteeNetwork, {}));
    expect(screen.getByText("API 呼叫失敗")).toBeTruthy();
  });
});

// ── 有資料 ─────────────────────────────────────────────────

describe("CommitteeNetwork — 有資料", () => {
  it("totalTenders=0 時顯示「無決標紀錄」", async () => {
    mockState = {
      ...mockState,
      data: {
        totalTenders: 0,
        totalMembers: 0,
        frequentMembers: [],
      },
    };
    const CommitteeNetwork = await getCommitteeNetwork();
    render(createElement(CommitteeNetwork, {}));
    expect(screen.getByText("該機關無決標紀錄")).toBeTruthy();
  });

  it("有資料時顯示總覽數字", async () => {
    mockState = {
      ...mockState,
      data: {
        totalTenders: 15,
        totalMembers: 8,
        frequentMembers: [],
      },
    };
    const CommitteeNetwork = await getCommitteeNetwork();
    render(createElement(CommitteeNetwork, {}));
    expect(screen.getByText("15")).toBeTruthy();
    expect(screen.getByText("分析標案數")).toBeTruthy();
    expect(screen.getByText("8")).toBeTruthy();
    expect(screen.getByText("不重複評委")).toBeTruthy();
  });

  it("frequentMembers 為空時顯示提示", async () => {
    mockState = {
      ...mockState,
      data: {
        totalTenders: 10,
        totalMembers: 5,
        frequentMembers: [],
      },
    };
    const CommitteeNetwork = await getCommitteeNetwork();
    render(createElement(CommitteeNetwork, {}));
    expect(screen.getByText("無評委出現 2 次以上")).toBeTruthy();
  });

  it("有 frequentMembers 時顯示評委名稱", async () => {
    mockState = {
      ...mockState,
      data: {
        totalTenders: 10,
        totalMembers: 5,
        frequentMembers: [
          {
            name: "張三",
            status: "在職",
            appearances: 3,
            attendanceRate: 0.9,
            agencies: ["臺北市教育局"],
            tenders: [],
          },
        ],
      },
    };
    const CommitteeNetwork = await getCommitteeNetwork();
    render(createElement(CommitteeNetwork, {}));
    expect(screen.getByText("張三")).toBeTruthy();
    expect(screen.getByText("3 次")).toBeTruthy();
    expect(screen.getByText(/出席 90%/)).toBeTruthy();
  });
});
