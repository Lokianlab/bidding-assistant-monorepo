import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock @notionhq/client ───────────────────────────────────

vi.mock("@notionhq/client", () => ({
  Client: class {
    pages = {
      update: vi.fn().mockResolvedValue({}),
    };
  },
}));

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

import { POST } from "../route";
import { NextRequest } from "next/server";

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/notion", {
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Input validation ────────────────────────────────────────

describe("Notion API route — input validation", () => {
  it("缺少 token → 400", async () => {
    const req = makeRequest({ databaseId: "db123", action: "query" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("token");
  });

  it("缺少 databaseId → 400", async () => {
    const req = makeRequest({ token: "ntn_xxx", action: "query" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("databaseId");
  });

  it("未知 action → 400", async () => {
    const req = makeRequest({
      token: "ntn_xxx",
      databaseId: "db123",
      action: "delete_everything",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("未知的 action");
  });

  it("continue_query 缺少 cursor → 400", async () => {
    const req = makeRequest({
      token: "ntn_xxx",
      databaseId: "db123",
      action: "continue_query",
      data: {},
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("cursor");
  });
});

// ── Query action ────────────────────────────────────────────

describe("Notion API route — query action", () => {
  const base = { token: "ntn_xxx", databaseId: "db123" };

  it("query 成功回傳 parsed pages", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        results: [
          {
            id: "page-1",
            url: "https://notion.so/page-1",
            created_time: "2026-01-01T00:00:00.000Z",
            last_edited_time: "2026-01-02T00:00:00.000Z",
            properties: {
              名稱: { type: "title", title: [{ plain_text: "標案A" }] },
              預算: { type: "number", number: 1000000 },
              進程: { type: "select", select: { name: "準備中" } },
              截標: { type: "date", date: { start: "2026-03-01" } },
            },
          },
        ],
        has_more: false,
        next_cursor: null,
      }),
    });

    const req = makeRequest({ ...base, action: "query" });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.pages).toHaveLength(1);
    expect(body.pages[0].properties["名稱"]).toBe("標案A");
    expect(body.pages[0].properties["預算"]).toBe(1000000);
    expect(body.pages[0].properties["進程"]).toBe("準備中");
    expect(body.pages[0].properties["截標"]).toBe("2026-03-01");
    expect(body.hasMore).toBe(false);
  });

  it("query Notion 錯誤 → 轉發 status", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ message: "Invalid token" }),
    });
    const req = makeRequest({ ...base, action: "query" });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });
});

// ── Schema action ───────────────────────────────────────────

describe("Notion API route — schema action", () => {
  const base = { token: "ntn_xxx", databaseId: "db123" };

  it("schema 回傳欄位清單", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        title: [{ plain_text: "標案追蹤" }],
        properties: {
          名稱: { type: "title", id: "title" },
          進程: {
            type: "select",
            id: "abc",
            select: {
              options: [{ name: "準備中" }, { name: "已投遞" }],
            },
          },
          標籤: {
            type: "multi_select",
            id: "def",
            multi_select: {
              options: [{ name: "文化" }, { name: "教育" }],
            },
          },
        },
      }),
    });

    const req = makeRequest({ ...base, action: "schema" });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.title).toBe("標案追蹤");
    expect(body.schema["名稱"].type).toBe("title");
    expect(body.schema["進程"].options).toEqual(["準備中", "已投遞"]);
    expect(body.schema["標籤"].options).toEqual(["文化", "教育"]);
  });
});

// ── Property type parsing ───────────────────────────────────

