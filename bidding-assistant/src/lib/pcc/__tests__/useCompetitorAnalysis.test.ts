import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { SelfAnalysis } from "../types";

// ── Mocks ──────────────────────────────────────────────────

vi.mock("../cache", () => ({
  cacheGet: vi.fn(() => null),
  cacheSet: vi.fn(),
}));

vi.mock("../analysis", () => ({
  fetchAllPages: vi.fn(),
  analyzeSelf: vi.fn(),
}));

import { cacheGet, cacheSet } from "../cache";
import { fetchAllPages, analyzeSelf } from "../analysis";
import { useCompetitorAnalysis } from "../useCompetitorAnalysis";

const mockCacheGet = vi.mocked(cacheGet);
const mockCacheSet = vi.mocked(cacheSet);
const mockFetchAllPages = vi.mocked(fetchAllPages);
const mockAnalyzeSelf = vi.mocked(analyzeSelf);

// ── Helpers ────────────────────────────────────────────────

function makeSelfAnalysis(overrides: Partial<SelfAnalysis> = {}): SelfAnalysis {
  return {
    totalRecords: 10,
    awardRecords: 8,
    wins: 3,
    losses: 5,
    winRate: 0.375,
    competitors: [],
    agencies: [],
    yearlyStats: [],
    ...overrides,
  };
}

// ── Setup ──────────────────────────────────────────────────

beforeEach(() => {
  mockCacheGet.mockReset().mockReturnValue(null);
  mockCacheSet.mockReset();
  mockFetchAllPages.mockReset();
  mockAnalyzeSelf.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── Initial state ──────────────────────────────────────────

describe("useCompetitorAnalysis — initial state", () => {
  it("returns null data, not loading, no error", () => {
    const { result } = renderHook(() => useCompetitorAnalysis());
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.progress).toBeNull();
    expect(result.current.error).toBeNull();
    expect(typeof result.current.run).toBe("function");
  });
});

// ── Run ────────────────────────────────────────────────────

describe("useCompetitorAnalysis — run", () => {
  it("skips empty company name", async () => {
    const { result } = renderHook(() => useCompetitorAnalysis());

    await act(async () => {
      await result.current.run("");
    });

    expect(mockFetchAllPages).not.toHaveBeenCalled();
    expect(result.current.data).toBeNull();
  });

  it("skips whitespace-only company name", async () => {
    const { result } = renderHook(() => useCompetitorAnalysis());

    await act(async () => {
      await result.current.run("   ");
    });

    expect(mockFetchAllPages).not.toHaveBeenCalled();
  });

  it("fetches and analyzes on valid company name", async () => {
    const records = [{ date: 20260101 }] as never[];
    const analysis = makeSelfAnalysis({ wins: 5 });
    mockFetchAllPages.mockResolvedValueOnce(records);
    mockAnalyzeSelf.mockReturnValueOnce(analysis);

    const { result } = renderHook(() => useCompetitorAnalysis());

    await act(async () => {
      await result.current.run("台灣工程公司");
    });

    expect(mockFetchAllPages).toHaveBeenCalledWith("台灣工程公司", expect.any(Function));
    expect(mockAnalyzeSelf).toHaveBeenCalledWith(records, "台灣工程公司");
    expect(result.current.data).toEqual(analysis);
    expect(result.current.loading).toBe(false);
  });

  it("trims company name", async () => {
    mockFetchAllPages.mockResolvedValueOnce([]);
    mockAnalyzeSelf.mockReturnValueOnce(makeSelfAnalysis());

    const { result } = renderHook(() => useCompetitorAnalysis());

    await act(async () => {
      await result.current.run("  公司名  ");
    });

    expect(mockCacheGet).toHaveBeenCalledWith("analysis", "competitor:公司名");
  });

  it("caches result after analysis", async () => {
    const analysis = makeSelfAnalysis();
    mockFetchAllPages.mockResolvedValueOnce([]);
    mockAnalyzeSelf.mockReturnValueOnce(analysis);

    const { result } = renderHook(() => useCompetitorAnalysis());

    await act(async () => {
      await result.current.run("公司A");
    });

    expect(mockCacheSet).toHaveBeenCalledWith("analysis", "competitor:公司A", analysis);
  });
});

// ── Cache hit ──────────────────────────────────────────────

describe("useCompetitorAnalysis — cache", () => {
  it("returns cached result without fetching", async () => {
    const cached = makeSelfAnalysis({ totalRecords: 99 });
    mockCacheGet.mockReturnValueOnce(cached);

    const { result } = renderHook(() => useCompetitorAnalysis());

    await act(async () => {
      await result.current.run("CachedCo");
    });

    expect(mockFetchAllPages).not.toHaveBeenCalled();
    expect(mockAnalyzeSelf).not.toHaveBeenCalled();
    expect(result.current.data).toEqual(cached);
  });
});

// ── Error handling ─────────────────────────────────────────

describe("useCompetitorAnalysis — error", () => {
  it("sets error on fetch failure", async () => {
    mockFetchAllPages.mockRejectedValueOnce(new Error("API timeout"));

    const { result } = renderHook(() => useCompetitorAnalysis());

    await act(async () => {
      await result.current.run("FailCo");
    });

    expect(result.current.error).toBe("API timeout");
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it("sets generic error for non-Error throws", async () => {
    mockFetchAllPages.mockRejectedValueOnce("unknown");

    const { result } = renderHook(() => useCompetitorAnalysis());

    await act(async () => {
      await result.current.run("FailCo");
    });

    expect(result.current.error).toBe("分析失敗");
  });

  it("resets data and progress on new run", async () => {
    const analysis = makeSelfAnalysis();
    mockFetchAllPages.mockResolvedValueOnce([]);
    mockAnalyzeSelf.mockReturnValueOnce(analysis);

    const { result } = renderHook(() => useCompetitorAnalysis());

    // First run
    await act(async () => {
      await result.current.run("公司A");
    });
    expect(result.current.data).not.toBeNull();

    // Second run: resets before fetch
    mockFetchAllPages.mockRejectedValueOnce(new Error("fail"));

    await act(async () => {
      await result.current.run("公司B");
    });

    expect(result.current.data).toBeNull();
    expect(result.current.progress).toBeNull();
  });
});
