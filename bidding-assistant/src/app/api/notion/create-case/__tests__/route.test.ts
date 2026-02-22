import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../route";
import { NextRequest } from "next/server";

// mock notion-mapper（只測 route 的路由邏輯，mapper 有自己的測試）
vi.mock("@/lib/scan/notion-mapper", () => ({
  mapTenderToNotionProperties: vi.fn(() => ({
    名稱: { title: [{ text: { content: "測試標案" } }] },
  })),
}));

const MOCK_TOKEN = "ntn_test_token";
const MOCK_DB_ID = "db-id-123";
const MOCK_TENDER = {
  title: "測試食農教育推廣計畫",
  unit: "新北市教育局",
  jobNumber: "TEST-001",
  budget: 0,
  deadline: "",
  publishDate: "20260226",
  url: "https://pcc.gov.tw/test",
  category: "勞務",
};

function makeReq(body: unknown) {
  return new NextRequest("http://localhost/api/notion/create-case", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/notion/create-case", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("缺少 token → 400", async () => {
    const res = await POST(makeReq({ databaseId: MOCK_DB_ID, tender: MOCK_TENDER }));
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/token/);
  });

  it("缺少 databaseId → 400", async () => {
    const res = await POST(makeReq({ token: MOCK_TOKEN, tender: MOCK_TENDER }));
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/databaseId/);
  });

  it("tender 無 title → 400", async () => {
    const res = await POST(makeReq({ token: MOCK_TOKEN, databaseId: MOCK_DB_ID, tender: { unit: "機關" } }));
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/標案資料/);
  });

  it("tender 為 null → 400", async () => {
    const res = await POST(makeReq({ token: MOCK_TOKEN, databaseId: MOCK_DB_ID, tender: null }));
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/標案資料/);
  });

  it("Notion API 成功 → 200 回傳 pageId + url", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "page-abc-123", url: "https://notion.so/page-abc-123" }),
    }));

    const res = await POST(makeReq({ token: MOCK_TOKEN, databaseId: MOCK_DB_ID, tender: MOCK_TENDER }));
    expect(res.status).toBe(200);
    const body = await res.json() as { pageId: string; url: string };
    expect(body.pageId).toBe("page-abc-123");
    expect(body.url).toBe("https://notion.so/page-abc-123");
  });

  it("Notion API 回傳 401 → 轉發錯誤訊息", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ message: "token is invalid" }),
    }));

    const res = await POST(makeReq({ token: "bad-token", databaseId: MOCK_DB_ID, tender: MOCK_TENDER }));
    expect(res.status).toBe(401);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("token is invalid");
  });

  it("Notion API 無 message → 預設錯誤文字", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
    }));

    const res = await POST(makeReq({ token: MOCK_TOKEN, databaseId: MOCK_DB_ID, tender: MOCK_TENDER }));
    expect(res.status).toBe(500);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Notion 建案失敗");
  });

  it("fetch 拋出例外 → 500 錯誤", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new Error("網路連線中斷")));

    const res = await POST(makeReq({ token: MOCK_TOKEN, databaseId: MOCK_DB_ID, tender: MOCK_TENDER }));
    expect(res.status).toBe(500);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("網路連線中斷");
  });

  it("呼叫 Notion API 時帶正確的 Authorization header", async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "page-xyz", url: "https://notion.so/page-xyz" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await POST(makeReq({ token: MOCK_TOKEN, databaseId: MOCK_DB_ID, tender: MOCK_TENDER }));

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.notion.com/v1/pages");
    expect((init.headers as Record<string, string>)["Authorization"]).toBe(`Bearer ${MOCK_TOKEN}`);
  });

  it("request body 包含正確的 parent database_id", async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "page-abc", url: "https://notion.so/page-abc" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await POST(makeReq({ token: MOCK_TOKEN, databaseId: MOCK_DB_ID, tender: MOCK_TENDER }));

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const sent = JSON.parse(init.body as string) as { parent: { database_id: string } };
    expect(sent.parent.database_id).toBe(MOCK_DB_ID);
  });
});
