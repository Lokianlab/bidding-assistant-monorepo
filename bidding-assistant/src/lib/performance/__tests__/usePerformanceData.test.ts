import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { usePerformanceData } from "../usePerformanceData";

// ── Mocks ────────────────────────────────────────────────────

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

vi.mock("@/lib/dashboard/helpers", () => ({
  loadPerfCache: vi.fn(() => null),
  savePerfCache: vi.fn(),
}));

vi.mock("@/lib/dashboard/types", () => ({
  REVIEW_STATUSES: new Set(["評選中", "決標中"]),
  buildStatusFilter: vi.fn(() => ({ property: "進程", select: { equals: "評選中" } })),
  F: { 進程: "進程" },
}));

vi.mock("@/lib/constants/notion-fields", () => ({
  FIELDS_PERFORMANCE: ["Name", "進程"],
}));

import { loadPerfCache, savePerfCache } from "@/lib/dashboard/helpers";

const mockLoadPerfCache = loadPerfCache as ReturnType<typeof vi.fn>;
const mockSavePerfCache = savePerfCache as ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockFetch.mockReset();
  mockLoadPerfCache.mockReset().mockReturnValue(null);
  mockSavePerfCache.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── Helpers ──────────────────────────────────────────────────

function makePage(id: string) {
  return { id, properties: {} } as unknown;
}

function mockFetchResponse(data: Record<string, unknown>) {
  return mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve(data),
  });
}

// ── Tests ────────────────────────────────────────────────────

describe("usePerformanceData — initialization", () => {
  it("starts with loading=true, empty pages", () => {
    mockFetchResponse({ pages: [makePage("1")], hasMore: false });
    const { result } = renderHook(() =>
      usePerformanceData("token", "db-id", false),
    );
    expect(result.current.loading).toBe(true);
    expect(result.current.allPages).toEqual([]);
    expect(result.current.connected).toBe(false);
    expect(result.current.bgLoading).toBe(false);
  });

  it("does not fetch when hydrated is false", async () => {
    const { result } = renderHook(() =>
      usePerformanceData("token", "db-id", false),
    );
    // Give time for potential fetch
    await new Promise((r) => setTimeout(r, 50));
    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(true);
  });
});

describe("usePerformanceData — no credentials", () => {
  it("sets empty state when token is empty", async () => {
    const { result } = renderHook(() =>
      usePerformanceData("", "db-id", true),
    );
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.allPages).toEqual([]);
    expect(result.current.connected).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("sets empty state when databaseId is empty", async () => {
    const { result } = renderHook(() =>
      usePerformanceData("token", "", true),
    );
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.allPages).toEqual([]);
    expect(result.current.connected).toBe(false);
  });
});

