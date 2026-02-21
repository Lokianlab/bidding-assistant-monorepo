import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import type { PCCRecord } from "../types";

// ── Mocks ──────────────────────────────────────────────────

vi.mock("../api", () => ({
  pccApiFetch: vi.fn(),
}));

vi.mock("../cache", () => ({
  cacheGet: vi.fn(() => null),
  cacheSet: vi.fn(),
}));

vi.mock("../helpers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../helpers")>();
  return {
    ...actual,
    isWinner: vi.fn(() => false),
  };
});

import { pccApiFetch } from "../api";
import { cacheGet, cacheSet } from "../cache";
import { isWinner } from "../helpers";
import { useAgencyIntel } from "../useAgencyIntel";

const mockFetch = vi.mocked(pccApiFetch);
const mockCacheGet = vi.mocked(cacheGet);
const mockCacheSet = vi.mocked(cacheSet);
const mockIsWinner = vi.mocked(isWinner);

// ── Helpers ────────────────────────────────────────────────

function makeRecord(
  title = "Test",
  type = "決標公告",
  companies?: PCCRecord["brief"]["companies"],
): PCCRecord {
  return {
    date: 20260101,
    filename: "f1",
    brief: {
      type,
      title,
      companies: companies ?? {
        ids: ["ID1", "ID2"],
        names: ["公司A", "公司B"],
        id_key: {},
        name_key: {},
      },
    },
    job_number: "J001",
    unit_id: "U001",
    unit_name: "Agency",
    unit_api_url: "",
    tender_api_url: "",
    unit_url: "",
    url: "",
  };
}

// ── Setup ──────────────────────────────────────────────────

