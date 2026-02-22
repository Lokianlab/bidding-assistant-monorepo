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

    const result = await apiCreateDriveFolder(DRIVE_INPUT);

    expect(result.success).toBe(true);
    expect(result.folderId).toBe("folder-abc");
  });

  it("呼叫正確的 API 路徑，body 只有 input（不含 accessToken）", async () => {
    mockFetch.mockResolvedValueOnce(makeJsonResponse({ success: true, folderId: "f1" }));

    await apiCreateDriveFolder(DRIVE_INPUT);

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/patrol/drive/create");
    const body = JSON.parse(init.body as string) as {
      input: DriveCreateFolderInput;
    };
    expect(body.input).toEqual(DRIVE_INPUT);
    // 不應該有 accessToken 或 parentFolderId
    expect((body as Record<string, unknown>).accessToken).toBeUndefined();
    expect((body as Record<string, unknown>).parentFolderId).toBeUndefined();
  });

  it("fetch 拋出例外時回傳失敗結果", async () => {
    mockFetch.mockRejectedValueOnce(new Error("OAuth2 失效"));

    const result = await apiCreateDriveFolder(DRIVE_INPUT);

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

const mockTenderDetail = {
  detail: {
    "標案名稱:標案名稱": "食農教育推廣活動",
    "機關名稱:機關名稱": "新北市教育局",
    "預算金額:預算金額": "500,000元",
    "截止投標日期:截止投標日期": "2026-04-01",
    "公告日期:公告日期": "2026-03-01",
    "決標方式:決標方式": "最有利標",
    "採購類別:採購類別": "服務採購",
    "履約期限:履約期限": "3個月",
    "工作說明:工作說明": "辦理食農教育推廣活動",
  },
};

describe("apiFetchTenderDetail", () => {
  it("成功回應 → 解析 PccTenderDetail 欄位", async () => {
    mockFetch.mockResolvedValueOnce(makeJsonResponse(mockTenderDetail));
    const result = await apiFetchTenderDetail("unit-001", "J001");

    expect(result).not.toBeNull();
    expect(result?.title).toBe("食農教育推廣活動");
    expect(result?.agency).toBe("新北市教育局");
    expect(result?.budget).toBe(500000);
    expect(result?.deadline).toBe("2026-04-01");
    expect(result?.publishDate).toBe("2026-03-01");
    expect(result?.awardType).toBe("最有利標");
    expect(result?.category).toBe("服務採購");
    expect(result?.contractPeriod).toBe("3個月");
    expect(result?.description).toBe("辦理食農教育推廣活動");
    expect(result?.jobNumber).toBe("J001");
    expect(result?.unitId).toBe("unit-001");
  });

  it("呼叫 /api/pcc 帶 getTenderDetail action 和正確參數", async () => {
    mockFetch.mockResolvedValueOnce(makeJsonResponse(mockTenderDetail));
    await apiFetchTenderDetail("unit-001", "J001");

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/pcc",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ action: "getTenderDetail", data: { unitId: "unit-001", jobNumber: "J001" } }),
      }),
    );
  });

  it("HTTP 非 ok → 回傳 null", async () => {
    mockFetch.mockResolvedValueOnce(makeJsonResponse({}, false));
    const result = await apiFetchTenderDetail("unit-001", "J001");
    expect(result).toBeNull();
  });

  it("回應有 error 欄位 → 回傳 null", async () => {
    mockFetch.mockResolvedValueOnce(makeJsonResponse({ error: "API 錯誤" }));
    const result = await apiFetchTenderDetail("unit-001", "J001");
    expect(result).toBeNull();
  });

  it("回應缺少 detail 欄位 → 回傳 null", async () => {
    mockFetch.mockResolvedValueOnce(makeJsonResponse({ query: "test" }));
    const result = await apiFetchTenderDetail("unit-001", "J001");
    expect(result).toBeNull();
  });

  it("fetch 拋出例外 → 回傳 null", async () => {
    mockFetch.mockRejectedValueOnce(new Error("網路錯誤"));
    const result = await apiFetchTenderDetail("unit-001", "J001");
    expect(result).toBeNull();
  });

  it("無法解析的預算字串 → budget 為 null", async () => {
    mockFetch.mockResolvedValueOnce(makeJsonResponse({
      detail: { "預算金額:預算金額": "不計" },
    }));
    const result = await apiFetchTenderDetail("unit-001", "J001");
    expect(result?.budget).toBeNull();
  });
});