describe("Notion API route — property parsing", () => {
  const base = { token: "ntn_xxx", databaseId: "db123" };

  function mockQueryWith(properties: Record<string, unknown>) {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          {
            id: "p1",
            url: "https://notion.so/p1",
            created_time: "2026-01-01T00:00:00.000Z",
            last_edited_time: "2026-01-01T00:00:00.000Z",
            properties,
          },
        ],
        has_more: false,
        next_cursor: null,
      }),
    });
  }

  it("解析 rich_text 類型", async () => {
    mockQueryWith({
      備註: { type: "rich_text", rich_text: [{ plain_text: "重要" }, { plain_text: "備忘" }] },
    });
    const req = makeRequest({ ...base, action: "query" });
    const res = await POST(req);
    const body = await res.json();
    expect(body.pages[0].properties["備註"]).toBe("重要備忘");
  });

  it("解析 checkbox 類型", async () => {
    mockQueryWith({
      已確認: { type: "checkbox", checkbox: true },
    });
    const req = makeRequest({ ...base, action: "query" });
    const res = await POST(req);
    const body = await res.json();
    expect(body.pages[0].properties["已確認"]).toBe(true);
  });

  it("解析 url 類型", async () => {
    mockQueryWith({
      連結: { type: "url", url: "https://example.com" },
    });
    const req = makeRequest({ ...base, action: "query" });
    const res = await POST(req);
    const body = await res.json();
    expect(body.pages[0].properties["連結"]).toBe("https://example.com");
  });

  it("解析 status 類型", async () => {
    mockQueryWith({
      狀態: { type: "status", status: { name: "進行中" } },
    });
    const req = makeRequest({ ...base, action: "query" });
    const res = await POST(req);
    const body = await res.json();
    expect(body.pages[0].properties["狀態"]).toBe("進行中");
  });

  it("解析 multi_select 類型", async () => {
    mockQueryWith({
      標籤: {
        type: "multi_select",
        multi_select: [{ name: "文化" }, { name: "教育" }],
      },
    });
    const req = makeRequest({ ...base, action: "query" });
    const res = await POST(req);
    const body = await res.json();
    expect(body.pages[0].properties["標籤"]).toEqual(["文化", "教育"]);
  });

  it("解析 people 類型", async () => {
    mockQueryWith({
      負責人: {
        type: "people",
        people: [{ id: "u1", name: "Jin" }, { id: "u2" }],
      },
    });
    const req = makeRequest({ ...base, action: "query" });
    const res = await POST(req);
    const body = await res.json();
    expect(body.pages[0].properties["負責人"]).toEqual(["Jin", "u2"]);
  });

  it("解析 unique_id 類型", async () => {
    mockQueryWith({
      編號: { type: "unique_id", unique_id: { prefix: "BID", number: 42 } },
    });
    const req = makeRequest({ ...base, action: "query" });
    const res = await POST(req);
    const body = await res.json();
    expect(body.pages[0].properties["編號"]).toBe("BID-42");
  });

  it("解析 formula (number) 類型", async () => {
    mockQueryWith({
      公式欄: { type: "formula", formula: { type: "number", number: 99 } },
    });
    const req = makeRequest({ ...base, action: "query" });
    const res = await POST(req);
    const body = await res.json();
    expect(body.pages[0].properties["公式欄"]).toBe(99);
  });

  it("未知類型 → null", async () => {
    mockQueryWith({
      神秘欄位: { type: "unsupported_type" },
    });
    const req = makeRequest({ ...base, action: "query" });
    const res = await POST(req);
    const body = await res.json();
    expect(body.pages[0].properties["神秘欄位"]).toBeNull();
  });

  it("null select → null", async () => {
    mockQueryWith({
      分類: { type: "select", select: null },
    });
    const req = makeRequest({ ...base, action: "query" });
    const res = await POST(req);
    const body = await res.json();
    expect(body.pages[0].properties["分類"]).toBeNull();
  });

  it("null date → null", async () => {
    mockQueryWith({
      截標: { type: "date", date: null },
    });
    const req = makeRequest({ ...base, action: "query" });
    const res = await POST(req);
    const body = await res.json();
    expect(body.pages[0].properties["截標"]).toBeNull();
  });
});

// ── Error handling ──────────────────────────────────────────

describe("Notion API route — error handling", () => {
  const base = { token: "ntn_xxx", databaseId: "db123" };

  it("unauthorized error → friendly message", async () => {
    const req = makeRequest({ ...base, action: "query" });
    // Simulate Notion throwing an error object
    mockFetch.mockRejectedValueOnce({
      code: "unauthorized",
      message: "API token is invalid",
      status: 401,
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain("Token 無效");
  });

  it("object_not_found → friendly message", async () => {
    mockFetch.mockRejectedValueOnce({
      code: "object_not_found",
      message: "Could not find database",
      status: 404,
    });
    const req = makeRequest({ ...base, action: "query" });
    const res = await POST(req);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain("找不到資料庫");
  });

  it("validation_error → prefixed message", async () => {
    mockFetch.mockRejectedValueOnce({
      code: "validation_error",
      message: "Invalid filter format",
      status: 400,
    });
    const req = makeRequest({ ...base, action: "query" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("格式錯誤");
    expect(body.code).toBe("validation_error");
  });
});
