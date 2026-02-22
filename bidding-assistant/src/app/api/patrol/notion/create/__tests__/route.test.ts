// ====== POST /api/patrol/notion/create 測試 ======

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../route";

vi.mock("@/lib/patrol/notion-writer", () => ({
  createNotionCase: vi.fn(),
}));

import { createNotionCase } from "@/lib/patrol/notion-writer";
const mockCreate = createNotionCase as ReturnType<typeof vi.fn>;

function makeReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/patrol/notion/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/patrol/notion/create", () => {
  beforeEach(() => vi.clearAllMocks());

  // ── 輸入驗證 ──

  it("缺少 token → 400", async () => {
    const res = await POST(makeReq({ databaseId: "db1", input: { title: "T" } }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toMatch(/token/);
  });

  it("缺少 databaseId → 400", async () => {
    const res = await POST(makeReq({ token: "tok", input: { title: "T" } }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toMatch(/databaseId/);
  });

  it("input 無 title → 400", async () => {
    const res = await POST(makeReq({ token: "tok", databaseId: "db1", input: {} }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
  });

  it("input 為 null → 400", async () => {
    const res = await POST(makeReq({ token: "tok", databaseId: "db1", input: null }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
  });

  // ── 成功路徑 ──

  it("成功時回傳 createNotionCase 結果", async () => {
    mockCreate.mockResolvedValue({ success: true, notionPageId: "p1", caseUniqueId: "123" });
    const res = await POST(makeReq({
      token: "tok",
      databaseId: "db1",
      input: { title: "測試標案", jobNumber: "123", agency: "局處", budget: 500000, publishDate: "2026-03-01", deadline: "2026-04-01" },
    }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.notionPageId).toBe("p1");
  });

  it("lib 回傳 success:false → 400", async () => {
    mockCreate.mockResolvedValue({ success: false, error: "Notion API 錯誤" });
    const res = await POST(makeReq({
      token: "tok",
      databaseId: "db1",
      input: { title: "T", jobNumber: "1", agency: "A", budget: null, publishDate: "2026-01-01", deadline: "2026-02-01" },
    }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
  });

  // ── 錯誤捕捉 ──

  it("lib 拋出例外 → 500", async () => {
    mockCreate.mockRejectedValue(new Error("連線失敗"));
    const res = await POST(makeReq({
      token: "tok",
      databaseId: "db1",
      input: { title: "T", jobNumber: "1", agency: "A", budget: null, publishDate: "2026-01-01", deadline: "2026-02-01" },
    }));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toBe("連線失敗");
  });
});
