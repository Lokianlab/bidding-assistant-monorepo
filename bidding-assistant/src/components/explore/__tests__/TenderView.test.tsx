import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// ── Mutable mock states ────────────────────────────────────

const { mockFetchTenderDetail, mockAgencyIntelHolder } = vi.hoisted(() => ({
  mockFetchTenderDetail: vi.fn(),
  mockAgencyIntelHolder: {
    current: { data: null as null | object, loading: false, error: null as string | null },
  },
}));

vi.mock("@/lib/pcc/usePCCSearch", () => ({
  usePCCSearch: () => ({
    results: null,
    loading: false,
    error: null,
    search: vi.fn(),
    clearResults: vi.fn(),
  }),
  fetchTenderDetail: mockFetchTenderDetail,
}));

vi.mock("@/lib/pcc/useAgencyIntel", () => ({
  useAgencyIntel: () => mockAgencyIntelHolder.current,
}));

vi.mock("@/lib/context/settings-context", () => ({
  useSettings: () => ({
    settings: { company: { brand: "大員洛川" } },
    hydrated: true,
    updateSettings: vi.fn(),
    updateSection: vi.fn(),
  }),
}));

vi.mock("@/lib/pcc/helpers", () => ({
  parseTenderSummary: (detail: object) => ({
    budget: 1000000,
    floorPrice: 900000,
    awardAmount: 850000,
    bidderCount: 3,
    awardMethod: "最低標",
    procurementType: "財物",
    awardDate: "113/03/15",
  }),
  formatAmount: (n: number) => `$${n.toLocaleString()}`,
  formatPCCDate: (d: number) => String(d),
  parseCompanyRoles: () => [],
}));

import { TenderView } from "../TenderView";

const basePayload = {
  unitId: "U001",
  jobNumber: "J001",
  title: "食農教育推廣計畫",
  unitName: "臺北市教育局",
};

describe("TenderView — 基本渲染", () => {
  const onNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockAgencyIntelHolder.current = { data: null, loading: false, error: null };
    // 預設 fetchTenderDetail 回傳 pending（不 resolve），讓 loading=true
    mockFetchTenderDetail.mockReturnValue(new Promise(() => {}));
  });

  it("顯示標案標題", () => {
    render(<TenderView payload={basePayload} onNavigate={onNavigate} />);
    expect(screen.getByText("食農教育推廣計畫")).toBeTruthy();
  });

  it("顯示機關名稱按鈕，點擊觸發 onNavigate type=agency", () => {
    render(<TenderView payload={basePayload} onNavigate={onNavigate} />);
    const agencyBtn = screen.getByText("臺北市教育局");
    expect(agencyBtn).toBeTruthy();
    fireEvent.click(agencyBtn);
    expect(onNavigate).toHaveBeenCalledWith({
      type: "agency",
      payload: { unitId: "U001", unitName: "臺北市教育局" },
    });
  });

  it("顯示案號", () => {
    render(<TenderView payload={basePayload} onNavigate={onNavigate} />);
    expect(screen.getByText(/案號 J001/)).toBeTruthy();
  });
});

describe("TenderView — 載入狀態", () => {
  const onNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockAgencyIntelHolder.current = { data: null, loading: false, error: null };
    mockFetchTenderDetail.mockReturnValue(new Promise(() => {})); // never resolves
  });

  it("loading=true 時顯示載入標案詳情文字", () => {
    render(<TenderView payload={basePayload} onNavigate={onNavigate} />);
    expect(screen.getByText("載入標案詳情中...")).toBeTruthy();
  });
});

describe("TenderView — 錯誤狀態", () => {
  const onNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockAgencyIntelHolder.current = { data: null, loading: false, error: null };
  });

  it("fetchTenderDetail reject 時顯示錯誤訊息", async () => {
    mockFetchTenderDetail.mockRejectedValueOnce(new Error("資料載入失敗"));
    render(<TenderView payload={basePayload} onNavigate={onNavigate} />);
    // 等待 promise rejection 處理
    await new Promise((r) => setTimeout(r, 50));
    // re-render 已更新
    expect(screen.getByText("資料載入失敗")).toBeTruthy();
  });
});

