import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock patrol/notion-writer ──

vi.mock("@/lib/patrol/notion-writer", () => ({
  updateNotionCase: vi.fn(),
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
import { updateNotionCase } from "@/lib/patrol/notion-writer";

const mockUpdate = vi.mocked(updateNotionCase);

const VALID_INPUT = {
  notionPageId: "page-xyz-456",
  summary: "食農教育推廣計畫工作摘要",
  progressFlags: ["摘要完成"],
};

function makeReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/patrol/notion/update", {
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/patrol/notion/update — 輸入驗證", () => {
  it("缺少 token → 400", async () => {
    const res = await POST(makeReq({ input: VALID_INPUT }));
    expect(res.status).toBe(400);
    const data = await res.json() as { error: string };
    expect(data.error).toMatch(/token/);
  });

  it("input 缺少 notionPageId → 400", async () => {
    const res = await POST(makeReq({ token: "secret", input: {} }));
    expect(res.status).toBe(400);
    const data = await res.json() as { error: string };
    expect(data.error).toMatch(/頁面 ID/);
  });

  it("input 為 null → 400", async () => {
    const res = await POST(makeReq({ token: "secret", input: null }));
    expect(res.status).toBe(400);
    const data = await res.json() as { error: string };
    expect(data.error).toMatch(/頁面 ID/);
  });
});

describe("POST /api/patrol/notion/update — 成功路徑", () => {
  it("updateNotionCase 成功 → 200", async () => {
    mockUpdate.mockResolvedValueOnce({ success: true });

    const res = await POST(makeReq({ token: "secret", input: VALID_INPUT }));

    expect(res.status).toBe(200);
    const data = await res.json() as { success: boolean };
    expect(data.success).toBe(true);
  });

  it("呼叫 updateNotionCase 時帶正確參數", async () => {
    mockUpdate.mockResolvedValueOnce({ success: true });

    await POST(makeReq({ token: "my-token", input: VALID_INPUT }));

    expect(mockUpdate).toHaveBeenCalledWith(VALID_INPUT, "my-token");
  });
});

describe("POST /api/patrol/notion/update — 錯誤路徑", () => {
  it("updateNotionCase 回傳 success:false → 400", async () => {
    mockUpdate.mockResolvedValueOnce({ success: false, error: "頁面不存在" });

    const res = await POST(makeReq({ token: "secret", input: VALID_INPUT }));

    expect(res.status).toBe(400);
    const data = await res.json() as { success: boolean };
    expect(data.success).toBe(false);
  });

  it("updateNotionCase 拋出例外 → 500", async () => {
    mockUpdate.mockRejectedValueOnce(new Error("連線逾時"));

    const res = await POST(makeReq({ token: "secret", input: VALID_INPUT }));

    expect(res.status).toBe(500);
    const data = await res.json() as { error: string };
    expect(data.error).toBe("連線逾時");
  });
});
