import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock patrol/notion-writer（只測路由邏輯，writer 有自己的測試）──

vi.mock("@/lib/patrol/notion-writer", () => ({
  createNotionCase: vi.fn(),
}));

// ── Mock next/server ──

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
import { createNotionCase } from "@/lib/patrol/notion-writer";

const mockCreate = vi.mocked(createNotionCase);

const VALID_INPUT = {
  title: "食農教育推廣計畫",
  jobNumber: "J001",
  agency: "新北市教育局",
  budget: 500_000,
  publishDate: "20260228",
  deadline: "20260315",
};

function makeReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/patrol/notion/create", {
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/patrol/notion/create — 輸入驗證", () => {
  it("缺少 token → 400", async () => {
    const res = await POST(makeReq({ databaseId: "db-123", input: VALID_INPUT }));
    expect(res.status).toBe(400);
    const data = await res.json() as { error: string };
    expect(data.error).toMatch(/token/);
  });

  it("缺少 databaseId → 400", async () => {
    const res = await POST(makeReq({ token: "secret", input: VALID_INPUT }));
    expect(res.status).toBe(400);
    const data = await res.json() as { error: string };
    expect(data.error).toMatch(/databaseId/);
  });

  it("input 無 title → 400", async () => {
    const res = await POST(makeReq({
      token: "secret",
      databaseId: "db-123",
      input: { ...VALID_INPUT, title: "" },
    }));
    expect(res.status).toBe(400);
    const data = await res.json() as { error: string };
    expect(data.error).toMatch(/建檔資料/);
  });

  it("input 為 null → 400", async () => {
    const res = await POST(makeReq({ token: "secret", databaseId: "db-123", input: null }));
    expect(res.status).toBe(400);
    const data = await res.json() as { error: string };
    expect(data.error).toMatch(/建檔資料/);
  });
});

describe("POST /api/patrol/notion/create — 成功路徑", () => {
  it("createNotionCase 成功 → 200 + notionPageId", async () => {
    mockCreate.mockResolvedValueOnce({
      success: true,
      notionPageId: "page-abc-123",
      url: "https://notion.so/page-abc-123",
    });

    const res = await POST(makeReq({
      token: "secret",
      databaseId: "db-123",
      input: VALID_INPUT,
    }));

    expect(res.status).toBe(200);
    const data = await res.json() as { success: boolean; notionPageId: string };
    expect(data.success).toBe(true);
    expect(data.notionPageId).toBe("page-abc-123");
  });

  it("呼叫 createNotionCase 時帶正確參數", async () => {
    mockCreate.mockResolvedValueOnce({ success: true, notionPageId: "p1" });

    await POST(makeReq({ token: "my-token", databaseId: "my-db", input: VALID_INPUT }));

    expect(mockCreate).toHaveBeenCalledWith(VALID_INPUT, "my-token", "my-db");
  });
});

describe("POST /api/patrol/notion/create — 錯誤路徑", () => {
  it("createNotionCase 回傳 success:false → 400", async () => {
    mockCreate.mockResolvedValueOnce({ success: false, error: "Notion API 拒絕" });

    const res = await POST(makeReq({
      token: "secret",
      databaseId: "db-123",
      input: VALID_INPUT,
    }));

    expect(res.status).toBe(400);
    const data = await res.json() as { success: boolean; error: string };
    expect(data.success).toBe(false);
  });

  it("createNotionCase 拋出例外 → 500", async () => {
    mockCreate.mockRejectedValueOnce(new Error("網路斷線"));

    const res = await POST(makeReq({
      token: "secret",
      databaseId: "db-123",
      input: VALID_INPUT,
    }));

    expect(res.status).toBe(500);
    const data = await res.json() as { error: string };
    expect(data.error).toBe("網路斷線");
  });
});
