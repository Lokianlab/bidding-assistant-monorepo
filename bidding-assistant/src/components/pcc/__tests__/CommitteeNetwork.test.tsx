import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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
  it("顯示兩個輸入框", async () => {
    const CommitteeNetwork = await getCommitteeNetwork();
    const { container } = render(createElement(CommitteeNetwork, {}));
    expect(container.querySelectorAll("input").length).toBe(2);
  });

  it("顯示「分析評委」按鈕（初始 disabled）", async () => {
    const CommitteeNetwork = await getCommitteeNetwork();
    render(createElement(CommitteeNetwork, {}));
    const btn = screen.getByText("分析評委") as HTMLButtonElement;
    expect(btn).toBeTruthy();
    expect(btn.disabled).toBe(true);
  });

  it("輸入機關代碼後按鈕可用", async () => {
    const CommitteeNetwork = await getCommitteeNetwork();
    const { container } = render(createElement(CommitteeNetwork, {}));
    const inputs = container.querySelectorAll("input");
    fireEvent.change(inputs[0], { target: { value: "A10001" } });
    const btn = screen.getByText("分析評委") as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  it("點擊按鈕呼叫 run(unitId, unitName)", async () => {
    const CommitteeNetwork = await getCommitteeNetwork();
    const { container } = render(createElement(CommitteeNetwork, {}));
    const inputs = container.querySelectorAll("input");
    fireEvent.change(inputs[0], { target: { value: "A10001" } });
    fireEvent.change(inputs[1], { target: { value: "臺北市教育局" } });
    fireEvent.click(screen.getByText("分析評委"));
    expect(mockRun).toHaveBeenCalledWith("A10001", "臺北市教育局");
  });

  it("Enter 鍵呼叫 run", async () => {
    const CommitteeNetwork = await getCommitteeNetwork();
    const { container } = render(createElement(CommitteeNetwork, {}));
    const inputs = container.querySelectorAll("input");
    fireEvent.change(inputs[0], { target: { value: "A10001" } });
    fireEvent.keyDown(inputs[0], { key: "Enter" });
    expect(mockRun).toHaveBeenCalledWith("A10001", "A10001");
  });
});

// ── 載入狀態 ───────────────────────────────────────────────

describe("CommitteeNetwork — 載入狀態", () => {
  it("loading=true 顯示「分析中...」", async () => {
    mockState = { ...mockState, loading: true };
    const CommitteeNetwork = await getCommitteeNetwork();
    render(createElement(CommitteeNetwork, {}));
    expect(screen.getByText("分析中...")).toBeTruthy();
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
