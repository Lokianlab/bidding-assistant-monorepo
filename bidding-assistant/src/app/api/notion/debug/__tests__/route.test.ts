import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock fetch ──────────────────────────────────────────────

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// ── Mock next/server ────────────────────────────────────────

vi.mock("next/server", () => ({
  NextRequest: class {
    private body: unknown;
    constructor(_url: string, init?: { body?: string }) {
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

import { POST } from "../../debug/route";
import { NextRequest } from "next/server";

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/notion/debug", {
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Schema fetch error ──────────────────────────────────────

describe("Notion debug route — schema fetch error", () => {
  it("schema API 回傳 401 → 401 + 錯誤訊息", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    });
    const req = makeRequest({ token: "ntn_xxx", databaseId: "db123" });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain("schema");
  });

  it("schema API 回傳 404 → 404", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    });
    const req = makeRequest({ token: "ntn_xxx", databaseId: "db123" });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });
});

// ── Query fetch error ───────────────────────────────────────

describe("Notion debug route — query fetch error", () => {
  it("query API 回傳 500 → 500 + 錯誤訊息", async () => {
    // Schema succeeds
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        title: [{ plain_text: "DB" }],
        properties: { 名稱: { type: "title" } },
      }),
    });
    // Query fails
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });
    const req = makeRequest({ token: "ntn_xxx", databaseId: "db123" });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain("查詢資料");
  });
});

// ── Successful debug ────────────────────────────────────────

describe("Notion debug route — successful response", () => {
  function mockSchemaAndQuery(
    schema: { title?: { plain_text: string }[]; properties?: Record<string, unknown> },
    queryResults: unknown[],
  ) {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => schema,
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: queryResults,
      }),
    });
  }

  it("回傳 dbTitle + schemaFields + firstPageFields", async () => {
    mockSchemaAndQuery(
      {
        title: [{ plain_text: "標案追蹤" }],
        properties: {
          名稱: { type: "title" },
          預算: { type: "number" },
        },
      },
      [
        {
          properties: {
            名稱: { type: "title", title: [{ plain_text: "標案A" }] },
            預算: { type: "number", number: 500000 },
          },
        },
      ],
    );

    const req = makeRequest({ token: "ntn_xxx", databaseId: "db123" });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.dbTitle).toBe("標案追蹤");
    expect(body.schemaFields).toContain("名稱");
    expect(body.schemaFields).toContain("預算");
    expect(body.totalResults).toBe(1);
    expect(body.firstPageFields["名稱"].type).toBe("title");
    expect(body.firstPageFields["名稱"].sampleValue).toBe("標案A");
    expect(body.firstPageFields["預算"].sampleValue).toBe(500000);
  });

  it("無 title 時顯示 (no title)", async () => {
    mockSchemaAndQuery(
      { properties: { col: { type: "title" } } },
      [],
    );
    const req = makeRequest({ token: "ntn_xxx", databaseId: "db123" });
    const res = await POST(req);
    const body = await res.json();
    expect(body.dbTitle).toBe("(no title)");
    expect(body.totalResults).toBe(0);
  });

  it("無 properties 時 schemaFields 為空陣列", async () => {
    mockSchemaAndQuery(
      { title: [{ plain_text: "DB" }] },
      [],
    );
    const req = makeRequest({ token: "ntn_xxx", databaseId: "db123" });
    const res = await POST(req);
    const body = await res.json();
    expect(body.schemaFields).toEqual([]);
  });
});

// ── Property type sample values ─────────────────────────────

