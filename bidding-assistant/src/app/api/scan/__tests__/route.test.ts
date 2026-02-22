import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock fetch globally ──────────────────────────────────────

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// ── Mock NextRequest / NextResponse ──────────────────────────

vi.mock("next/server", () => ({
  NextRequest: class {
    private body: unknown;
    constructor(_url: string, init?: { method?: string; body?: string }) {
      this.body = init?.body ? JSON.parse(init.body) : {};
    }
    async json() {
      return this.body;
    }
  },
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      data,
      status: init?.status ?? 200,
      async json() {
        return data;
      },
    }),
  },
}));

// ── Import after mocks ──────────────────────────────────────

import { POST } from "../route";
import { NextRequest } from "next/server";

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/scan", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// ── PCC mock data ───────────────────────────────────────────

/** 產生 YYYYMMDD 格式的日期數字 */
function toDateNum(d: Date): number {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return Number(`${y}${m}${day}`);
}

function makePCCRecord(overrides: {
  title: string;
  jobNumber?: string;
  unitName?: string;
  unitId?: string;
  type?: string;
  date?: number;
}) {
  return {
    date: overrides.date ?? toDateNum(new Date()),
    filename: "test.html",
    brief: {
      type: overrides.type ?? "招標公告",
      title: overrides.title,
    },
    job_number: overrides.jobNumber ?? `J-${Math.random().toString(36).slice(2, 8)}`,
    unit_id: overrides.unitId ?? "unit-001",
    unit_name: overrides.unitName ?? "教育局",
    unit_api_url: "",
    tender_api_url: "",
    unit_url: "",
    url: `https://pcc.g0v.ronny.tw/tender/${overrides.jobNumber ?? "J001"}`,
  };
}

function makePCCResponse(records: ReturnType<typeof makePCCRecord>[], query = "test") {
  return {
    query,
    page: 1,
    total_records: records.length,
    total_pages: 1,
    took: 100,
    records,
  };
}

function mockPCCSuccess(data: unknown) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    headers: new Headers({ "content-type": "application/json" }),
    json: async () => data,
  });
}

/** mock detail API 回傳（每筆招標公告都會打一次） */
function mockDetailSuccess(deadline: string, budget = "50,000,000元") {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    headers: new Headers({ "content-type": "application/json" }),
    json: async () => ({
      detail: {
        "已公告資料:截止投標日期": deadline,
        "已公告資料:預算金額": budget,
      },
    }),
  });
}

/** 快速 mock N 筆 detail（全部用未來截標日） */
function mockFutureDetails(count: number) {
  const future = new Date();
  future.setDate(future.getDate() + 30);
  const y = future.getFullYear() - 1911;
  const m = String(future.getMonth() + 1).padStart(2, "0");
  const d = String(future.getDate()).padStart(2, "0");
  for (let i = 0; i < count; i++) {
    mockDetailSuccess(`${y}/${m}/${d}`);
  }
}

function mockPCCError(status = 500) {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status,
    headers: new Headers({ "content-type": "application/json" }),
    json: async () => ({ error: `PCC API 錯誤: ${status}` }),
  });
}

// ── Tests ───────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockReset(); // 清除 mockResolvedValueOnce 佇列，防止跨測試洩漏
});

