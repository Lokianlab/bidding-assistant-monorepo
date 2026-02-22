import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ScanDashboard } from "../ScanDashboard";

// ── Mock next/navigation ────────────────────────────────────
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// ── Mock fetch ──────────────────────────────────────────────

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  vi.clearAllMocks();
  mockPush.mockReset();
  localStorage.clear(); // 隔離各測試的排除記憶
});

const mockScanResponse = {
  scannedAt: "2026-02-28T00:00:00Z",
  searchKeywords: ["食農教育", "藝術"],
  results: [
    {
      tender: {
        title: "食農教育推廣計畫",
        unit: "教育局",
        jobNumber: "J001",
        budget: 0,
        deadline: "",
        publishDate: "20260228",
        url: "https://pcc.g0v.ronny.tw/tender/J001",
      },
      classification: {
        category: "must",
        matchedLabel: "食農教育",
        matchedKeywords: ["食農教育"],
      },
    },
    {
      tender: {
        title: "藝術節策展服務",
        unit: "文化局",
        jobNumber: "J002",
        budget: 0,
        deadline: "",
        publishDate: "20260228",
        url: "https://pcc.g0v.ronny.tw/tender/J002",
      },
      classification: {
        category: "review",
        matchedLabel: "各種節慶",
        matchedKeywords: ["藝術節"],
      },
    },
    {
      tender: {
        title: "課後服務委辦",
        unit: "教育局",
        jobNumber: "J003",
        budget: 0,
        deadline: "",
        publishDate: "20260228",
        url: "https://pcc.g0v.ronny.tw/tender/J003",
      },
      classification: {
        category: "exclude",
        matchedLabel: "課後服務",
        matchedKeywords: ["課後服務"],
      },
    },
    {
      tender: {
        title: "道路養護工程",
        unit: "工務局",
        jobNumber: "J004",
        budget: 0,
        deadline: "",
        publishDate: "20260228",
        url: "https://pcc.g0v.ronny.tw/tender/J004",
      },
      classification: {
        category: "other",
        matchedLabel: "不符合已知類別",
        matchedKeywords: [],
      },
    },
  ],
  counts: { must: 1, review: 1, exclude: 1, other: 1 },
  totalRaw: 4,
};

function mockScanSuccess() {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => mockScanResponse,
  });
}

function mockScanError() {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status: 500,
    json: async () => ({ error: "掃描失敗" }),
  });
}

describe("ScanDashboard", () => {
  it("初始狀態顯示掃描提示", () => {
    render(<ScanDashboard />);
    expect(screen.getByText("手動掃描")).toBeDefined();
    expect(screen.getByText(/點擊「手動掃描」開始巡標/)).toBeDefined();
  });

  it("點擊掃描後顯示結果", async () => {
    mockScanSuccess();
    render(<ScanDashboard />);

    fireEvent.click(screen.getByText("手動掃描"));

    await waitFor(() => {
      expect(screen.getByText("食農教育推廣計畫")).toBeDefined();
    });

    // 統計摘要
    expect(screen.getByText(/共 4 筆公告/)).toBeDefined();
    expect(screen.getByText(/推薦 1 筆/)).toBeDefined();
    expect(screen.getByText(/待審 1 筆/)).toBeDefined();
  });

  it("四個分頁標籤存在", async () => {
    mockScanSuccess();
    render(<ScanDashboard />);

    fireEvent.click(screen.getByText("手動掃描"));

    await waitFor(() => {
      expect(screen.getByText("食農教育推廣計畫")).toBeDefined();
    });

    // Tab 存在（用 role 查找避免與 Badge 衝突）
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(4);
    expect(tabs[0].textContent).toContain("推薦");
    expect(tabs[1].textContent).toContain("需要看");
    expect(tabs[2].textContent).toContain("其他");
    expect(tabs[3].textContent).toContain("已排除");
  });

  it("預設顯示推薦分頁的標案", async () => {
    mockScanSuccess();
    render(<ScanDashboard />);

    fireEvent.click(screen.getByText("手動掃描"));

    await waitFor(() => {
      expect(screen.getByText("食農教育推廣計畫")).toBeDefined();
    });

    // 推薦分頁的標案在 DOM 中
    expect(screen.getByText("食農教育推廣計畫")).toBeDefined();

    // 預設推薦 tab 是 active
    const tabs = screen.getAllByRole("tab");
    expect(tabs[0].getAttribute("data-state")).toBe("active");
  });

  it("跳過按鈕移除標案", async () => {
    mockScanSuccess();
    render(<ScanDashboard />);

    fireEvent.click(screen.getByText("手動掃描"));

    await waitFor(() => {
      expect(screen.getByText("食農教育推廣計畫")).toBeDefined();
    });

    // 跳過
    const skipButtons = screen.getAllByText("跳過");
    fireEvent.click(skipButtons[0]);

    // 推薦分頁應該空了
    await waitFor(() => {
      expect(screen.queryByText("食農教育推廣計畫")).toBeNull();
    });
  });

  it("掃描失敗顯示錯誤訊息", async () => {
    mockScanError();
    render(<ScanDashboard />);

    fireEvent.click(screen.getByText("手動掃描"));

    await waitFor(() => {
      expect(screen.getByText("掃描失敗")).toBeDefined();
    });
  });

  it("詳情按鈕導航到情報搜尋頁", async () => {
    mockScanSuccess();
    render(<ScanDashboard />);

    fireEvent.click(screen.getByText("手動掃描"));

    await waitFor(() => {
      expect(screen.getByText("食農教育推廣計畫")).toBeDefined();
    });

    // 推薦分頁應有詳情按鈕
    const detailButtons = screen.getAllByText("詳情");
    fireEvent.click(detailButtons[0]);

    expect(mockPush).toHaveBeenCalledWith(
      "/intelligence?search=%E9%A3%9F%E8%BE%B2%E6%95%99%E8%82%B2%E6%8E%A8%E5%BB%A3%E8%A8%88%E7%95%AB"
    );
  });

  it("掃描中顯示載入狀態", async () => {
    // 延遲回應模擬載入
    mockFetch.mockImplementationOnce(() =>
      new Promise((resolve) =>
        setTimeout(() => resolve({
          ok: true,
          json: async () => mockScanResponse,
        }), 100)
      )
    );

    render(<ScanDashboard />);
    fireEvent.click(screen.getByText("手動掃描"));

    // 載入中
    expect(screen.getByText("掃描中...")).toBeDefined();
    expect(screen.getByText(/正在搜尋 PCC 公告/)).toBeDefined();

    // 等完成
    await waitFor(() => {
      expect(screen.getByText("食農教育推廣計畫")).toBeDefined();
    });
  });
});
