import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  apiCreateNotionCase,
  apiUpdateNotionCase,
  apiCreateDriveFolder,
  apiSearchPcc,
  apiFetchTenderDetail,
} from "../api-client";
import type {
  NotionCaseCreateInput,
  NotionCaseUpdateInput,
  DriveCreateFolderInput,
} from "../types";

// ── Mock fetch ──────────────────────────────────────────────

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function makeJsonResponse(data: unknown, ok = true) {
  return {
    ok,
    json: async () => data,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── apiCreateNotionCase ──────────────────────────────────────

const CREATE_INPUT: NotionCaseCreateInput = {
  title: "食農教育推廣計畫",
  jobNumber: "J001",
  agency: "新北市教育局",
  budget: 500_000,
  publishDate: "20260228",
  deadline: "20260315",
};

describe("apiCreateNotionCase", () => {
  it("成功時回傳 Notion 建檔結果", async () => {
    mockFetch.mockResolvedValueOnce(
      makeJsonResponse({ success: true, notionPageId: "page-abc" }),
    );

    const result = await apiCreateNotionCase(CREATE_INPUT, "my-token", "db-123");

    expect(result.success).toBe(true);
    expect(result.notionPageId).toBe("page-abc");
  });

  it("呼叫正確的 API 路徑", async () => {
    mockFetch.mockResolvedValueOnce(
      makeJsonResponse({ success: true, notionPageId: "p1" }),
    );

    await apiCreateNotionCase(CREATE_INPUT, "tok", "db");

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/patrol/notion/create",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("request body 包含 token、databaseId 和 input", async () => {
    mockFetch.mockResolvedValueOnce(
      makeJsonResponse({ success: true, notionPageId: "p1" }),
    );

    await apiCreateNotionCase(CREATE_INPUT, "secret-token", "my-db");

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as {
      token: string;
      databaseId: string;
      input: NotionCaseCreateInput;
    };
    expect(body.token).toBe("secret-token");
    expect(body.databaseId).toBe("my-db");
    expect(body.input.title).toBe("食農教育推廣計畫");
  });

  it("fetch 拋出例外時回傳失敗結果", async () => {
    mockFetch.mockRejectedValueOnce(new Error("連線失敗"));

    const result = await apiCreateNotionCase(CREATE_INPUT, "tok", "db");

    expect(result.success).toBe(false);
    expect(result.error).toBe("連線失敗");
  });

  it("非 Error 例外也能回傳失敗", async () => {
    mockFetch.mockRejectedValueOnce("字串例外");

    const result = await apiCreateNotionCase(CREATE_INPUT, "tok", "db");

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/建檔/);
  });
});

// ── apiUpdateNotionCase ──────────────────────────────────────

const UPDATE_INPUT: NotionCaseUpdateInput = {
  notionPageId: "page-xyz",
  summary: "工作摘要",
};

describe("apiUpdateNotionCase", () => {
  it("成功時回傳更新結果", async () => {
    mockFetch.mockResolvedValueOnce(makeJsonResponse({ success: true }));

    const result = await apiUpdateNotionCase(UPDATE_INPUT, "tok");

    expect(result.success).toBe(true);
  });

  it("呼叫正確的 API 路徑", async () => {
    mockFetch.mockResolvedValueOnce(makeJsonResponse({ success: true }));

    await apiUpdateNotionCase(UPDATE_INPUT, "tok");

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/patrol/notion/update",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("request body 包含 token 和 input", async () => {
    mockFetch.mockResolvedValueOnce(makeJsonResponse({ success: true }));

    await apiUpdateNotionCase(UPDATE_INPUT, "secret-token");

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as {
      token: string;
      input: NotionCaseUpdateInput;
    };
    expect(body.token).toBe("secret-token");
    expect(body.input.notionPageId).toBe("page-xyz");
  });

  it("fetch 拋出例外時回傳失敗結果", async () => {
    mockFetch.mockRejectedValueOnce(new Error("逾時"));

    const result = await apiUpdateNotionCase(UPDATE_INPUT, "tok");

    expect(result.success).toBe(false);
    expect(result.error).toBe("逾時");
  });
});

// ── apiCreateDriveFolder ──────────────────────────────────────

const DRIVE_INPUT: DriveCreateFolderInput = {
  caseUniqueId: "PCC-J001",
  publishDate: "20260228",
  title: "食農教育推廣計畫",
};

describe("apiCreateDriveFolder", () => {
  it("成功時回傳 Drive 資料夾結果", async () => {
    mockFetch.mockResolvedValueOnce(
      makeJsonResponse({ success: true, folderId: "folder-abc", folderUrl: "https://drive.google.com/f/abc" }),
    );

    const result = await apiCreateDriveFolder(DRIVE_INPUT, "access-tok", "parent-123");

    expect(result.success).toBe(true);
    expect(result.folderId).toBe("folder-abc");
  });

  it("呼叫正確的 API 路徑並帶 accessToken + parentFolderId", async () => {
    mockFetch.mockResolvedValueOnce(makeJsonResponse({ success: true, folderId: "f1" }));

    await apiCreateDriveFolder(DRIVE_INPUT, "my-access-token", "parent-id");

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/patrol/drive/create");
    const body = JSON.parse(init.body as string) as {
      accessToken: string;
      parentFolderId: string;
    };
    expect(body.accessToken).toBe("my-access-token");
    expect(body.parentFolderId).toBe("parent-id");
  });

  it("fetch 拋出例外時回傳失敗結果", async () => {
    mockFetch.mockRejectedValueOnce(new Error("OAuth2 失效"));

    const result = await apiCreateDriveFolder(DRIVE_INPUT, "tok", "parent");

    expect(result.success).toBe(false);
    expect(result.error).toBe("OAuth2 失效");
  });
});

// ── apiSearchPcc ──────────────────────────────────────────────

describe("apiSearchPcc", () => {
  it("成功時回傳搜尋結果", async () => {
    mockFetch.mockResolvedValueOnce(
      makeJsonResponse({ results: [{ title: "標案A" }] }),
    );

    const result = await apiSearchPcc(["食農", "教育"]);

    expect(result.results).toHaveLength(1);
  });

  it("有關鍵字時 body 包含 keywords", async () => {
    mockFetch.mockResolvedValueOnce(makeJsonResponse({ results: [] }));

    await apiSearchPcc(["食農", "教育"]);

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as { keywords: string[] };
    expect(body.keywords).toEqual(["食農", "教育"]);
  });

  it("無關鍵字時 body 為空物件", async () => {
    mockFetch.mockResolvedValueOnce(makeJsonResponse({ results: [] }));

    await apiSearchPcc();

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body.keywords).toBeUndefined();
  });

  it("fetch 拋出例外時回傳空結果和錯誤", async () => {
    mockFetch.mockRejectedValueOnce(new Error("無網路"));

    const result = await apiSearchPcc();

    expect(result.results).toEqual([]);
    expect(result.error).toBe("無網路");
  });
});

// ── apiFetchTenderDetail ──────────────────────────────────────

describe("apiFetchTenderDetail", () => {
  it("目前永遠回傳 null（Layer A API 尚未實作）", async () => {
    const result = await apiFetchTenderDetail("unit-001", "J001");
    expect(result).toBeNull();
  });
});