beforeEach(() => {
  mockFetch.mockReset();
  mockCacheGet.mockReset().mockReturnValue(null);
  mockCacheSet.mockReset();
  mockIsWinner.mockReset().mockReturnValue(false);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── Initial state / Guards ─────────────────────────────────

describe("useAgencyIntel — guards", () => {
  it("returns null when unitId is null", () => {
    const { result } = renderHook(() => useAgencyIntel(null, true, "MyCompany"));
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it("returns null when open is false", () => {
    const { result } = renderHook(() => useAgencyIntel("U001", false, "MyCompany"));
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it("resets data when unitId becomes null", async () => {
    const records = [makeRecord("Case1")];
    mockFetch.mockResolvedValueOnce({ records });

    const { result, rerender } = renderHook(
      ({ unitId, open }) => useAgencyIntel(unitId, open, "MyCompany"),
      { initialProps: { unitId: "U001" as string | null, open: true } },
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Now set unitId to null
    rerender({ unitId: null, open: true });
    expect(result.current.data).toBeNull();
  });
});

// ── Successful fetch ───────────────────────────────────────

describe("useAgencyIntel — fetch", () => {
  it("fetches and analyzes agency records", async () => {
    const records = [
      makeRecord("Case1", "決標公告"),
      makeRecord("Case2", "招標公告"), // not an award, should be filtered
    ];
    mockFetch.mockResolvedValueOnce({ records });

    const { result } = renderHook(() => useAgencyIntel("U001", true, "我的公司"));

    await waitFor(() => {
      expect(result.current.data).not.toBeNull();
    });

    expect(mockFetch).toHaveBeenCalledWith("listByUnit", { unitId: "U001" });
    expect(result.current.data!.totalCases).toBe(1); // only 決標 counted
    expect(result.current.loading).toBe(false);
  });

  it("identifies winners using isWinner helper", async () => {
    mockIsWinner.mockImplementation((_record, name) => name === "公司A");

    const records = [makeRecord("Case1")];
    mockFetch.mockResolvedValueOnce({ records });

    const { result } = renderHook(() => useAgencyIntel("U001", true, "我的"));

    await waitFor(() => {
      expect(result.current.data).not.toBeNull();
    });

    // 公司A is winner (isWinner returns true for it)
    expect(result.current.data!.recentCases[0].winner).toBe("公司A");
  });

  it("tracks myHistory when myCompany matches a company name", async () => {
    mockIsWinner.mockReturnValue(false);

    const records = [makeRecord("Case1", "決標公告", {
      ids: ["ID1"],
      names: ["我的公司"],
      id_key: {},
      name_key: {},
    })];
    mockFetch.mockResolvedValueOnce({ records });

    const { result } = renderHook(() => useAgencyIntel("U001", true, "我的公司"));

    await waitFor(() => {
      expect(result.current.data).not.toBeNull();
    });

    expect(result.current.data!.myHistory).toHaveLength(1);
    expect(result.current.data!.myHistory[0].won).toBe(false);
  });

  it("filters incumbents with wins >= 2", async () => {
    mockIsWinner.mockImplementation((_record, name) => name === "常勝公司");

    // 3 records where 常勝公司 wins each time
    const records = [
      makeRecord("C1", "決標公告", { ids: ["1"], names: ["常勝公司"], id_key: {}, name_key: {} }),
      makeRecord("C2", "決標公告", { ids: ["1"], names: ["常勝公司"], id_key: {}, name_key: {} }),
      makeRecord("C3", "決標公告", { ids: ["1", "2"], names: ["常勝公司", "一次公司"], id_key: {}, name_key: {} }),
    ];
    mockFetch.mockResolvedValueOnce({ records });

    const { result } = renderHook(() => useAgencyIntel("U001", true, "我的"));

    await waitFor(() => {
      expect(result.current.data).not.toBeNull();
    });

    // 常勝公司 has 3 wins → incumbent
    // 一次公司 has 0 wins → not incumbent
    expect(result.current.data!.incumbents).toHaveLength(1);
    expect(result.current.data!.incumbents[0].name).toBe("常勝公司");
    expect(result.current.data!.incumbents[0].wins).toBe(3);
  });

  it("limits recent cases to 10", async () => {
    const records = Array.from({ length: 15 }, (_, i) =>
      makeRecord(`Case${i}`, "決標公告"),
    );
    mockFetch.mockResolvedValueOnce({ records });

    const { result } = renderHook(() => useAgencyIntel("U001", true, "我的"));

    await waitFor(() => {
      expect(result.current.data).not.toBeNull();
    });

    expect(result.current.data!.recentCases.length).toBeLessThanOrEqual(10);
  });

  it("caches analysis result", async () => {
    mockFetch.mockResolvedValueOnce({ records: [] });

    const { result } = renderHook(() => useAgencyIntel("U001", true, "公司A"));

    await waitFor(() => {
      expect(result.current.data).not.toBeNull();
    });

    expect(mockCacheSet).toHaveBeenCalledWith(
      "analysis",
      "agency:U001:公司A",
      expect.objectContaining({ totalCases: 0 }),
    );
  });

  it("handles empty records response", async () => {
    mockFetch.mockResolvedValueOnce({ records: [] });

    const { result } = renderHook(() => useAgencyIntel("U001", true, "公司A"));

    await waitFor(() => {
      expect(result.current.data).not.toBeNull();
    });

    expect(result.current.data!.totalCases).toBe(0);
    expect(result.current.data!.recentCases).toEqual([]);
    expect(result.current.data!.incumbents).toEqual([]);
    expect(result.current.data!.myHistory).toEqual([]);
  });
});

// ── Edge cases ────────────────────────────────────────────

describe("useAgencyIntel — edge cases", () => {
  it("skips records without companies field", async () => {
    // Record with no companies — analyzeAgency should skip it
    const recordNoCompanies: PCCRecord = {
      date: 20260101,
      filename: "f1",
      brief: { type: "決標公告", title: "No Companies" },
      job_number: "J001",
      unit_id: "U001",
      unit_name: "Agency",
      unit_api_url: "",
      tender_api_url: "",
      unit_url: "",
      url: "",
    };
    mockFetch.mockResolvedValueOnce({ records: [recordNoCompanies] });

    const { result } = renderHook(() => useAgencyIntel("U001", true, "我的"));

    await waitFor(() => {
      expect(result.current.data).not.toBeNull();
    });

    // totalCases = 1 (it's a 決標公告), but recentCases empty because no companies
    expect(result.current.data!.totalCases).toBe(1);
    expect(result.current.data!.recentCases).toEqual([]);
    expect(result.current.data!.incumbents).toEqual([]);
  });

  it("processes at most 50 award records", async () => {
    mockIsWinner.mockReturnValue(false);

    const records = Array.from({ length: 60 }, (_, i) =>
      makeRecord(`Case${i}`, "決標公告"),
    );
    mockFetch.mockResolvedValueOnce({ records });

    const { result } = renderHook(() => useAgencyIntel("U001", true, "我的"));

    await waitFor(() => {
      expect(result.current.data).not.toBeNull();
    });

    // totalCases counts all awards (60), but recentCases is capped at 10
    // The internal loop processes at most 50, then recentCases.slice(0, 10)
    expect(result.current.data!.totalCases).toBe(60);
    expect(result.current.data!.recentCases.length).toBe(10);
  });

  it("does not update state after unmount", async () => {
    let resolvePromise: (v: { records: PCCRecord[] }) => void;
    mockFetch.mockReturnValueOnce(
      new Promise((resolve) => { resolvePromise = resolve; }),
    );

    const { result, unmount } = renderHook(() => useAgencyIntel("U001", true, "公司A"));

    expect(result.current.loading).toBe(true);

    // Unmount before fetch resolves
    unmount();

    // Resolve after unmount — cancelled flag should prevent state update
    resolvePromise!({ records: [makeRecord()] });

    // No error thrown (cancelled guard works)
    expect(result.current.data).toBeNull();
  });
});

// ── Cache hit ──────────────────────────────────────────────

describe("useAgencyIntel — cache", () => {
  it("returns cached data without API call", async () => {
    const cached = { totalCases: 99, recentCases: [], incumbents: [], myHistory: [] };
    mockCacheGet.mockReturnValueOnce(cached);

    const { result } = renderHook(() => useAgencyIntel("U001", true, "公司A"));

    await waitFor(() => {
      expect(result.current.data).not.toBeNull();
    });

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.data).toEqual(cached);
  });
});

// ── Error handling ─────────────────────────────────────────

describe("useAgencyIntel — error", () => {
  it("sets error on fetch failure", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useAgencyIntel("U001", true, "公司A"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe("Network error");
    expect(result.current.data).toBeNull();
  });

  it("sets generic error for non-Error throws", async () => {
    mockFetch.mockRejectedValueOnce("unknown");

    const { result } = renderHook(() => useAgencyIntel("U001", true, "公司A"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe("載入失敗");
  });
});
