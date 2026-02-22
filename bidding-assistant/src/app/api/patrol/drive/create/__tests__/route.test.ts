// ====== POST /api/patrol/drive/create 測試 ======

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../route";

vi.mock("@/lib/patrol/drive-writer", () => ({
  createDriveFolder: vi.fn(),
}));

import { createDriveFolder } from "@/lib/patrol/drive-writer";
const mockCreate = createDriveFolder as ReturnType<typeof vi.fn>;

function makeReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/patrol/drive/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validInput = {
  caseUniqueId: "20260301-001",
  publishDate: "2026-03-01",
  title: "食農教育推廣計畫",
};

describe("POST /api/patrol/drive/create", () => {
  beforeEach(() => vi.clearAllMocks());

  // ── 輸入驗證 ──

  it("缺少 accessToken → 400", async () => {
    const res = await POST(makeReq({ parentFolderId: "f1", input: validInput }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toMatch(/access token/);
  });

  it("缺少 parentFolderId → 400", async () => {
    const res = await POST(makeReq({ accessToken: "tok", input: validInput }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toMatch(/父資料夾/);
  });

  it("input 缺少 caseUniqueId → 400", async () => {
    const res = await POST(makeReq({
      accessToken: "tok",
      parentFolderId: "f1",
      input: { publishDate: "2026-03-01", title: "標案" },
    }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toMatch(/caseUniqueId/);
  });

  it("input 缺少 title → 400", async () => {
    const res = await POST(makeReq({
      accessToken: "tok",
      parentFolderId: "f1",
      input: { caseUniqueId: "123", publishDate: "2026-03-01" },
    }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
  });

  it("input 為 null → 400", async () => {
    const res = await POST(makeReq({ accessToken: "tok", parentFolderId: "f1", input: null }));
    expect(res.status).toBe(400);
  });

  // ── 成功路徑 ──

  it("成功時回傳 createDriveFolder 結果", async () => {
    mockCreate.mockResolvedValue({
      success: true,
      folderId: "drive-folder-id",
      folderUrl: "https://drive.google.com/drive/folders/drive-folder-id",
    });
    const res = await POST(makeReq({
      accessToken: "tok",
      parentFolderId: "f1",
      input: validInput,
    }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.folderId).toBe("drive-folder-id");
    expect(data.folderUrl).toContain("drive-folder-id");
  });

  it("lib 回傳 success:false → 400", async () => {
    mockCreate.mockResolvedValue({ success: false, error: "Drive API 錯誤" });
    const res = await POST(makeReq({
      accessToken: "tok",
      parentFolderId: "f1",
      input: validInput,
    }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
  });

  // ── 錯誤捕捉 ──

  it("lib 拋出例外 → 500，回傳錯誤訊息", async () => {
    mockCreate.mockRejectedValue(new Error("OAuth 逾期"));
    const res = await POST(makeReq({
      accessToken: "tok",
      parentFolderId: "f1",
      input: validInput,
    }));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toBe("OAuth 逾期");
  });
});