describe("usePerformanceData — successful fetch", () => {
  it("loads pages and sets connected on success (no pagination)", async () => {
    const pages = [makePage("1"), makePage("2")];
    mockFetchResponse({
      pages,
      hasMore: false,
      schema: { props: [] },
    });

    const { result } = renderHook(() =>
      usePerformanceData("token", "db-id", true),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.allPages).toHaveLength(2);
    expect(result.current.connected).toBe(true);
    expect(result.current.bgLoading).toBe(false);
  });

  it("saves cache after complete fetch", async () => {
    const pages = [makePage("1")];
    mockFetchResponse({
      pages,
      hasMore: false,
      schema: { props: [] },
    });

    const { result } = renderHook(() =>
      usePerformanceData("token", "db-id", true),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(mockSavePerfCache).toHaveBeenCalledWith(
      { props: [] },
      pages,
      true,
      undefined,
      undefined,
    );
  });

  it("sends correct request body", async () => {
    mockFetchResponse({ pages: [], hasMore: false });

    renderHook(() => usePerformanceData("my-token", "my-db", true));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe("/api/notion");
    expect(options.method).toBe("POST");
    const body = JSON.parse(options.body);
    expect(body.token).toBe("my-token");
    expect(body.databaseId).toBe("my-db");
    expect(body.action).toBe("schema_and_query");
  });
});

describe("usePerformanceData — empty results", () => {
  it("handles empty pages array (database connected but no data)", async () => {
    mockFetchResponse({ pages: [] });

    const { result } = renderHook(() =>
      usePerformanceData("token", "db-id", true),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.allPages).toEqual([]);
    expect(result.current.connected).toBe(true);
  });

  it("handles no pages property in response", async () => {
    mockFetchResponse({});

    const { result } = renderHook(() =>
      usePerformanceData("token", "db-id", true),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.allPages).toEqual([]);
    expect(result.current.connected).toBe(false);
  });
});

describe("usePerformanceData — pagination", () => {
  it("triggers background loading when hasMore is true", async () => {
    const firstBatch = [makePage("1")];
    const secondBatch = [makePage("2")];

    // First fetch: initial load
    mockFetchResponse({
      pages: firstBatch,
      hasMore: true,
      nextCursor: "cursor-1",
      schema: { props: [] },
    });

    // Second fetch: background continuation
    mockFetchResponse({
      pages: secondBatch,
      hasMore: false,
    });

    const { result } = renderHook(() =>
      usePerformanceData("token", "db-id", true),
    );

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Wait for background load to complete
    await waitFor(() => {
      expect(result.current.bgLoading).toBe(false);
    });

    // Should have both batches
    expect(result.current.allPages).toHaveLength(2);
  });

  it("saves intermediate cache during pagination", async () => {
    mockFetchResponse({
      pages: [makePage("1")],
      hasMore: true,
      nextCursor: "cursor-1",
      schema: { props: [] },
    });

    mockFetchResponse({
      pages: [makePage("2")],
      hasMore: false,
    });

    const { result } = renderHook(() =>
      usePerformanceData("token", "db-id", true),
    );

    await waitFor(() => {
      expect(result.current.bgLoading).toBe(false);
    });

    // Should have saved at least once with incomplete + once complete
    expect(mockSavePerfCache).toHaveBeenCalled();
  });
});

describe("usePerformanceData — cache", () => {
  it("loads from cache immediately, then refreshes from API", async () => {
    mockLoadPerfCache.mockReturnValue({
      schema: { props: [] },
      pages: [makePage("cached-1"), makePage("cached-2")],
      ts: Date.now(),
      complete: true,
    });

    // API will return fresh data
    mockFetchResponse({
      pages: [makePage("fresh-1")],
      hasMore: false,
      schema: { props: [] },
    });

    const { result } = renderHook(() =>
      usePerformanceData("token", "db-id", true),
    );

    // Cache loads immediately (no loading spinner)
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.connected).toBe(true);

    // API still called to refresh data
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  it("resumes from cache when incomplete (has cursor)", async () => {
    mockLoadPerfCache.mockReturnValue({
      schema: { props: [] },
      pages: [makePage("cached-1")],
      ts: Date.now(),
      complete: false,
      nextCursor: "resume-cursor",
    });

    // Background continuation
    mockFetchResponse({
      pages: [makePage("2")],
      hasMore: false,
    });

    const { result } = renderHook(() =>
      usePerformanceData("token", "db-id", true),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should have loaded cached page immediately
    expect(result.current.connected).toBe(true);

    // Background fetch should resume from cursor
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.action).toBe("continue_query");
    expect(body.data.cursor).toBe("resume-cursor");
  });

  it("ignores cache on refresh", async () => {
    mockLoadPerfCache.mockReturnValue({
      schema: { props: [] },
      pages: [makePage("cached")],
      ts: Date.now(),
      complete: true,
    });

    mockFetchResponse({
      pages: [makePage("fresh")],
      hasMore: false,
      schema: { props: [] },
    });

    const { result } = renderHook(() =>
      usePerformanceData("token", "db-id", true),
    );

    // Wait for initial cache load
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Call fetchData with isRefresh=true
    await act(async () => {
      await result.current.fetchData(true);
    });

    // Should have called the API (not just used cache)
    expect(mockFetch).toHaveBeenCalled();
  });
});

describe("usePerformanceData — network error", () => {
  it("falls back to cache on network error", async () => {
    mockFetch.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    mockLoadPerfCache
      .mockReturnValueOnce(null) // First call: no cache, trigger API
      .mockReturnValueOnce({    // Second call: fallback after error
        schema: { props: [] },
        pages: [makePage("fallback")],
        ts: Date.now(),
        complete: true,
      });

    const { result } = renderHook(() =>
      usePerformanceData("token", "db-id", true),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.allPages).toHaveLength(1);
    expect(result.current.connected).toBe(true);
  });

  it("shows empty state when no cache and network error", async () => {
    mockFetch.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    mockLoadPerfCache.mockReturnValue(null);

    const { result } = renderHook(() =>
      usePerformanceData("token", "db-id", true),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.allPages).toEqual([]);
  });
});

describe("usePerformanceData — fetchData API", () => {
  it("exposes fetchData function", () => {
    mockFetchResponse({ pages: [], hasMore: false });
    const { result } = renderHook(() =>
      usePerformanceData("token", "db-id", false),
    );
    expect(typeof result.current.fetchData).toBe("function");
  });
});
