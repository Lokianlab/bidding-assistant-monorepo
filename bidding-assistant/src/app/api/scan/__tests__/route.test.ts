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

function makePCCRecord(overrides: {
  title: string;
  jobNumber?: string;
  unitName?: string;
  unitId?: string;
  type?: string;
}) {
  return {
    date: 20260228,
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
});

describe("POST /api/scan", () => {
  it("使用自訂關鍵字搜尋並回傳分類結果", async () => {
    const records = [
      makePCCRecord({ title: "食農教育推廣計畫", jobNumber: "J001" }),
      makePCCRecord({ title: "道路養護工程", jobNumber: "J002" }),
    ];
    mockPCCSuccess(makePCCResponse(records, "食農教育"));

    const req = makeRequest({ keywords: ["食農教育"] });
    const res = await POST(req);
    const body = await res.json();

    expect(body.results).toHaveLength(2);
    expect(body.counts.must).toBe(1); // 食農教育
    expect(body.counts.other).toBe(1); // 道路養護（預算=0，不觸發預算規則）
    expect(body.searchKeywords).toEqual(["食農教育"]);
    expect(body.scannedAt).toBeDefined();
    expect(body.totalRaw).toBe(2);
  });

  it("多個關鍵字搜尋且自動去重", async () => {
    const sharedRecord = makePCCRecord({ title: "藝術活動計畫", jobNumber: "J001", unitId: "u1" });

    // 第一個關鍵字回傳 J001
    mockPCCSuccess(makePCCResponse([sharedRecord], "藝術"));
    // 第二個關鍵字也回傳 J001（應去重）
    mockPCCSuccess(makePCCResponse([sharedRecord], "活動"));

    const req = makeRequest({ keywords: ["藝術", "活動"] });
    const res = await POST(req);
    const body = await res.json();

    expect(body.results).toHaveLength(1); // 去重後只有 1 筆
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

    const req = makeRequest({ keywords: ["測試"] });
    const res = await POST(req);
    const body = await res.json();

    const categories = body.results.map((r: { classification: { category: string } }) => r.classification.category);
    expect(categories).toEqual(["must", "review", "other", "exclude"]);
  });

  it("部分關鍵字搜尋失敗時繼續處理其他關鍵字", async () => {
    // 第一個關鍵字成功
    mockPCCSuccess(makePCCResponse([
      makePCCRecord({ title: "食農教育推廣", jobNumber: "J001" }),
    ]));
    // 第二個關鍵字失敗
    mockPCCError(500);

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

    const req = makeRequest({ keywords: ["藝術"], maxPages: 2 });
    const res = await POST(req);
    const body = await res.json();

    expect(body.results).toHaveLength(2);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("ScanTender 欄位正確轉換", async () => {
    const record = makePCCRecord({
      title: "食農教育推廣",
      jobNumber: "J001",
      unitName: "農業局",
      type: "招標公告",
    });
    mockPCCSuccess(makePCCResponse([record]));

    const req = makeRequest({ keywords: ["食農教育"] });
    const res = await POST(req);
    const body = await res.json();

    const tender = body.results[0].tender;
    expect(tender.title).toBe("食農教育推廣");
    expect(tender.unit).toBe("農業局");
    expect(tender.jobNumber).toBe("J001");
    expect(tender.budget).toBe(0); // brief 不含預算
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

    const req = makeRequest({ keywords: ["藝術"] });
    const res = await POST(req);
    const body = await res.json();

    expect(body.results).toHaveLength(1);
    expect(mockFetch).toHaveBeenCalledTimes(1); // 只搜一頁
  });
});
