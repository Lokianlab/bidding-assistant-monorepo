import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

// ── Shared mocks ─────────────────────────────────────────────

vi.mock("../api", () => ({
  pccApiFetch: vi.fn(),
  delay: vi.fn(() => Promise.resolve()),
}));

vi.mock("../cache", () => ({
  cacheGet: vi.fn(() => null),
  cacheSet: vi.fn(),
}));

vi.mock("../analysis", () => ({
  fetchAllPages: vi.fn(),
  analyzeSelf: vi.fn(),
}));

vi.mock("../market-trend", () => ({
  analyzeMarketTrend: vi.fn(),
}));

vi.mock("../committee-analysis", () => ({
  analyzeCommittees: vi.fn(),
}));

vi.mock("../helpers", () => ({
  isWinner: vi.fn(() => false),
}));

import { pccApiFetch } from "../api";
import { cacheGet, cacheSet } from "../cache";
import { fetchAllPages, analyzeSelf } from "../analysis";
import { analyzeMarketTrend } from "../market-trend";
import { analyzeCommittees } from "../committee-analysis";

const mockPccApiFetch = pccApiFetch as ReturnType<typeof vi.fn>;
const mockCacheGet = cacheGet as ReturnType<typeof vi.fn>;
const mockCacheSet = cacheSet as ReturnType<typeof vi.fn>;
const mockFetchAllPages = fetchAllPages as ReturnType<typeof vi.fn>;
const mockAnalyzeSelf = analyzeSelf as ReturnType<typeof vi.fn>;
const mockAnalyzeMarketTrend = analyzeMarketTrend as ReturnType<typeof vi.fn>;
const mockAnalyzeCommittees = analyzeCommittees as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  mockCacheGet.mockReturnValue(null);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ══════════════════════════════════════════════════════════════
// usePCCSearch
// ══════════════════════════════════════════════════════════════