describe("POST /api/scan", () => {
  it("使用自訂關鍵字搜尋並回傳分類結果", async () => {
    const records = [
      makePCCRecord({ title: "食農教育推廣計畫", jobNumber: "J001" }),
      makePCCRecord({ title: "道路養護工程", jobNumber: "J002" }),
    ];
    mockPCCSuccess(makePCCResponse(records, "食農教育"));
    mockFutureDetails(1); // 只有食農教育（must）打 detail，道路養護（other）跳過

    const req = makeRequest({ keywords: ["食農教育"] });
    const res = await POST(req);
    const body = await res.json();

    expect(body.results).toHaveLength(2);
    expect(body.counts.must).toBe(1); // 食農教育
    expect(body.counts.other).toBe(1); // 道路養護
    expect(body.searchKeywords).toEqual(["食農教育"]);
    expect(body.scannedAt).toBeDefined();
    expect(body.totalRaw).toBe(2);
  });

  it("多個關鍵字搜尋且自動去重", async () => {
    const sharedRecord = makePCCRecord({ title: "藝術活動計畫", jobNumber: "J001", unitId: "u1" });

    mockPCCSuccess(makePCCResponse([sharedRecord], "藝術"));
    mockPCCSuccess(makePCCResponse([sharedRecord], "活動"));
    mockFutureDetails(1); // 去重後只有 1 筆需要 detail

    const req = makeRequest({ keywords: ["藝術", "活動"] });
    const res = await POST(req);
    const body = await res.json();

    expect(body.results).toHaveLength(1);
    expect(body.totalRaw).toBe(1);
  });

  it("空 body 使用預設關鍵字", async () => {
    // 每個預設關鍵字都回傳空結果
    for (let i = 0; i < 13; i++) {
      mockPCCSuccess(makePCCResponse([]));
    }

    const req = makeRequest({});
    const res = await POST(req);
    const body = await res.json();

    expect(body.searchKeywords).toHaveLength(13); // DEFAULT_SEARCH_KEYWORDS
    expect(body.results).toHaveLength(0);
    expect(body.counts).toEqual({ must: 0, review: 0, exclude: 0, other: 0 });
  });

  it("分類正確性：must / review / exclude / other", async () => {
    const records = [
      makePCCRecord({ title: "食農教育推廣", jobNumber: "J001" }),
      makePCCRecord({ title: "藝術節策展", jobNumber: "J002" }),
      makePCCRecord({ title: "課後服務委辦", jobNumber: "J003" }),
      makePCCRecord({ title: "道路工程", jobNumber: "J004" }),
    ];
    mockPCCSuccess(makePCCResponse(records));
    mockFutureDetails(2); // 只有 must（食農教育）+ review（藝術節）打 detail

    const req = makeRequest({ keywords: ["測試"] });
    const res = await POST(req);
    const body = await res.json();

    expect(body.counts.must).toBe(1);    // 食農教育
    expect(body.counts.review).toBe(1);  // 藝術節
    expect(body.counts.exclude).toBe(1); // 課後服務
    expect(body.counts.other).toBe(1);   // 道路工程
  });

  it("結果按優先序排列：must → review → other → exclude", async () => {
    const records = [
      makePCCRecord({ title: "道路工程", jobNumber: "J004" }),
      makePCCRecord({ title: "課後服務", jobNumber: "J003" }),
      makePCCRecord({ title: "食農教育", jobNumber: "J001" }),
      makePCCRecord({ title: "燈節策展", jobNumber: "J002" }),
    ];
    mockPCCSuccess(makePCCResponse(records));
    mockFutureDetails(2); // 只有 must（食農教育）+ review（燈節）打 detail

    const req = makeRequest({ keywords: ["測試"] });
    const res = await POST(req);
    const body = await res.json();

    const categories = body.results.map((r: { classification: { category: string } }) => r.classification.category);
    expect(categories).toEqual(["must", "review", "other", "exclude"]);
  });

  it("部分關鍵字搜尋失敗時繼續處理其他關鍵字", async () => {
    mockPCCSuccess(makePCCResponse([
      makePCCRecord({ title: "食農教育推廣", jobNumber: "J001" }),
    ]));
    mockPCCError(500);
    mockFutureDetails(1);

    const req = makeRequest({ keywords: ["食農教育", "壞掉的"] });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200); // 整體不失敗
    expect(body.results).toHaveLength(1);
    expect(body.errors).toHaveLength(1);
    expect(body.errors[0].keyword).toBe("壞掉的");
  });

  it("PCC 回傳多頁時根據 maxPages 翻頁", async () => {
    const page1Response = {
      query: "藝術",
      page: 1,
      total_records: 30,
      total_pages: 2,
      took: 100,
      records: [makePCCRecord({ title: "藝術計畫一", jobNumber: "J001" })],
    };
    const page2Response = {
      query: "藝術",
      page: 2,
      total_records: 30,
      total_pages: 2,
      took: 100,
      records: [makePCCRecord({ title: "藝術計畫二", jobNumber: "J002" })],
    };
    mockPCCSuccess(page1Response);
    mockPCCSuccess(page2Response);
    mockFutureDetails(2);

    const req = makeRequest({ keywords: ["藝術"], maxPages: 2 });
    const res = await POST(req);
    const body = await res.json();

    expect(body.results).toHaveLength(2);
    expect(mockFetch).toHaveBeenCalledTimes(4); // 2 search + 2 detail
  });

  it("ScanTender 欄位正確轉換（含 detail 填入的預算和截標日）", async () => {
    const record = makePCCRecord({
      title: "食農教育推廣",
      jobNumber: "J001",
      unitName: "農業局",
      type: "招標公告",
    });
    mockPCCSuccess(makePCCResponse([record]));
    mockDetailSuccess("115/04/15", "500,000元");

    const req = makeRequest({ keywords: ["食農教育"] });
    const res = await POST(req);
    const body = await res.json();

    const tender = body.results[0].tender;
    expect(tender.title).toBe("食農教育推廣");
    expect(tender.unit).toBe("農業局");
    expect(tender.jobNumber).toBe("J001");
    expect(tender.budget).toBe(500000); // detail 填入的預算
    expect(tender.deadline).toBe("115/04/15"); // detail 填入的截標日
    expect(tender.category).toBe("招標公告");
  });

  it("maxPages 預設為 1（不翻頁）", async () => {
    const response = {
      query: "藝術",
      page: 1,
      total_records: 100,
      total_pages: 5,
      took: 100,
      records: [makePCCRecord({ title: "藝術計畫", jobNumber: "J001" })],
    };
    mockPCCSuccess(response);
    mockFutureDetails(1);

    const req = makeRequest({ keywords: ["藝術"] });
    const res = await POST(req);
    const body = await res.json();

    expect(body.results).toHaveLength(1);
    expect(mockFetch).toHaveBeenCalledTimes(2); // 1 search + 1 detail
  });
});

