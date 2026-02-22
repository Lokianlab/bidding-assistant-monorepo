import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock OAuth and CryptoJS ─────────────────────────────────

vi.mock("oauth-1.0a", () => ({
  default: class {
    authorize() {
      return {};
    }
    toHeader() {
      return { Authorization: "OAuth mock" };
    }
  },
}));

vi.mock("crypto-js", () => ({
  default: {
    HmacSHA1: () => ({ toString: () => "mock-hash" }),
    enc: { Base64: {} },
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
  return new NextRequest("http://localhost:3000/api/smugmug", {
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Input validation ────────────────────────────────────────

describe("SmugMug API route — input validation", () => {
  it("缺少 apiKey → 400", async () => {
    const req = makeRequest({ action: "test", apiSecret: "secret" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("API Key");
  });

  it("缺少 apiSecret → 400", async () => {
    const req = makeRequest({ action: "test", apiKey: "key" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Secret");
  });

  it("test action 缺少 accessToken → 400", async () => {
    const req = makeRequest({
      action: "test",
      apiKey: "key",
      apiSecret: "secret",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Access Token");
  });

  it("listAlbums 缺少 nickname → 400", async () => {
    const req = makeRequest({
      action: "listAlbums",
      apiKey: "key",
      apiSecret: "secret",
      accessToken: "at",
      tokenSecret: "ts",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("nickname");
  });

  it("listPhotos 缺少 albumKey → 400", async () => {
    const req = makeRequest({
      action: "listPhotos",
      apiKey: "key",
      apiSecret: "secret",
      accessToken: "at",
      tokenSecret: "ts",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("albumKey");
  });

  it("imageSizes 缺少 imageKey → 400", async () => {
    const req = makeRequest({
      action: "imageSizes",
      apiKey: "key",
      apiSecret: "secret",
      accessToken: "at",
      tokenSecret: "ts",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("imageKey");
  });

  it("publicAlbum 缺少 albumKey → 400", async () => {
    const req = makeRequest({
      action: "publicAlbum",
      apiKey: "key",
      apiSecret: "secret",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("albumKey");
  });

  it("未知 action → 400", async () => {
    const req = makeRequest({
      action: "unknown",
      apiKey: "key",
      apiSecret: "secret",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("未知的 action");
  });
});

// ── Successful requests ─────────────────────────────────────

describe("SmugMug API route — successful requests", () => {
  const base = {
    apiKey: "key",
    apiSecret: "secret",
    accessToken: "at",
    tokenSecret: "ts",
  };

  it("test → 200 + user info", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        Response: {
          User: { NickName: "jin", Name: "鹿老闆", WebUri: "https://jin.smugmug.com" },
        },
      }),
    });
    const req = makeRequest({ ...base, action: "test" });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.nickname).toBe("jin");
  });

  it("listAlbums → 200 + albums array", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        Response: {
          Album: [{ AlbumKey: "abc", Title: "相簿一", ImageCount: 5 }],
          Pages: { Total: 1, Start: 1, Count: 1 },
        },
      }),
    });
    const req = makeRequest({ ...base, action: "listAlbums", nickname: "jin" });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.albums).toHaveLength(1);
    expect(body.albums[0].albumKey).toBe("abc");
    expect(body.albums[0].title).toBe("相簿一");
  });

  it("publicAlbum → 200 + images", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        Response: {
          AlbumImage: [{ ImageKey: "img1", Title: "照片" }],
          Pages: { Total: 1 },
        },
      }),
    });
    const req = makeRequest({ ...base, action: "publicAlbum", albumKey: "abc" });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.images).toHaveLength(1);
  });
});

// ── Error handling ──────────────────────────────────────────

describe("SmugMug API route — error handling", () => {
  const base = {
    apiKey: "key",
    apiSecret: "secret",
    accessToken: "at",
    tokenSecret: "ts",
  };

  it("SmugMug API 回傳錯誤 → 500", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: async () => "Forbidden",
    });
    const req = makeRequest({ ...base, action: "test" });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain("SmugMug API 403");
  });

  it("publicAlbum SmugMug 回傳 404 → 透傳 status", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    });
    const req = makeRequest({ ...base, action: "publicAlbum", albumKey: "bad" });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });
});