describe("usePCCSearch", () => {
  // Dynamic import to avoid hoisting issues
  async function getHook() {
    const mod = await import("../usePCCSearch");
    return mod.usePCCSearch;
  }

  it("starts with null results and no loading", async () => {
    const usePCCSearch = await getHook();
    const { result } = renderHook(() => usePCCSearch());
    expect(result.current.results).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("searches by title and sets results", async () => {
    const usePCCSearch = await getHook();
    const searchData = { records: [{ id: "1" }], total_pages: 1 };
    mockPccApiFetch.mockResolvedValueOnce(searchData);

    const { result } = renderHook(() => usePCCSearch());

    await act(async () => {
      await result.current.search("測試標案", "title");
    });

    expect(result.current.results).toEqual(searchData);
    expect(result.current.loading).toBe(false);
    expect(mockPccApiFetch).toHaveBeenCalledWith("searchByTitle", { query: "測試標案", page: 1 });
  });

  it("searches by company name", async () => {
    const usePCCSearch = await getHook();
    mockPccApiFetch.mockResolvedValueOnce({ records: [], total_pages: 0 });

    const { result } = renderHook(() => usePCCSearch());

    await act(async () => {
      await result.current.search("公司名", "company");
    });

    expect(mockPccApiFetch).toHaveBeenCalledWith("searchByCompany", { query: "公司名", page: 1 });
  });

  it("uses cache when available", async () => {
    const usePCCSearch = await getHook();
    const cachedData = { records: [{ id: "cached" }], total_pages: 1 };
    mockCacheGet.mockReturnValueOnce(cachedData);

    const { result } = renderHook(() => usePCCSearch());

    await act(async () => {
      await result.current.search("test", "title");
    });

    expect(result.current.results).toEqual(cachedData);
    expect(mockPccApiFetch).not.toHaveBeenCalled();
  });

  it("handles API error", async () => {
    const usePCCSearch = await getHook();
    mockPccApiFetch.mockRejectedValueOnce(new Error("API 錯誤"));

    const { result } = renderHook(() => usePCCSearch());

    await act(async () => {
      await result.current.search("test", "title");
    });

    expect(result.current.error).toBe("API 錯誤");
    expect(result.current.results).toBeNull();
  });

  it("ignores empty query", async () => {
    const usePCCSearch = await getHook();
    const { result } = renderHook(() => usePCCSearch());

    await act(async () => {
      await result.current.search("", "title");
    });

    expect(mockPccApiFetch).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });

  it("trims query whitespace", async () => {
    const usePCCSearch = await getHook();
    mockPccApiFetch.mockResolvedValueOnce({ records: [], total_pages: 0 });

    const { result } = renderHook(() => usePCCSearch());

    await act(async () => {
      await result.current.search("  test  ", "title");
    });

    expect(mockPccApiFetch).toHaveBeenCalledWith("searchByTitle", { query: "test", page: 1 });
  });

  it("clearResults resets state", async () => {
    const usePCCSearch = await getHook();
    mockPccApiFetch.mockResolvedValueOnce({ records: [{ id: "1" }], total_pages: 1 });

    const { result } = renderHook(() => usePCCSearch());

    await act(async () => {
      await result.current.search("test", "title");
    });
    expect(result.current.results).not.toBeNull();

    act(() => {
      result.current.clearResults();
    });
    expect(result.current.results).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("saves to cache after successful fetch", async () => {
    const usePCCSearch = await getHook();
    const data = { records: [{ id: "1" }], total_pages: 1 };
    mockPccApiFetch.mockResolvedValueOnce(data);

    const { result } = renderHook(() => usePCCSearch());

    await act(async () => {
      await result.current.search("test", "title", 2);
    });

    expect(mockCacheSet).toHaveBeenCalledWith("search", "title:test:p2", data);
  });
});

// ══════════════════════════════════════════════════════════════
// fetchTenderDetail
// ══════════════════════════════════════════════════════════════

describe("fetchTenderDetail", () => {
  async function getFunc() {
    const mod = await import("../usePCCSearch");
    return mod.fetchTenderDetail;
  }

  it("fetches detail from API", async () => {
    const fetchTenderDetail = await getFunc();
    const detail = { title: "test" };
    mockPccApiFetch.mockResolvedValueOnce(detail);

    const result = await fetchTenderDetail("unit-1", "job-1");

    expect(result).toEqual(detail);
    expect(mockPccApiFetch).toHaveBeenCalledWith("getTenderDetail", { unitId: "unit-1", jobNumber: "job-1" });
  });

  it("returns cached detail", async () => {
    const fetchTenderDetail = await getFunc();
    const cached = { title: "cached" };
    mockCacheGet.mockReturnValueOnce(cached);

    const result = await fetchTenderDetail("unit-1", "job-1");

    expect(result).toEqual(cached);
    expect(mockPccApiFetch).not.toHaveBeenCalled();
  });
});

// ══════════════════════════════════════════════════════════════
// useCompetitorAnalysis
// ══════════════════════════════════════════════════════════════

describe("useCompetitorAnalysis", () => {
  async function getHook() {
    const mod = await import("../useCompetitorAnalysis");
    return mod.useCompetitorAnalysis;
  }

  it("starts with null data", async () => {
    const useCompetitorAnalysis = await getHook();
    const { result } = renderHook(() => useCompetitorAnalysis());
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it("runs analysis and sets data", async () => {
    const useCompetitorAnalysis = await getHook();
    const records = [{ id: "1" }];
    const analysis = { winRate: 0.5, totalBids: 10 };
    mockFetchAllPages.mockResolvedValueOnce(records);
    mockAnalyzeSelf.mockReturnValue(analysis);

    const { result } = renderHook(() => useCompetitorAnalysis());

    await act(async () => {
      await result.current.run("我的公司");
    });

    expect(result.current.data).toEqual(analysis);
    expect(result.current.loading).toBe(false);
    expect(mockFetchAllPages).toHaveBeenCalledWith("我的公司", expect.any(Function));
  });

  it("uses cache when available", async () => {
    const useCompetitorAnalysis = await getHook();
    const cached = { winRate: 0.8 };
    mockCacheGet.mockReturnValueOnce(cached);

    const { result } = renderHook(() => useCompetitorAnalysis());

    await act(async () => {
      await result.current.run("公司");
    });

    expect(result.current.data).toEqual(cached);
    expect(mockFetchAllPages).not.toHaveBeenCalled();
  });

  it("ignores empty company name", async () => {
    const useCompetitorAnalysis = await getHook();
    const { result } = renderHook(() => useCompetitorAnalysis());

    await act(async () => {
      await result.current.run("  ");
    });

    expect(mockFetchAllPages).not.toHaveBeenCalled();
  });

  it("handles error", async () => {
    const useCompetitorAnalysis = await getHook();
    mockFetchAllPages.mockRejectedValueOnce(new Error("網路錯誤"));

    const { result } = renderHook(() => useCompetitorAnalysis());

    await act(async () => {
      await result.current.run("公司");
    });

    expect(result.current.error).toBe("網路錯誤");
  });
});

// ══════════════════════════════════════════════════════════════
// useAgencyIntel
// ══════════════════════════════════════════════════════════════

describe("useAgencyIntel", () => {
  async function getHook() {
    const mod = await import("../useAgencyIntel");
    return mod.useAgencyIntel;
  }

  it("returns null when unitId is null", async () => {
    const useAgencyIntel = await getHook();
    const { result } = renderHook(() => useAgencyIntel(null, true, "公司"));
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it("returns null when not open", async () => {
    const useAgencyIntel = await getHook();
    const { result } = renderHook(() => useAgencyIntel("unit-1", false, "公司"));
    expect(result.current.data).toBeNull();
  });

  it("fetches and analyzes agency data", async () => {
    const useAgencyIntel = await getHook();
    mockPccApiFetch.mockResolvedValueOnce({
      records: [
        {
          unit_id: "u1",
          job_number: "j1",
          date: 1700000000000,
          brief: {
            title: "案件一",
            type: "決標公告",
            companies: { names: ["公司A"], ids: ["c1"] },
          },
        },
      ],
    });

    const { result } = renderHook(() => useAgencyIntel("unit-1", true, "公司B"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).not.toBeNull();
    expect(result.current.data!.totalCases).toBe(1);
  });

  it("uses cache when available", async () => {
    const useAgencyIntel = await getHook();
    const cached = { totalCases: 5, recentCases: [], incumbents: [], myHistory: [] };
    mockCacheGet.mockReturnValueOnce(cached);

    const { result } = renderHook(() => useAgencyIntel("unit-1", true, "公司"));

    await waitFor(() => {
      expect(result.current.data).toEqual(cached);
    });
    expect(mockPccApiFetch).not.toHaveBeenCalled();
  });

  it("handles API error", async () => {
    const useAgencyIntel = await getHook();
    mockPccApiFetch.mockRejectedValueOnce(new Error("API 壞了"));

    const { result } = renderHook(() => useAgencyIntel("unit-1", true, "公司"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.error).toBe("API 壞了");
  });
});

// ══════════════════════════════════════════════════════════════
// useMarketTrend
// ══════════════════════════════════════════════════════════════

describe("useMarketTrend", () => {
  async function getHook() {
    const mod = await import("../useMarketTrend");
    return mod.useMarketTrend;
  }

  it("starts with null data", async () => {
    const useMarketTrend = await getHook();
    const { result } = renderHook(() => useMarketTrend());
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it("fetches pages and analyzes trend", async () => {
    const useMarketTrend = await getHook();
    const page1Data = { records: [{ id: "r1" }], total_pages: 1 };
    mockPccApiFetch.mockResolvedValueOnce(page1Data);
    const trend = { yearlyVolume: [{ year: 2024, count: 5 }] };
    mockAnalyzeMarketTrend.mockReturnValue(trend);

    const { result } = renderHook(() => useMarketTrend());

    await act(async () => {
      await result.current.run("關鍵字");
    });

    expect(result.current.data).toEqual(trend);
    expect(mockPccApiFetch).toHaveBeenCalledWith("searchByTitle", { query: "關鍵字", page: 1 });
  });

  it("paginates multiple pages", async () => {
    const useMarketTrend = await getHook();
    mockPccApiFetch
      .mockResolvedValueOnce({ records: [{ id: "1" }], total_pages: 3 })
      .mockResolvedValueOnce({ records: [{ id: "2" }], total_pages: 3 })
      .mockResolvedValueOnce({ records: [{ id: "3" }], total_pages: 3 });
    mockAnalyzeMarketTrend.mockReturnValue({ yearlyVolume: [] });

    const { result } = renderHook(() => useMarketTrend());

    await act(async () => {
      await result.current.run("test");
    });

    // Should have called API 3 times (page 1, 2, 3)
    expect(mockPccApiFetch).toHaveBeenCalledTimes(3);
    // analyzeMarketTrend should receive all 3 records
    expect(mockAnalyzeMarketTrend).toHaveBeenCalledWith(
      [{ id: "1" }, { id: "2" }, { id: "3" }],
      "test",
    );
  });

  it("uses cache", async () => {
    const useMarketTrend = await getHook();
    const cached = { yearlyVolume: [{ year: 2024, count: 10 }] };
    mockCacheGet.mockReturnValueOnce(cached);

    const { result } = renderHook(() => useMarketTrend());

    await act(async () => {
      await result.current.run("test");
    });

    expect(result.current.data).toEqual(cached);
    expect(mockPccApiFetch).not.toHaveBeenCalled();
  });

  it("ignores empty keyword", async () => {
    const useMarketTrend = await getHook();
    const { result } = renderHook(() => useMarketTrend());

    await act(async () => {
      await result.current.run("");
    });

    expect(mockPccApiFetch).not.toHaveBeenCalled();
  });
});

// ══════════════════════════════════════════════════════════════
// useCommitteeAnalysis
// ══════════════════════════════════════════════════════════════

describe("useCommitteeAnalysis", () => {
  async function getHook() {
    const mod = await import("../useCommitteeAnalysis");
    return mod.useCommitteeAnalysis;
  }

  it("starts with null data", async () => {
    const useCommitteeAnalysis = await getHook();
    const { result } = renderHook(() => useCommitteeAnalysis());
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it("returns empty analysis when no awards", async () => {
    const useCommitteeAnalysis = await getHook();
    mockPccApiFetch.mockResolvedValueOnce({ records: [] }); // no records

    const { result } = renderHook(() => useCommitteeAnalysis());

    await act(async () => {
      await result.current.run("unit-1", "機關A");
    });

    expect(result.current.data).toEqual({ totalMembers: 0, totalTenders: 0, frequentMembers: [] });
  });

  it("fetches records then details for each award", async () => {
    const useCommitteeAnalysis = await getHook();
    // listByUnit returns records
    mockPccApiFetch.mockResolvedValueOnce({
      records: [
        { unit_id: "u1", job_number: "j1", brief: { type: "決標公告", title: "案件1" }, date: 1700000000000 },
      ],
    });
    // getTenderDetail returns detail with committee
    mockPccApiFetch.mockResolvedValueOnce({
      evaluation_committee: ["委員A", "委員B"],
    });
    const analysis = { totalMembers: 2, totalTenders: 1, frequentMembers: [] };
    mockAnalyzeCommittees.mockReturnValue(analysis);

    const { result } = renderHook(() => useCommitteeAnalysis());

    await act(async () => {
      await result.current.run("u1", "機關X");
    });

    expect(result.current.data).toEqual(analysis);
    expect(mockPccApiFetch).toHaveBeenCalledTimes(2);
  });

  it("uses cache", async () => {
    const useCommitteeAnalysis = await getHook();
    const cached = { totalMembers: 5, totalTenders: 3, frequentMembers: [] };
    mockCacheGet.mockReturnValueOnce(cached);

    const { result } = renderHook(() => useCommitteeAnalysis());

    await act(async () => {
      await result.current.run("u1", "機關");
    });

    expect(result.current.data).toEqual(cached);
    expect(mockPccApiFetch).not.toHaveBeenCalled();
  });

  it("ignores empty unitId", async () => {
    const useCommitteeAnalysis = await getHook();
    const { result } = renderHook(() => useCommitteeAnalysis());

    await act(async () => {
      await result.current.run("", "機關");
    });

    expect(mockPccApiFetch).not.toHaveBeenCalled();
  });

  it("handles error gracefully", async () => {
    const useCommitteeAnalysis = await getHook();
    mockPccApiFetch.mockRejectedValueOnce(new Error("timeout"));

    const { result } = renderHook(() => useCommitteeAnalysis());

    await act(async () => {
      await result.current.run("u1", "機關");
    });

    expect(result.current.error).toBe("timeout");
    expect(result.current.loading).toBe(false);
  });

  it("skips detail failures without breaking analysis", async () => {
    const useCommitteeAnalysis = await getHook();
    // listByUnit returns 2 records
    mockPccApiFetch.mockResolvedValueOnce({
      records: [
        { unit_id: "u1", job_number: "j1", brief: { type: "決標公告", title: "案件1" }, date: 1700000000000 },
        { unit_id: "u1", job_number: "j2", brief: { type: "決標公告", title: "案件2" }, date: 1700000000000 },
      ],
    });
    // First detail fails
    mockPccApiFetch.mockRejectedValueOnce(new Error("detail fail"));
    // Second detail succeeds
    mockPccApiFetch.mockResolvedValueOnce({
      evaluation_committee: ["委員C"],
    });
    mockAnalyzeCommittees.mockReturnValue({ totalMembers: 1, totalTenders: 1, frequentMembers: [] });

    const { result } = renderHook(() => useCommitteeAnalysis());

    await act(async () => {
      await result.current.run("u1", "機關");
    });

    // Should succeed despite one detail failure
    expect(result.current.data).not.toBeNull();
    expect(result.current.error).toBeNull();
  });
});