describe("Notion debug route — property sample values", () => {
  function mockWithProperties(properties: Record<string, unknown>) {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        title: [{ plain_text: "DB" }],
        properties: {},
      }),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [{ properties }],
      }),
    });
  }

  it("rich_text → 合併文字", async () => {
    mockWithProperties({
      備註: { type: "rich_text", rich_text: [{ plain_text: "A" }, { plain_text: "B" }] },
    });
    const req = makeRequest({ token: "t", databaseId: "d" });
    const res = await POST(req);
    const body = await res.json();
    expect(body.firstPageFields["備註"].sampleValue).toBe("AB");
  });

  it("select → name", async () => {
    mockWithProperties({
      進程: { type: "select", select: { name: "準備中" } },
    });
    const req = makeRequest({ token: "t", databaseId: "d" });
    const res = await POST(req);
    const body = await res.json();
    expect(body.firstPageFields["進程"].sampleValue).toBe("準備中");
  });

  it("null select → null", async () => {
    mockWithProperties({
      進程: { type: "select", select: null },
    });
    const req = makeRequest({ token: "t", databaseId: "d" });
    const res = await POST(req);
    const body = await res.json();
    expect(body.firstPageFields["進程"].sampleValue).toBeNull();
  });

  it("multi_select → names 陣列", async () => {
    mockWithProperties({
      標籤: { type: "multi_select", multi_select: [{ name: "A" }, { name: "B" }] },
    });
    const req = makeRequest({ token: "t", databaseId: "d" });
    const res = await POST(req);
    const body = await res.json();
    expect(body.firstPageFields["標籤"].sampleValue).toEqual(["A", "B"]);
  });

  it("date → start 值", async () => {
    mockWithProperties({
      截標: { type: "date", date: { start: "2026-03-01" } },
    });
    const req = makeRequest({ token: "t", databaseId: "d" });
    const res = await POST(req);
    const body = await res.json();
    expect(body.firstPageFields["截標"].sampleValue).toBe("2026-03-01");
  });

  it("null date → null", async () => {
    mockWithProperties({
      截標: { type: "date", date: null },
    });
    const req = makeRequest({ token: "t", databaseId: "d" });
    const res = await POST(req);
    const body = await res.json();
    expect(body.firstPageFields["截標"].sampleValue).toBeNull();
  });

  it("status → name", async () => {
    mockWithProperties({
      狀態: { type: "status", status: { name: "進行中" } },
    });
    const req = makeRequest({ token: "t", databaseId: "d" });
    const res = await POST(req);
    const body = await res.json();
    expect(body.firstPageFields["狀態"].sampleValue).toBe("進行中");
  });

  it("checkbox → boolean", async () => {
    mockWithProperties({
      已確認: { type: "checkbox", checkbox: true },
    });
    const req = makeRequest({ token: "t", databaseId: "d" });
    const res = await POST(req);
    const body = await res.json();
    expect(body.firstPageFields["已確認"].sampleValue).toBe(true);
  });

  it("people → names 陣列（無名用 id）", async () => {
    mockWithProperties({
      負責人: { type: "people", people: [{ id: "u1", name: "Jin" }, { id: "u2" }] },
    });
    const req = makeRequest({ token: "t", databaseId: "d" });
    const res = await POST(req);
    const body = await res.json();
    expect(body.firstPageFields["負責人"].sampleValue).toEqual(["Jin", "u2"]);
  });

  it("未知類型 → 括號標示類型名", async () => {
    mockWithProperties({
      神秘: { type: "rollup" },
    });
    const req = makeRequest({ token: "t", databaseId: "d" });
    const res = await POST(req);
    const body = await res.json();
    expect(body.firstPageFields["神秘"].sampleValue).toBe("(rollup)");
  });
});

// ── Error handling ──────────────────────────────────────────

describe("Notion debug route — error handling", () => {
  it("fetch 拋出例外 → 500", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network failure"));
    const req = makeRequest({ token: "ntn_xxx", databaseId: "db123" });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Network failure");
  });

  it("錯誤訊息中的 Bearer token 被遮蔽", async () => {
    mockFetch.mockRejectedValueOnce(
      new Error("Failed: Bearer ntn_secret_123 was rejected"),
    );
    const req = makeRequest({ token: "ntn_xxx", databaseId: "db123" });
    const res = await POST(req);
    const body = await res.json();
    expect(body.error).not.toContain("ntn_secret_123");
    expect(body.error).toContain("[REDACTED]");
  });

  it("非 Error 例外 → Unknown error", async () => {
    mockFetch.mockRejectedValueOnce("string error");
    const req = makeRequest({ token: "ntn_xxx", databaseId: "db123" });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Unknown error");
  });
});
