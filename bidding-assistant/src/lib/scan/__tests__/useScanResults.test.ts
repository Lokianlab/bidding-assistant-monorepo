import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useScanResults } from "../useScanResults";

// ── Mock fetch ──────────────────────────────────────────────

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  vi.clearAllMocks();
});

const mockScanResponse = {
  scannedAt: "2026-02-28T00:00:00Z",
  searchKeywords: ["食農教育"],
  results: [
    {
      tender: {
        title: "食農教育推廣",
        unit: "教育局",
        jobNumber: "J001",
        budget: 0,
        deadline: "",
        publishDate: "20260228",
        url: "https://pcc.g0v.ronny.tw/tender/J001",
      },
      classification: {
        category: "must",
        matchedLabel: "食農教育",
        matchedKeywords: ["食農教育"],
      },
    },
  ],
  counts: { must: 1, review: 0, exclude: 0, other: 0 },
  totalRaw: 1,
};

describe("useScanResults", () => {
  it("初始狀態", () => {
    const { result } = renderHook(() => useScanResults());
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("呼叫 scan 後取得結果", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockScanResponse,
    });

    const { result } = renderHook(() => useScanResults());

    await act(async () => {
      await result.current.scan(["食農教育"]);
    });

    expect(result.current.data).toEqual(mockScanResponse);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mockFetch).toHaveBeenCalledWith("/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keywords: ["食農教育"] }),
    });
  });

  it("API 錯誤時設定 error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: "內部錯誤" }),
    });

    const { result } = renderHook(() => useScanResults());

    await act(async () => {
      await result.current.scan();
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe("內部錯誤");
  });

  it("網路錯誤時設定 error", async () => {
    mockFetch.mockRejectedValueOnce(new Error("網路中斷"));

    const { result } = renderHook(() => useScanResults());

    await act(async () => {
      await result.current.scan();
    });

    expect(result.current.error).toBe("網路中斷");
  });

  it("clear 清除結果", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockScanResponse,
    });

    const { result } = renderHook(() => useScanResults());

    await act(async () => {
      await result.current.scan();
    });
    expect(result.current.data).not.toBeNull();

    act(() => {
      result.current.clear();
    });
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("空關鍵字不傳 keywords 參數", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockScanResponse,
    });

    const { result } = renderHook(() => useScanResults());

    await act(async () => {
      await result.current.scan();
    });

    expect(mockFetch).toHaveBeenCalledWith("/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
  });

  it("帶 maxPages 參數", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockScanResponse,
    });

    const { result } = renderHook(() => useScanResults());

    await act(async () => {
      await result.current.scan(["藝術"], 3);
    });

    expect(mockFetch).toHaveBeenCalledWith("/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keywords: ["藝術"], maxPages: 3 }),
    });
  });
});
