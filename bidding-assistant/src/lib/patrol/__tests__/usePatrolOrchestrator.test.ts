// ====== usePatrolOrchestrator Hook 測試 ======

import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { usePatrolOrchestrator } from "../usePatrolOrchestrator";

// ── Mocks ──

const mockUseSettings = vi.fn(() => ({
  settings: {
    connections: {
      notion: { token: "test-token", databaseId: "test-db" },
      googleDrive: { refreshToken: "", sharedDriveFolderId: "" },
    },
  },
}));

vi.mock("@/lib/context/settings-context", () => ({
  useSettings: () => mockUseSettings(),
}));

vi.mock("../orchestrator", () => ({
  orchestrateAccept: vi.fn(),
}));

vi.mock("../bridge", () => ({
  scanResultToPatrolItem: vi.fn((r) => ({
    id: `${r.tender.jobNumber}`,
    title: r.tender.title,
    budget: r.tender.budget ?? null,
    agency: r.tender.unit,
    deadline: r.tender.deadline,
    publishDate: r.tender.publishDate,
    jobNumber: r.tender.jobNumber,
    unitId: "",
    url: r.tender.url,
    category: "definite",
    status: "new",
  })),
}));

import { orchestrateAccept } from "../orchestrator";
const mockOrchestrate = orchestrateAccept as ReturnType<typeof vi.fn>;

// ── 測試資料 ──

const fakeScanResult = {
  tender: {
    title: "食農教育推廣計畫",
    budget: 500000,
    unit: "新北市教育局",
    deadline: "2026-04-01",
    publishDate: "2026-03-01",
    jobNumber: "J001",
    url: "https://web.pcc.gov.tw/tender/J001",
  },
  classification: {
    category: "must" as const,
    matchedRules: [],
  },
};

const successResult = {
  notion: { success: true, notionPageId: "page-1", caseUniqueId: "001" },
  drive: { success: false, error: "Drive 尚未設定" },
  summary: "[摘要功能開發中]",
  intelligence: "[情蒐功能開發中]",
};

describe("usePatrolOrchestrator", () => {
  beforeEach(() => vi.clearAllMocks());

  // ── 初始狀態 ──

  it("初始狀態：未接受、無結果、無錯誤", () => {
    const { result } = renderHook(() => usePatrolOrchestrator());
    expect(result.current.accepting).toBe(false);
    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
  });

  // ── 成功路徑 ──

  it("accept 成功後設定 result，clearing accepting", async () => {
    mockOrchestrate.mockResolvedValue(successResult);
    const { result } = renderHook(() => usePatrolOrchestrator());

    let returnValue: typeof successResult | null = null;
    await act(async () => {
      returnValue = await result.current.accept(fakeScanResult as never);
    });

    expect(result.current.accepting).toBe(false);
    expect(result.current.result).toEqual(successResult);
    expect(result.current.error).toBeNull();
    expect(returnValue).toEqual(successResult);
  });

  it("accept 帶正確 Notion 認證呼叫 orchestrateAccept", async () => {
    mockOrchestrate.mockResolvedValue(successResult);
    const { result } = renderHook(() => usePatrolOrchestrator());

    await act(async () => {
      await result.current.accept(fakeScanResult as never);
    });

    expect(mockOrchestrate).toHaveBeenCalledWith(
      expect.objectContaining({ jobNumber: "J001" }),
      expect.objectContaining({
        notionToken: "test-token",
        notionDatabaseId: "test-db",
      }),
    );
  });

  // ── 錯誤路徑 ──

  it("orchestrateAccept 拋出例外 → error 設定、result 維持 null", async () => {
    mockOrchestrate.mockRejectedValue(new Error("API 錯誤"));
    const { result } = renderHook(() => usePatrolOrchestrator());

    let returnValue: unknown = "sentinel";
    await act(async () => {
      returnValue = await result.current.accept(fakeScanResult as never);
    });

    expect(result.current.error).toBe("API 錯誤");
    expect(result.current.result).toBeNull();
    expect(returnValue).toBeNull();
  });

  // ── 無 Notion 憑證 ──

  it("settings 無 token → error 提示，不呼叫 orchestrateAccept", async () => {
    mockUseSettings.mockReturnValueOnce({
      settings: {
        connections: {
          notion: { token: "", databaseId: "" },
          googleDrive: { refreshToken: "", sharedDriveFolderId: "" },
        },
      },
    });

    const { result } = renderHook(() => usePatrolOrchestrator());
    let returnValue: unknown = "sentinel";
    await act(async () => {
      returnValue = await result.current.accept(fakeScanResult as never);
    });

    expect(result.current.error).toBe("請先在設定頁面填寫 Notion token 和 databaseId");
    expect(mockOrchestrate).not.toHaveBeenCalled();
    expect(returnValue).toBeNull();
  });

  it("settings 無 databaseId → error 提示，不呼叫 orchestrateAccept", async () => {
    mockUseSettings.mockReturnValueOnce({
      settings: {
        connections: {
          notion: { token: "tok", databaseId: "" },
          googleDrive: { refreshToken: "", sharedDriveFolderId: "" },
        },
      },
    });

    const { result } = renderHook(() => usePatrolOrchestrator());
    await act(async () => {
      await result.current.accept(fakeScanResult as never);
    });

    expect(result.current.error).toBeTruthy();
    expect(mockOrchestrate).not.toHaveBeenCalled();
  });

  // ── reset ──

  it("reset 清除 result 和 error", async () => {
    mockOrchestrate.mockResolvedValue(successResult);
    const { result } = renderHook(() => usePatrolOrchestrator());

    await act(async () => {
      await result.current.accept(fakeScanResult as never);
    });
    expect(result.current.result).not.toBeNull();

    act(() => result.current.reset());
    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("reset 可清除 error 狀態", async () => {
    mockOrchestrate.mockRejectedValue(new Error("失敗"));
    const { result } = renderHook(() => usePatrolOrchestrator());

    await act(async () => {
      await result.current.accept(fakeScanResult as never);
    });
    expect(result.current.error).toBe("失敗");

    act(() => result.current.reset());
    expect(result.current.error).toBeNull();
  });
});