describe("TenderView — 有標案詳情", () => {
  const onNavigate = vi.fn();

  const mockDetail = {
    detail: {},
    evaluation_committee: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAgencyIntelHolder.current = { data: null, loading: false, error: null };
    mockFetchTenderDetail.mockResolvedValue(mockDetail);
  });

  it("顯示標案詳情區塊", async () => {
    render(<TenderView payload={basePayload} onNavigate={onNavigate} />);
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.getByText("標案詳情")).toBeTruthy();
  });

  it("顯示預算、底價、決標金額", async () => {
    render(<TenderView payload={basePayload} onNavigate={onNavigate} />);
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.getByText("預算")).toBeTruthy();
    expect(screen.getByText("底價")).toBeTruthy();
    expect(screen.getByText("決標金額")).toBeTruthy();
  });

  it("顯示底價/預算比例", async () => {
    render(<TenderView payload={basePayload} onNavigate={onNavigate} />);
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.getByText(/底價 \/ 預算 =/)).toBeTruthy();
    expect(screen.getByText("90.0%")).toBeTruthy();
  });

  it("顯示 PCC 原始連結", async () => {
    render(<TenderView payload={basePayload} onNavigate={onNavigate} />);
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.getByText("在政府電子採購網查看")).toBeTruthy();
  });
});

describe("TenderView — 評選委員", () => {
  const onNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockAgencyIntelHolder.current = { data: null, loading: false, error: null };
    mockFetchTenderDetail.mockResolvedValue({
      detail: {},
      evaluation_committee: [
        { sequence: 1, name: "王大明", status: "出席委員", attendance: "是", experience: "工程博士" },
      ],
    });
  });

  it("有評選委員時顯示委員姓名", async () => {
    render(<TenderView payload={basePayload} onNavigate={onNavigate} />);
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.getByText("王大明")).toBeTruthy();
    expect(screen.getByText(/評選委員/)).toBeTruthy();
  });
});

describe("TenderView — 有參與廠商", () => {
  const onNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockAgencyIntelHolder.current = { data: null, loading: false, error: null };
    mockFetchTenderDetail.mockResolvedValue({
      detail: {
        "得標廠商資訊": { "廠商名稱": "得標廠商甲", "廠商代碼": "A001" },
        "未得標廠商資訊": { "廠商名稱": "未得標廠商乙", "廠商代碼": "B002" },
      },
      evaluation_committee: [],
    });
  });

  it("顯示參與廠商區塊", async () => {
    render(<TenderView payload={basePayload} onNavigate={onNavigate} />);
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.getByText("參與廠商")).toBeTruthy();
  });

  it("點擊廠商名稱觸發 onNavigate type=company", async () => {
    render(<TenderView payload={basePayload} onNavigate={onNavigate} />);
    await new Promise((r) => setTimeout(r, 50));
    const companyBtn = screen.getByText("得標廠商甲");
    fireEvent.click(companyBtn);
    expect(onNavigate).toHaveBeenCalledWith({
      type: "company",
      payload: { name: "得標廠商甲" },
    });
  });
});

describe("TenderView — 機關情報", () => {
  const onNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchTenderDetail.mockReturnValue(new Promise(() => {}));
  });

  it("agencyIntel loading 時顯示載入機關文字", () => {
    mockAgencyIntelHolder.current = { data: null, loading: true, error: null };
    render(<TenderView payload={basePayload} onNavigate={onNavigate} />);
    expect(screen.getByText(/載入 臺北市教育局 歷史標案/)).toBeTruthy();
  });

  it("agencyIntel error 時顯示無法載入文字", () => {
    mockAgencyIntelHolder.current = { data: null, loading: false, error: "機關資料錯誤" };
    render(<TenderView payload={basePayload} onNavigate={onNavigate} />);
    expect(screen.getByText(/無法載入：機關資料錯誤/)).toBeTruthy();
  });

  it("agencyIntel 有資料時顯示查看完整按鈕，點擊觸發 onNavigate type=agency", () => {
    mockAgencyIntelHolder.current = {
      data: {
        totalCases: 30,
        incumbents: [],
        myHistory: [],
        recentCases: [],
      },
      loading: false,
      error: null,
    };
    render(<TenderView payload={basePayload} onNavigate={onNavigate} />);
    const viewAllBtn = screen.getByText("查看完整");
    expect(viewAllBtn).toBeTruthy();
    fireEvent.click(viewAllBtn);
    expect(onNavigate).toHaveBeenCalledWith({
      type: "agency",
      payload: { unitId: "U001", unitName: "臺北市教育局" },
    });
  });
});
