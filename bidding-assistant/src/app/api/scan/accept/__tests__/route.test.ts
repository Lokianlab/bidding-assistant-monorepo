import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../route";

// ── mock notion-mapper ────────────────────────────────────
vi.mock("@/lib/scan/notion-mapper", () => ({
  mapTenderToNotionProperties: vi.fn(() => ({ 標案名稱: { title: [{ text: { content: "測試" } }] } })),
  buildCreatePageBody: vi.fn((dbId: string, props: unknown) => ({
    parent: { database_id: dbId },
    properties: props,
  })),
}));

// ── mock global fetch ─────────────────────────────────────
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const baseTender = {
  title: "食農教育推廣計畫",
  unit: "農業部",
  jobNumber: "1130101",
  budget: 500000,
  deadline: "20260330",
  publishDate: "20260228",
  url: "https://web.pcc.gov.tw/tps/main/pcc/tps/atm/atmAwardAction.do?newEdit=false&uploadType=&abstractId=XXX",
};

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/scan/accept", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/scan/accept — 參數驗證", () => {
  beforeEach(() => mockFetch.mockReset());

  it("token 缺少時回傳 400", async () => {
    const req = makeRequest({ tender: baseTender, databaseId: "abc-123" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("token");
  });

  it("databaseId 缺少時回傳 400", async () => {
    const req = makeRequest({ tender: baseTender, token: "secret_xxx" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("databaseId");
  });

  it("tender 缺少時回傳 400", async () => {
    const req = makeRequest({ token: "secret_xxx", databaseId: "abc-123" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("標案資料");
  });

  it("tender.title 為空字串時回傳 400", async () => {
    const req = makeRequest({ tender: { ...baseTender, title: "" }, token: "t", databaseId: "d" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("無效 JSON 時回傳 400", async () => {
    const req = new NextRequest("http://localhost/api/scan/accept", {
      method: "POST",
      body: "not-json",
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("格式");
  });
});

describe("POST /api/scan/accept — Notion API 呼叫", () => {
  beforeEach(() => mockFetch.mockReset());

  it("Notion API 成功時回傳 notionPageId", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ id: "page-id-abc" }),
    });

    const req = makeRequest({ tender: baseTender, token: "secret_xxx", databaseId: "db-123" });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.notionPageId).toBe("page-id-abc");
  });

  it("Notion API 帶正確 headers 呼叫", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ id: "page-xyz" }),
    });

    const req = makeRequest({ tender: baseTender, token: "my-token", databaseId: "db-456" });
    await POST(req);

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.notion.com/v1/pages",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer my-token",
          "Notion-Version": "2022-06-28",
        }),
      }),
    );
  });

  it("Notion API 回傳錯誤時傳遞 error message", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ message: "資料庫欄位格式錯誤" }),
    });

    const req = makeRequest({ tender: baseTender, token: "t", databaseId: "d" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("資料庫欄位格式錯誤");
  });

  it("Notion API 無 message 時回傳預設錯誤", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    });

    const req = makeRequest({ tender: baseTender, token: "t", databaseId: "d" });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBeTruthy();
  });

  it("fetch 拋出例外時回傳 500", async () => {
    mockFetch.mockRejectedValueOnce(new Error("網路斷線"));

    const req = makeRequest({ tender: baseTender, token: "t", databaseId: "d" });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toContain("網路斷線");
  });
});
