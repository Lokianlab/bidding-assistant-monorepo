import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock fetch globally ──────────────────────────────────────

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// ── Mock NextRequest / NextResponse ──────────────────────────

vi.mock("next/server", () => ({
  NextRequest: class {
    private body: unknown;
    constructor(url: string, init?: { method?: string; body?: string }) {
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
  return new NextRequest("http://localhost:3000/api/pcc", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// ── Helpers ─────────────────────────────────────────────────

function mockFetchSuccess(data: unknown) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    headers: new Headers({ "content-type": "application/json" }),
    json: async () => data,
  });
}

function mockFetchError(status: number) {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status,
    headers: new Headers(),
  });
}

function mockFetchHtml() {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    headers: new Headers({ "content-type": "text/html; charset=utf-8" }),
    json: async () => ({}),
  });
}

// ── Tests ───────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PCC API route — input validation", () => {
  it("searchByTitle 缺少 query → 400", async () => {
    const req = makeRequest({ action: "searchByTitle", data: {} });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("搜尋關鍵字");
  });

  it("searchByCompany 缺少 query → 400", async () => {
    const req = makeRequest({ action: "searchByCompany", data: {} });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("廠商名稱");
  });

  it("getTenderDetail 缺少 unitId → 400", async () => {
    const req = makeRequest({
      action: "getTenderDetail",
      data: { jobNumber: "123" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("unitId");
  });

  it("getTenderDetail 缺少 jobNumber → 400", async () => {
    const req = makeRequest({
      action: "getTenderDetail",
      data: { unitId: "ABC" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("jobNumber");
  });

  it("listByUnit 缺少 unitId → 400", async () => {
    const req = makeRequest({ action: "listByUnit", data: {} });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("unitId");
  });

  it("未知 action → 400", async () => {
    const req = makeRequest({ action: "unknownAction", data: {} });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("未知的 action");
  });
});

describe("PCC API route — successful requests", () => {
  it("searchByTitle 帶 query → 200 + 正確 endpoint", async () => {
    mockFetchSuccess({ records: [{ title: "test" }] });
    const req = makeRequest({
      action: "searchByTitle",
      data: { query: "道路", page: 2 },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const url = mockFetch.mock.calls[0][0];
    expect(url).toContain("/searchbytitle");
    expect(url).toContain("query=%E9%81%93%E8%B7%AF"); // encoded "道路"
    expect(url).toContain("page=2");
  });

  it("searchByCompany 帶 query → 200", async () => {
    mockFetchSuccess({ records: [] });
    const req = makeRequest({
      action: "searchByCompany",
      data: { query: "大員洛川" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const url = mockFetch.mock.calls[0][0];
    expect(url).toContain("/searchbycompanyname");
  });

  it("getTenderDetail 帶完整參數 → 200", async () => {
    mockFetchSuccess({ tender: { name: "test" } });
    const req = makeRequest({
      action: "getTenderDetail",
      data: { unitId: "ABC", jobNumber: "123" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const url = mockFetch.mock.calls[0][0];
    expect(url).toContain("/tender");
    expect(url).toContain("unit_id=ABC");
    expect(url).toContain("job_number=123");
  });

  it("listByUnit 帶 unitId → 200", async () => {
    mockFetchSuccess({ tenders: [] });
    const req = makeRequest({
      action: "listByUnit",
      data: { unitId: "XYZ" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const url = mockFetch.mock.calls[0][0];
    expect(url).toContain("/listbyunit");
    expect(url).toContain("unit_id=XYZ");
  });

  it("getInfo 不需參數 → 200", async () => {
    mockFetchSuccess({ info: "ok" });
    const req = makeRequest({ action: "getInfo", data: {} });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const url = mockFetch.mock.calls[0][0];
    expect(url).toContain("/getinfo");
  });

  it("searchByTitle 預設 page=1", async () => {
    mockFetchSuccess({ records: [] });
    const req = makeRequest({
      action: "searchByTitle",
      data: { query: "test" },
    });
    await POST(req);
    const url = mockFetch.mock.calls[0][0];
    expect(url).toContain("page=1");
  });
});

describe("PCC API route — error handling", () => {
  it("PCC API 回傳 429 → 500 + rate limit 訊息", async () => {
    mockFetchError(429);
    const req = makeRequest({
      action: "searchByTitle",
      data: { query: "test" },
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain("頻繁");
  });

  it("PCC API 回傳 500 → 500 + error 訊息", async () => {
    mockFetchError(500);
    const req = makeRequest({
      action: "searchByTitle",
      data: { query: "test" },
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain("PCC API 錯誤");
  });

  it("PCC API 回傳 HTML → 500 + 格式錯誤訊息", async () => {
    mockFetchHtml();
    const req = makeRequest({
      action: "searchByTitle",
      data: { query: "test" },
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain("非預期格式");
  });

  it("fetch 拋出例外 → 500 + 通用錯誤", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network failure"));
    const req = makeRequest({
      action: "searchByTitle",
      data: { query: "test" },
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Network failure");
  });
});
