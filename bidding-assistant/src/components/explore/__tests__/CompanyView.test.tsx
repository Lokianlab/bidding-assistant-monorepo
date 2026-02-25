import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createElement } from "react";

// ── Mutable mock states ────────────────────────────────────

const mockSearch = vi.fn();
let mockSearchState = {
  results: null as null | { total_records: number; records: object[] },
  loading: false,
  error: null as string | null,
  search: mockSearch,
  clearResults: vi.fn(),
};

const mockRun = vi.fn();
let mockAnalysisState = {
  data: null as null | object,
  loading: false,
  progress: null as null | { loaded: number; total: number },
  error: null as string | null,
  run: mockRun,
};

vi.mock("@/lib/pcc/usePCCSearch", () => ({
  usePCCSearch: () => mockSearchState,
}));

vi.mock("@/lib/pcc/useCompetitorAnalysis", () => ({
  useCompetitorAnalysis: () => mockAnalysisState,
}));

vi.mock("@/lib/pcc/helpers", () => ({
  parseCompanyRoles: () => [],
  formatPCCDate: (d: number) => String(d),
}));

import { CompanyView } from "../CompanyView";

const basePayload = { name: "測試公司" };

describe("CompanyView — 基本渲染", () => {
  const onNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchState = { results: null, loading: false, error: null, search: mockSearch, clearResults: vi.fn() };
    mockAnalysisState = { data: null, loading: false, progress: null, error: null, run: mockRun };
  });

  it("顯示廠商名稱與副標題", () => {
    render(<CompanyView payload={basePayload} onNavigate={onNavigate} />);
    expect(screen.getByText("測試公司")).toBeTruthy();
    expect(screen.getByText("廠商投標紀錄與競爭分析")).toBeTruthy();
  });

  it("掛載時自動呼叫 search 和 analysis.run", () => {
    render(<CompanyView payload={basePayload} onNavigate={onNavigate} />);
    expect(mockSearch).toHaveBeenCalledWith("測試公司", "company");
    expect(mockRun).toHaveBeenCalledWith("測試公司");
  });

  it("顯示「投標紀錄」標題", () => {
    render(<CompanyView payload={basePayload} onNavigate={onNavigate} />);
    expect(screen.getByText("投標紀錄")).toBeTruthy();
  });
});

describe("CompanyView — 搜尋載入與錯誤狀態", () => {
  const onNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchState = { results: null, loading: false, error: null, search: mockSearch, clearResults: vi.fn() };
    mockAnalysisState = { data: null, loading: false, progress: null, error: null, run: mockRun };
  });

  it("search loading=true 時顯示載入文字", () => {
    mockSearchState = { ...mockSearchState, loading: true };
    render(<CompanyView payload={basePayload} onNavigate={onNavigate} />);
    expect(screen.getByText("載入投標紀錄...")).toBeTruthy();
  });

  it("search error 時顯示錯誤訊息", () => {
    mockSearchState = { ...mockSearchState, error: "連線失敗" };
    render(<CompanyView payload={basePayload} onNavigate={onNavigate} />);
    expect(screen.getByText("連線失敗")).toBeTruthy();
  });
});

describe("CompanyView — 分析載入與錯誤狀態", () => {
  const onNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchState = { results: null, loading: false, error: null, search: mockSearch, clearResults: vi.fn() };
    mockAnalysisState = { data: null, loading: false, progress: null, error: null, run: mockRun };
  });

  it("analysis loading=true 時顯示分析進行中文字", () => {
    mockAnalysisState = { ...mockAnalysisState, loading: true };
    render(<CompanyView payload={basePayload} onNavigate={onNavigate} />);
    expect(screen.getByText(/分析競爭紀錄中/)).toBeTruthy();
  });

  it("analysis loading=true 且有 progress 時顯示頁數", () => {
    mockAnalysisState = { ...mockAnalysisState, loading: true, progress: { loaded: 3, total: 10 } };
    render(<CompanyView payload={basePayload} onNavigate={onNavigate} />);
    expect(screen.getByText(/3\/10 頁/)).toBeTruthy();
  });

  it("analysis error 時顯示錯誤訊息", () => {
    mockAnalysisState = { ...mockAnalysisState, error: "分析逾時" };
    render(<CompanyView payload={basePayload} onNavigate={onNavigate} />);
    expect(screen.getByText("分析逾時")).toBeTruthy();
  });
});

