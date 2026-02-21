import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import type { PCCSearchResponse } from "../types";

// ── Mocks ──────────────────────────────────────────────────

vi.mock("../api", () => ({
  pccApiFetch: vi.fn(),
}));

vi.mock("../cache", () => ({
  cacheGet: vi.fn(() => null),
  cacheSet: vi.fn(),
}));

import { pccApiFetch } from "../api";
import { cacheGet, cacheSet } from "../cache";
import { usePCCSearch, fetchTenderDetail } from "../usePCCSearch";

const mockFetch = vi.mocked(pccApiFetch);
const mockCacheGet = vi.mocked(cacheGet);
const mockCacheSet = vi.mocked(cacheSet);

// ── Helpers ────────────────────────────────────────────────

function makeResponse(overrides: Partial<PCCSearchResponse> = {}): PCCSearchResponse {
  return {
    page: 1,
    total_records: 1,
    total_pages: 1,
    took: 100,
    records: [
      {
        date: 20260101,
        filename: "f1",
        brief: { type: "決標公告", title: "Test Tender" },
        job_number: "J001",
        unit_id: "U001",
        unit_name: "Test Agency",
        unit_api_url: "",
        tender_api_url: "",
        unit_url: "",
        url: "",
      },
    ],
    ...overrides,
  };
}

// ── Setup ──────────────────────────────────────────────────

beforeEach(() => {
  mockFetch.mockReset();
  mockCacheGet.mockReset().mockReturnValue(null);
  mockCacheSet.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── Initial state ──────────────────────────────────────────

describe("usePCCSearch — initial state", () => {
  it("returns null results, not loading, no error", () => {
    const { result } = renderHook(() => usePCCSearch());
    expect(result.current.results).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.search).toBe("function");
    expect(typeof result.current.clearResults).toBe("function");
  });
});

// ── Search ─────────────────────────────────────────────────

describe("usePCCSearch — search", () => {
  it("skips empty query", async () => {
    const { result } = renderHook(() => usePCCSearch());

    await act(async () => {
      await result.current.search("", "title");
    });

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.results).toBeNull();
  });

  it("skips whitespace-only query", async () => {
    const { result } = renderHook(() => usePCCSearch());

    await act(async () => {
      await result.current.search("   ", "title");
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("fetches by title mode", async () => {
    const response = makeResponse();
    mockFetch.mockResolvedValueOnce(response);

    const { result } = renderHook(() => usePCCSearch());

    await act(async () => {
      await result.current.search("水利工程", "title");
    });

    expect(mockFetch).toHaveBeenCalledWith("searchByTitle", { query: "水利工程", page: 1 });
    expect(result.current.results).toEqual(response);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("fetches by company mode", async () => {
    const response = makeResponse();
    mockFetch.mockResolvedValueOnce(response);

    const { result } = renderHook(() => usePCCSearch());

    await act(async () => {
      await result.current.search("台灣工程公司", "company");
    });

    expect(mockFetch).toHaveBeenCalledWith("searchByCompany", { query: "台灣工程公司", page: 1 });
    expect(result.current.results).toEqual(response);
  });

  it("passes page parameter", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({ page: 3 }));

    const { result } = renderHook(() => usePCCSearch());

    await act(async () => {
      await result.current.search("test", "title", 3);
    });

    expect(mockFetch).toHaveBeenCalledWith("searchByTitle", { query: "test", page: 3 });
  });

  it("trims query before searching", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse());

    const { result } = renderHook(() => usePCCSearch());

    await act(async () => {
      await result.current.search("  水利  ", "title");
    });

    expect(mockFetch).toHaveBeenCalledWith("searchByTitle", { query: "水利", page: 1 });
  });

  it("caches result after fetch", async () => {
    const response = makeResponse();
    mockFetch.mockResolvedValueOnce(response);

    const { result } = renderHook(() => usePCCSearch());

    await act(async () => {
      await result.current.search("test", "title");
    });

    expect(mockCacheSet).toHaveBeenCalledWith("search", "title:test:p1", response);
  });
});

// ── Cache hit ──────────────────────────────────────────────

describe("usePCCSearch — cache", () => {
  it("returns cached result without calling API", async () => {
    const cached = makeResponse({ total_records: 99 });
    mockCacheGet.mockReturnValueOnce(cached);

    const { result } = renderHook(() => usePCCSearch());

    await act(async () => {
      await result.current.search("cached-query", "title");
    });

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.results).toEqual(cached);
  });
});

// ── Error handling ─────────────────────────────────────────

describe("usePCCSearch — error", () => {
  it("sets error on fetch failure", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => usePCCSearch());

    await act(async () => {
      await result.current.search("test", "title");
    });

    expect(result.current.error).toBe("Network error");
    expect(result.current.results).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it("sets generic error for non-Error throws", async () => {
    mockFetch.mockRejectedValueOnce("string error");

    const { result } = renderHook(() => usePCCSearch());

    await act(async () => {
      await result.current.search("test", "title");
    });

    expect(result.current.error).toBe("搜尋失敗");
  });
});

// ── clearResults ───────────────────────────────────────────

describe("usePCCSearch — clearResults", () => {
  it("clears results and error", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse());

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
});

// ── fetchTenderDetail ──────────────────────────────────────

describe("fetchTenderDetail", () => {
  it("fetches and caches tender detail", async () => {
    const detail = { detail: { title: "Test" } };
    mockFetch.mockResolvedValueOnce(detail);

    const result = await fetchTenderDetail("U001", "J001");

    expect(result).toEqual(detail);
    expect(mockFetch).toHaveBeenCalledWith("getTenderDetail", { unitId: "U001", jobNumber: "J001" });
    expect(mockCacheSet).toHaveBeenCalledWith("detail", "U001:J001", detail);
  });

  it("returns cached detail without API call", async () => {
    const cached = { detail: { title: "Cached" } };
    mockCacheGet.mockReturnValueOnce(cached);

    const result = await fetchTenderDetail("U001", "J001");

    expect(result).toEqual(cached);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
