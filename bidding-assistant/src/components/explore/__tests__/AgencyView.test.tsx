import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// ── Mutable mock states ────────────────────────────────────

let mockIntelState = {
  data: null as null | object,
  loading: false,
  error: null as string | null,
};

vi.mock("@/lib/pcc/useAgencyIntel", () => ({
  useAgencyIntel: () => mockIntelState,
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
  formatPCCDate: (d: number) => String(d),
}));

import { AgencyView } from "../AgencyView";

const basePayload = { unitId: "U001", unitName: "臺北市教育局" };

describe("AgencyView — 基本渲染", () => {
  const onNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockIntelState = { data: null, loading: false, error: null };
  });

  it("顯示機關名稱與副標題", () => {
    render(<AgencyView payload={basePayload} onNavigate={onNavigate} />);
    expect(screen.getByText("臺北市教育局")).toBeTruthy();
    expect(screen.getByText("機關歷史標案分析")).toBeTruthy();
  });
});

describe("AgencyView — 載入狀態", () => {
  const onNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockIntelState = { data: null, loading: false, error: null };
  });

  it("loading=true 時顯示載入文字含機關名稱", () => {
    mockIntelState = { ...mockIntelState, loading: true };
    render(<AgencyView payload={basePayload} onNavigate={onNavigate} />);
    expect(screen.getByText(/載入 臺北市教育局 歷史標案/)).toBeTruthy();
  });
});

describe("AgencyView — 錯誤狀態", () => {
  const onNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockIntelState = { data: null, loading: false, error: null };
  });

  it("error 時顯示錯誤訊息", () => {
    mockIntelState = { ...mockIntelState, error: "網路逾時" };
    render(<AgencyView payload={basePayload} onNavigate={onNavigate} />);
    expect(screen.getByText("網路逾時")).toBeTruthy();
  });
});

describe("AgencyView — 有 intel 資料", () => {
  const onNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockIntelState = {
      data: {
        totalCases: 25,
        incumbents: [],
        myHistory: [],
        recentCases: [],
      },
      loading: false,
      error: null,
    };
  });

  it("顯示決標紀錄數量", () => {
    render(<AgencyView payload={basePayload} onNavigate={onNavigate} />);
    expect(screen.getByText("25")).toBeTruthy();
    expect(screen.getByText("決標紀錄")).toBeTruthy();
  });

  it("沒有我方紀錄時顯示提示文字", () => {
    render(<AgencyView payload={basePayload} onNavigate={onNavigate} />);
    expect(screen.getByText("我方無此機關投標紀錄")).toBeTruthy();
  });

  it("有在位者時顯示名稱，點擊觸發 onNavigate type=company", () => {
    mockIntelState = {
      ...mockIntelState,
      data: {
        totalCases: 25,
        incumbents: [{ name: "長期得標商", wins: 5 }],
        myHistory: [],
        recentCases: [],
      },
    };
    render(<AgencyView payload={basePayload} onNavigate={onNavigate} />);
    const incumbentBtn = screen.getByText("長期得標商");
    expect(incumbentBtn).toBeTruthy();
    fireEvent.click(incumbentBtn);
    expect(onNavigate).toHaveBeenCalledWith({
      type: "company",
      payload: { name: "長期得標商" },
    });
  });

  it("有我方紀錄時顯示得標摘要", () => {
    mockIntelState = {
      ...mockIntelState,
      data: {
        totalCases: 25,
        incumbents: [],
        myHistory: [
          { title: "食農教育計畫", date: 20240101, won: true },
          { title: "走讀導覽計畫", date: 20240201, won: false },
        ],
        recentCases: [],
      },
    };
    render(<AgencyView payload={basePayload} onNavigate={onNavigate} />);
    // 顯示得標/未得標統計 (1/2 得標)
    expect(screen.getByText(/1\/2 得標/)).toBeTruthy();
    expect(screen.getByText("食農教育計畫")).toBeTruthy();
    expect(screen.getByText("走讀導覽計畫")).toBeTruthy();
  });

  it("有近期標案時，點擊 Card 觸發 onNavigate type=search", () => {
    mockIntelState = {
      ...mockIntelState,
      data: {
        totalCases: 25,
        incumbents: [],
        myHistory: [],
        recentCases: [
          { title: "近期食農教育計畫", date: 20240315, winner: null, bidders: 3 },
        ],
      },
    };
    render(<AgencyView payload={basePayload} onNavigate={onNavigate} />);
    expect(screen.getByText("近期食農教育計畫")).toBeTruthy();
    // 點擊 Card（最近標案 section）
    const card = screen.getByText("近期食農教育計畫").closest('[class*="cursor-pointer"]');
    if (card) fireEvent.click(card);
    expect(onNavigate).toHaveBeenCalledWith({
      type: "search",
      payload: { query: expect.any(String), mode: "title" },
    });
  });

  it("有近期標案得標廠商時，點擊廠商觸發 onNavigate type=company", () => {
    mockIntelState = {
      ...mockIntelState,
      data: {
        totalCases: 25,
        incumbents: [],
        myHistory: [],
        recentCases: [
          { title: "近期標案", date: 20240315, winner: "得標廠商B", bidders: 2 },
        ],
      },
    };
    render(<AgencyView payload={basePayload} onNavigate={onNavigate} />);
    const winnerBtn = screen.getByText(/得標：得標廠商B/);
    expect(winnerBtn).toBeTruthy();
    fireEvent.click(winnerBtn);
    expect(onNavigate).toHaveBeenCalledWith({
      type: "company",
      payload: { name: "得標廠商B" },
    });
  });
});