// ── 過期過濾 ───────────────────────────────────────────────

describe("POST /api/scan — 過期標案過濾", () => {
  it("決標公告不會出現在結果中（不打 detail）", async () => {
    const records = [
      makePCCRecord({ title: "食農教育推廣", jobNumber: "J001", type: "招標公告" }),
      makePCCRecord({ title: "藝術活動", jobNumber: "J002", type: "決標公告" }),
    ];
    mockPCCSuccess(makePCCResponse(records));
    mockFutureDetails(1); // J001（must）打 detail；J002（決標公告）Phase 1 就擋掉

    const req = makeRequest({ keywords: ["測試"] });
    const res = await POST(req);
    const body = await res.json();

    expect(body.results).toHaveLength(1);
    expect(body.results[0].tender.jobNumber).toBe("J001");
    expect(body.filteredExpired).toBe(1);
  });

  it("無法決標公告和撤銷公告也被過濾", async () => {
    const records = [
      makePCCRecord({ title: "案子A", jobNumber: "J001", type: "無法決標公告" }),
      makePCCRecord({ title: "案子B", jobNumber: "J002", type: "撤銷公告" }),
      makePCCRecord({ title: "案子C", jobNumber: "J003", type: "招標公告" }),
    ];
    mockPCCSuccess(makePCCResponse(records));
    // J001/J002 Phase 1 擋掉（決標/撤銷），J003 是 other → 不打 detail，不需要 mock

    const req = makeRequest({ keywords: ["測試"] });
    const res = await POST(req);
    const body = await res.json();

    expect(body.results).toHaveLength(1);
    expect(body.filteredExpired).toBe(2);
  });

  it("截標日已過的標案被過濾（用 detail API 實際截標日）", async () => {
    // 必須用 must/review 標題，才會打 detail 並做截標日過濾
    const records = [
      makePCCRecord({ title: "食農教育推廣", jobNumber: "J001" }), // must → 打 detail
      makePCCRecord({ title: "藝術展覽活動", jobNumber: "J002" }), // must → 打 detail
    ];
    mockPCCSuccess(makePCCResponse(records));
    // J001: 未來截標日 → 保留
    mockDetailSuccess("115/06/01", "5,000,000元");
    // J002: 過去截標日 → 過濾
    mockDetailSuccess("114/01/15", "5,000,000元");

    const req = makeRequest({ keywords: ["測試"] });
    const res = await POST(req);
    const body = await res.json();

    expect(body.results).toHaveLength(1);
    expect(body.results[0].tender.jobNumber).toBe("J001");
    expect(body.filteredExpired).toBe(1);
  });

  it("detail API 查不到截標日時保守保留（不過濾）", async () => {
    // 必須用 must/review 標題，才會嘗試打 detail
    mockPCCSuccess(makePCCResponse([
      makePCCRecord({ title: "食農教育招標中", jobNumber: "J001" }),
    ]));
    // detail 回傳失敗 → 保守保留（不過濾）
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    const req = makeRequest({ keywords: ["測試"] });
    const res = await POST(req);
    const body = await res.json();

    expect(body.results).toHaveLength(1);
    expect(body.filteredExpired).toBe(0);
  });

  it("filteredExpired=0 當沒有過期標案", async () => {
    // 必須用 must/review 標題，才會打 detail 並驗證截標日
    mockPCCSuccess(makePCCResponse([
      makePCCRecord({ title: "食農教育招標中", jobNumber: "J001" }),
    ]));
    mockFutureDetails(1);

    const req = makeRequest({ keywords: ["測試"] });
    const res = await POST(req);
    const body = await res.json();

    expect(body.filteredExpired).toBe(0);
    expect(body.results).toHaveLength(1);
  });
});

