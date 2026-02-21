import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { MarketTrend, PCCSearchResponse, PCCRecord } from "../types";

// ── Mocks ──────────────────────────────────────────────────

vi.mock("../api", () => ({
  pccApiFetch: vi.fn(),
  delay: vi.fn(() => Promise.resolve()),
}));

vi.mock("../cache", () => ({
  cacheGet: vi.fn(() => null),
  cacheSet: vi.fn(),
}));

vi.mock("../market-trend", () => ({
  analyzeMarketTrend: vi.fn(),
}));

import { pccApiFetch } from "../api";
import { cacheGet, cacheSet } from "../cache";
import { analyzeMarketTrend } from "../market-trend";
import { useMarketTrend } from "../useMarketTrend";

const mockFetch = vi.mocked(pccApiFetch);
const mockCacheGet = vi.mocked(cacheGet);
const mockCacheSet = vi.mocked(cacheSet);
const mockAnalyze = vi.mocked(analyzeMarketTrend);

// ── Helpers ────────────────────────────────────────────────

function makeRecord(title = "Test"): PCCRecord {
  return {
    date: 20260101,
    filename: "f1",
    brief: { type: "決標公告", title },
    job_number: "J001",
    unit_id: "U001",
    unit_name: "Agency",
    unit_api_url: "",
    tender_api_url: "",
    unit_url: "",
    url: "",
  };
}

function makeSearchResponse(records: PCCRecord[], totalPages = 1, page = 1): PCCSearchResponse {
  return { page, total_records: records.length, total_pages: totalPages, took: 50, records };
}

function makeTrend(overrides: Partial<MarketTrend> = {}): MarketTrend {
  return {
    keyword: "水利",
    totalRecords: 10,
    yearRange: [2024, 2026],
    yearlyData: [],
    topAgencies: [],
    competitionLevel: "一般",
    trendDirection: "持平",
    ...overrides,
  };
}

// ── Setup ──────────────────────────────────────────────────

beforeEach(() => {
  mockFetch.mockReset();
  mockCacheGet.mockReset().mockReturnValue(null);
  mockCacheSet.mockReset();
  mockAnalyze.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── Initial state ──────────────────────────────────────────

describe("useMarketTrend — initial state", () => {
  it("returns null data, not loading, no progress", () => {
    const { result } = renderHook(() => useMarketTrend());
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.progress).toBeNull();
    expect(result.current.error).toBeNull();
  });
});

// ── Run ────────────────────────────────────────────────────

describe("useMarketTrend — run", () => {
  it("skips empty keyword", async () => {
    const { result } = renderHook(() => useMarketTrend());

    await act(async () => {
      await result.current.run("");
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("fetches single page and analyzes", async () => {
    const records = [makeRecord("水利工程")];
    mockFetch.mockResolvedValueOnce(makeSearchResponse(records, 1));
    const trend = makeTrend();
    mockAnalyze.mockReturnValueOnce(trend);

    const { result } = renderHook(() => useMarketTrend());

    await act(async () => {
      await result.current.run("水利");
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockAnalyze).toHaveBeenCalledWith(records, "水利");
    expect(result.current.data).toEqual(trend);
    expect(result.current.loading).toBe(false);
  });

  it("fetches multiple pages with delay", async () => {
    const r1 = [makeRecord("Page1")];
    const r2 = [makeRecord("Page2")];
    mockFetch
      .mockResolvedValueOnce(makeSearchResponse(r1, 2, 1))
      .mockResolvedValueOnce(makeSearchResponse(r2, 2, 2));
    const trend = makeTrend({ totalRecords: 2 });
    mockAnalyze.mockReturnValueOnce(trend);

    const { result } = renderHook(() => useMarketTrend());

    await act(async () => {
      await result.current.run("test");
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
    // analyzeMarketTrend receives all records from both pages
    expect(mockAnalyze).toHaveBeenCalledWith([...r1, ...r2], "test");
    expect(result.current.data).toEqual(trend);
  });

  it("caps at 20 pages", async () => {
    // First page says 50 total pages, but hook caps at 20
    const responses = Array.from({ length: 20 }, (_, i) =>
      makeSearchResponse([makeRecord(`P${i + 1}`)], 50, i + 1),
    );
    for (const r of responses) {
      mockFetch.mockResolvedValueOnce(r);
    }
    mockAnalyze.mockReturnValueOnce(makeTrend());

    const { result } = renderHook(() => useMarketTrend());

    await act(async () => {
      await result.current.run("keyword");
    });

    expect(mockFetch).toHaveBeenCalledTimes(20);
  });

  it("caches result after analysis", async () => {
    mockFetch.mockResolvedValueOnce(makeSearchResponse([], 1));
    const trend = makeTrend();
    mockAnalyze.mockReturnValueOnce(trend);

    const { result } = renderHook(() => useMarketTrend());

    await act(async () => {
      await result.current.run("快取");
    });

    expect(mockCacheSet).toHaveBeenCalledWith("analysis", "market:快取", trend);
  });

  it("trims keyword", async () => {
    mockFetch.mockResolvedValueOnce(makeSearchResponse([], 1));
    mockAnalyze.mockReturnValueOnce(makeTrend());

    const { result } = renderHook(() => useMarketTrend());

    await act(async () => {
      await result.current.run("  水利  ");
    });

    expect(mockCacheGet).toHaveBeenCalledWith("analysis", "market:水利");
  });
});

// ── Cache hit ──────────────────────────────────────────────

describe("useMarketTrend — cache", () => {
  it("returns cached trend without fetching", async () => {
    const cached = makeTrend({ competitionLevel: "紅海" });
    mockCacheGet.mockReturnValueOnce(cached);

    const { result } = renderHook(() => useMarketTrend());

    await act(async () => {
      await result.current.run("cached");
    });

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.data).toEqual(cached);
  });
});

// ── Error handling ─────────────────────────────────────────

describe("useMarketTrend — error", () => {
  it("sets error on fetch failure", async () => {
    mockFetch.mockRejectedValueOnce(new Error("PCC API down"));

    const { result } = renderHook(() => useMarketTrend());

    await act(async () => {
      await result.current.run("fail");
    });

    expect(result.current.error).toBe("PCC API down");
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.progress).toBeNull();
  });

  it("sets generic error for non-Error throws", async () => {
    mockFetch.mockRejectedValueOnce(42);

    const { result } = renderHook(() => useMarketTrend());

    await act(async () => {
      await result.current.run("fail");
    });

    expect(result.current.error).toBe("分析失敗");
  });
});