describe("CompanyView — 有競爭分析資料", () => {
  const onNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchState = { results: null, loading: false, error: null, search: mockSearch, clearResults: vi.fn() };
    mockAnalysisState = {
      data: {
        awardRecords: 10,
        winRate: 0.3,
        wins: 3,
        losses: 7,
        agencies: [],
        competitors: [],
      },
      loading: false,
      progress: null,
      error: null,
      run: mockRun,
    };
  });

  it("顯示決標紀錄、得標率、得標、未得標統計", () => {
    render(<CompanyView payload={basePayload} onNavigate={onNavigate} />);
    expect(screen.getByText("10 筆")).toBeTruthy();
    expect(screen.getByText("30%")).toBeTruthy();
    expect(screen.getByText("3 次")).toBeTruthy();
    expect(screen.getByText("7 次")).toBeTruthy();
  });

  it("有常投機關時顯示機關按鈕，點擊觸發 onNavigate type=agency", () => {
    mockAnalysisState = {
      ...mockAnalysisState,
      data: {
        awardRecords: 5,
        winRate: 0.4,
        wins: 2,
        losses: 3,
        agencies: [{ unitId: "A001", unitName: "臺北市教育局", totalCases: 5, myWins: 2 }],
        competitors: [],
      },
    };
    render(<CompanyView payload={basePayload} onNavigate={onNavigate} />);
    const agencyBtn = screen.getByText("臺北市教育局");
    expect(agencyBtn).toBeTruthy();
    fireEvent.click(agencyBtn);
    expect(onNavigate).toHaveBeenCalledWith({
      type: "agency",
      payload: { unitId: "A001", unitName: "臺北市教育局" },
    });
  });

  it("有競爭對手時顯示對手按鈕，點擊觸發 onNavigate type=company", () => {
    mockAnalysisState = {
      ...mockAnalysisState,
      data: {
        awardRecords: 5,
        winRate: 0.4,
        wins: 2,
        losses: 3,
        agencies: [],
        competitors: [{ id: "C001", name: "競爭對手A", encounters: 3, myWins: 1, theirWins: 2 }],
      },
    };
    render(<CompanyView payload={basePayload} onNavigate={onNavigate} />);
    const compBtn = screen.getByText("競爭對手A");
    expect(compBtn).toBeTruthy();
    fireEvent.click(compBtn);
    expect(onNavigate).toHaveBeenCalledWith({
      type: "company",
      payload: { name: "競爭對手A" },
    });
  });
});

describe("CompanyView — 有投標紀錄", () => {
  const onNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockAnalysisState = { data: null, loading: false, progress: null, error: null, run: mockRun };
    mockSearchState = {
      results: {
        total_records: 2,
        records: [
          {
            unit_id: "U001",
            job_number: "J001",
            unit_name: "教育局",
            date: 20240101,
            brief: { title: "食農教育推廣計畫" },
          },
        ],
      },
      loading: false,
      error: null,
      search: mockSearch,
      clearResults: vi.fn(),
    };
  });

  it("顯示總筆數", () => {
    render(<CompanyView payload={basePayload} onNavigate={onNavigate} />);
    expect(screen.getByText("共 2 筆")).toBeTruthy();
  });

  it("顯示投標紀錄標題", () => {
    render(<CompanyView payload={basePayload} onNavigate={onNavigate} />);
    expect(screen.getByText("食農教育推廣計畫")).toBeTruthy();
  });

  it("點擊機關名稱觸發 onNavigate type=agency", () => {
    render(<CompanyView payload={basePayload} onNavigate={onNavigate} />);
    const unitBtn = screen.getByText("教育局");
    fireEvent.click(unitBtn);
    expect(onNavigate).toHaveBeenCalledWith({
      type: "agency",
      payload: { unitId: "U001", unitName: "教育局" },
    });
  });
});
