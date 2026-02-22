import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock fs ─────────────────────────────────────────────────

const mockReadFileSync = vi.fn();
vi.mock("fs", () => ({
  default: {
    readFileSync: (...args: unknown[]) => mockReadFileSync(...args),
  },
}));

// ── Mock next/server ────────────────────────────────────────

vi.mock("next/server", () => ({
  NextRequest: class {
    nextUrl: URL;
    constructor(url: string) {
      this.nextUrl = new URL(url);
    }
  },
  NextResponse: class {
    data: unknown;
    status: number;
    headers: Headers;
    constructor(body: unknown, init?: { headers?: Record<string, string> }) {
      this.data = body;
      this.status = 200;
      this.headers = new Headers(init?.headers);
    }
    static json(data: unknown, init?: { status?: number }) {
      return {
        data,
        status: init?.status ?? 200,
        async json() {
          return data;
        },
      };
    }
  },
}));

import { GET } from "../route";
import { NextRequest } from "next/server";

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Input validation ────────────────────────────────────────

describe("GET /api/prompts — input validation", () => {
  it("缺少 file 參數 → 400", async () => {
    const req = new NextRequest("http://localhost:3000/api/prompts");
    const res = await GET(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("file 參數");
  });

  it("非 .md 副檔名 → 400", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/prompts?file=secret.json",
    );
    const res = await GET(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("無效的檔案名稱");
  });

  it("路徑穿越（..）→ 400", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/prompts?file=../../etc/passwd.md",
    );
    const res = await GET(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("無效的檔案名稱");
  });

  it("路徑包含斜線 → 400", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/prompts?file=subdir/file.md",
    );
    const res = await GET(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("無效的檔案名稱");
  });
});

// ── Successful read ─────────────────────────────────────────

describe("GET /api/prompts — successful read", () => {
  it("有效的 .md 檔名 → 200 + 檔案內容", async () => {
    mockReadFileSync.mockReturnValue("# 提示詞\n\n這是內容");
    const req = new NextRequest(
      "http://localhost:3000/api/prompts?file=00-1_系統核心_v2.0.md",
    );
    const res = await GET(req);
    // NextResponse constructor returns object with data field
    expect(mockReadFileSync).toHaveBeenCalledTimes(1);
    // Verify the file path includes "prompts" directory
    const calledPath = mockReadFileSync.mock.calls[0][0] as string;
    expect(calledPath).toContain("prompts");
    expect(calledPath).toContain("00-1_系統核心_v2.0.md");
  });
});

// ── File not found ──────────────────────────────────────────

describe("GET /api/prompts — file not found", () => {
  it("檔案不存在 → 404", async () => {
    mockReadFileSync.mockImplementation(() => {
      throw new Error("ENOENT");
    });
    const req = new NextRequest(
      "http://localhost:3000/api/prompts?file=nonexistent.md",
    );
    const res = await GET(req);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain("找不到檔案");
    expect(body.error).toContain("nonexistent.md");
  });
});