// ── 效能優化：only must/review 打 detail ─────────────────────

describe("POST /api/scan — detail API 呼叫控制", () => {
  it("other 和 exclude 不打 detail API（fetch 呼叫次數驗證）", async () => {
    const records = [
      makePCCRecord({ title: "道路工程", jobNumber: "J001" }),   // other
      makePCCRecord({ title: "課後服務", jobNumber: "J002" }),   // exclude
    ];
    mockPCCSuccess(makePCCResponse(records));
    // other + exclude 應跳過 detail，所以只有 1 次 search fetch

    const req = makeRequest({ keywords: ["測試"] });
    await POST(req);

    expect(mockFetch).toHaveBeenCalledTimes(1); // 只有 1 次 search，無 detail
  });

  it("other 類別的 budget 和 deadline 保持空（不填充）", async () => {
    const records = [makePCCRecord({ title: "道路工程", jobNumber: "J001" })];
    mockPCCSuccess(makePCCResponse(records));

    const req = makeRequest({ keywords: ["測試"] });
    const res = await POST(req);
    const body = await res.json();

    const tender = body.results[0].tender;
    expect(tender.budget).toBe(0);     // brief 不含預算，且 other 跳過 detail
    expect(tender.deadline).toBe(""); // brief 不含截標日，且 other 跳過 detail
  });

  it("PCC 回傳 HTML（端點異常）時拋出錯誤並記錄", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "text/html; charset=utf-8" }),
      json: async () => ({}),
    });

    const req = makeRequest({ keywords: ["測試"] });
    const res = await POST(req);
    const body = await res.json();

    expect(body.errors).toHaveLength(1);
    expect(body.errors[0].error).toMatch(/非預期格式/);
  });

  it("PCC 回傳 429 時顯示友善的限流訊息", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({}),
    });

    const req = makeRequest({ keywords: ["測試"] });
    const res = await POST(req);
    const body = await res.json();

    expect(body.errors).toHaveLength(1);
    expect(body.errors[0].error).toMatch(/請求過於頻繁/);
  });
});

// ── isDeadlinePassed 民國年解析 ──────────────────────────────

describe("截標日期解析", () => {
  // 直接測試 route 的行為：用 detail mock 傳不同格式
  it("民國年格式 115/04/15 正確解析", async () => {
    // 必須用 must/review 標題，才會打 detail 並解析截標日
    mockPCCSuccess(makePCCResponse([
      makePCCRecord({ title: "食農教育測試案", jobNumber: "J001" }),
    ]));
    mockDetailSuccess("115/04/15"); // 2026/04/15，未來

    const req = makeRequest({ keywords: ["測試"] });
    const res = await POST(req);
    const body = await res.json();

    expect(body.results).toHaveLength(1); // 未過期，保留
  });

  it("西元年格式 2025/01/01 已過期", async () => {
    // 必須用 must/review 標題，才會打 detail 並過濾過期截標日
    mockPCCSuccess(makePCCResponse([
      makePCCRecord({ title: "食農教育測試案", jobNumber: "J001" }),
    ]));
    mockDetailSuccess("2025/01/01"); // 過去

    const req = makeRequest({ keywords: ["測試"] });
    const res = await POST(req);
    const body = await res.json();

    expect(body.results).toHaveLength(0); // 已過期，過濾
    expect(body.filteredExpired).toBe(1);
  });
});
