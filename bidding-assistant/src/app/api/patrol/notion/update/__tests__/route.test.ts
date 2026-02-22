// ====== POST /api/patrol/notion/update 測試 ======

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../route";

vi.mock("@/lib/patrol/notion-writer", () => ({
  updateNotionCase: vi.fn(),
}));

import { updateNotionCase } from "@/lib/patrol/notion-writer";
const mockUpdate = updateNotionCase as ReturnType<typeof vi.fn>;

function makeReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/patrol/notion/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/patrol/notion/update", () => {
  beforeEach(() => vi.clearAllMocks());

  // ── 輸入驗證 ──

  it("缺少 token → 400", async () => {
    const res = await POST(makeReq({ input: { notionPageId: "p1" } }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toMatch(/token/);
  });

  it("缺少 notionPageId → 400", async () => {
    const res = await POST(makeReq({ token: "tok", input: {} }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toMatch(/頁面 ID/);
  });

  it("input 為 null → 400", async () => {
    const res = await POST(makeReq({ token: "tok", input: null }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
  });

  // ── 成功路徑 ──

  it("成功時回傳 updateNotionCase 結果", async () => {
    mockUpdate.mockResolvedValue({ success: true });
    const res = await POST(makeReq({
      token: "tok",
      input: { notionPageId: "p1", summary: "摘要內容" },
    }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it("可帶 intelligenceReport 和 progressFlags", async () => {
    mockUpdate.mockResolvedValue({ success: true });
    await POST(makeReq({
      token: "tok",
      input: {
        notionPageId: "p1",
        intelligenceReport: "情蒐報告",
        progressFlags: ["摘要完成", "情蒐完成"],
      },
    }));
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        notionPageId: "p1",
        intelligenceReport: "情蒐報告",
        progressFlags: ["摘要完成", "情蒐完成"],
      }),
      "tok",
    );
  });

  it("lib 回傳 success:false → 400", async () => {
    mockUpdate.mockResolvedValue({ success: false, error: "更新失敗" });
    const res = await POST(makeReq({
      token: "tok",
      input: { notionPageId: "p1" },
    }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
  });

  // ── 錯誤捕捉 ──

  it("lib 拋出例外 → 500，回傳錯誤訊息", async () => {
    mockUpdate.mockRejectedValue(new Error("逾時"));
    const res = await POST(makeReq({
      token: "tok",
      input: { notionPageId: "p1" },
    }));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("逾時");
  });
});
