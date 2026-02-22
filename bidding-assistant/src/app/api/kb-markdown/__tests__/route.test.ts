import { describe, it, expect, vi } from "vitest";

// ── Mock next/server ────────────────────────────────────────

vi.mock("next/server", () => ({
  NextRequest: class {
    nextUrl: URL;
    constructor(url: string) {
      this.nextUrl = new URL(url);
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

import { GET } from "../route";
import { NextRequest } from "next/server";

// ── Tests ───────────────────────────────────────────────────

describe("GET /api/kb-markdown", () => {
  it("缺少 id 參數 → 400", async () => {
    const req = new NextRequest("http://localhost:3000/api/kb-markdown");
    const res = await GET(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("無效的知識庫 ID");
  });

  it("無效的 id → 400", async () => {
    const req = new NextRequest("http://localhost:3000/api/kb-markdown?id=99Z");
    const res = await GET(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("無效的知識庫 ID");
  });

  it("空字串 id → 400", async () => {
    const req = new NextRequest("http://localhost:3000/api/kb-markdown?id=");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it.each(["00A", "00B", "00C", "00D", "00E"])(
    "有效 id=%s → 200 + 回傳 kbId",
    async (id) => {
      const req = new NextRequest(
        `http://localhost:3000/api/kb-markdown?id=${id}`,
      );
      const res = await GET(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.kbId).toBe(id);
      expect(body.message).toContain("renderKBToMarkdown");
    },
  );
});
