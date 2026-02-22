import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock patrol/drive-writer ──

vi.mock("@/lib/patrol/drive-writer", () => ({
  createDriveFolder: vi.fn(),
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
import { createDriveFolder } from "@/lib/patrol/drive-writer";

const mockCreateFolder = vi.mocked(createDriveFolder);

const VALID_INPUT = {
  caseUniqueId: "PCC-J001",
  publishDate: "20260228",
  title: "食農教育推廣計畫",
};

function makeReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/patrol/drive/create", {
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/patrol/drive/create — 輸入驗證", () => {
  it("缺少 accessToken → 400", async () => {
    const res = await POST(makeReq({ parentFolderId: "folder-123", input: VALID_INPUT }));
    expect(res.status).toBe(400);
    const data = await res.json() as { error: string };
    expect(data.error).toMatch(/access token/);
  });

  it("缺少 parentFolderId → 400", async () => {
    const res = await POST(makeReq({ accessToken: "drive-token", input: VALID_INPUT }));
    expect(res.status).toBe(400);
    const data = await res.json() as { error: string };
    expect(data.error).toMatch(/父資料夾/);
  });

  it("input 缺少 caseUniqueId → 400", async () => {
    const res = await POST(makeReq({
      accessToken: "drive-token",
      parentFolderId: "folder-123",
      input: { ...VALID_INPUT, caseUniqueId: "" },
    }));
    expect(res.status).toBe(400);
    const data = await res.json() as { error: string };
    expect(data.error).toMatch(/建資料夾資料/);
  });

  it("input 缺少 title → 400", async () => {
    const res = await POST(makeReq({
      accessToken: "drive-token",
      parentFolderId: "folder-123",
      input: { ...VALID_INPUT, title: "" },
    }));
    expect(res.status).toBe(400);
    const data = await res.json() as { error: string };
    expect(data.error).toMatch(/建資料夾資料/);
  });

  it("input 為 null → 400", async () => {
    const res = await POST(makeReq({
      accessToken: "drive-token",
      parentFolderId: "folder-123",
      input: null,
    }));
    expect(res.status).toBe(400);
    const data = await res.json() as { error: string };
    expect(data.error).toMatch(/建資料夾資料/);
  });
});

describe("POST /api/patrol/drive/create — 成功路徑", () => {
  it("createDriveFolder 成功 → 200 + folderId", async () => {
    mockCreateFolder.mockResolvedValueOnce({
      success: true,
      folderId: "drive-folder-abc",
      folderUrl: "https://drive.google.com/drive/folders/drive-folder-abc",
    });

    const res = await POST(makeReq({
      accessToken: "drive-token",
      parentFolderId: "folder-123",
      input: VALID_INPUT,
    }));

    expect(res.status).toBe(200);
    const data = await res.json() as { success: boolean; folderId: string };
    expect(data.success).toBe(true);
    expect(data.folderId).toBe("drive-folder-abc");
  });

  it("呼叫 createDriveFolder 時帶正確參數", async () => {
    mockCreateFolder.mockResolvedValueOnce({ success: true, folderId: "f1" });

    await POST(makeReq({
      accessToken: "my-access-token",
      parentFolderId: "parent-folder-id",
      input: VALID_INPUT,
    }));

    expect(mockCreateFolder).toHaveBeenCalledWith(
      VALID_INPUT,
      "my-access-token",
      "parent-folder-id",
    );
  });
});

describe("POST /api/patrol/drive/create — 錯誤路徑", () => {
  it("createDriveFolder 回傳 success:false → 400", async () => {
    mockCreateFolder.mockResolvedValueOnce({ success: false, error: "Drive API 失敗" });

    const res = await POST(makeReq({
      accessToken: "drive-token",
      parentFolderId: "folder-123",
      input: VALID_INPUT,
    }));

    expect(res.status).toBe(400);
    const data = await res.json() as { success: boolean };
    expect(data.success).toBe(false);
  });

  it("createDriveFolder 拋出例外 → 500", async () => {
    mockCreateFolder.mockRejectedValueOnce(new Error("OAuth2 token 過期"));

    const res = await POST(makeReq({
      accessToken: "drive-token",
      parentFolderId: "folder-123",
      input: VALID_INPUT,
    }));

    expect(res.status).toBe(500);
    const data = await res.json() as { error: string };
    expect(data.error).toBe("OAuth2 token 過期");
  });
});
