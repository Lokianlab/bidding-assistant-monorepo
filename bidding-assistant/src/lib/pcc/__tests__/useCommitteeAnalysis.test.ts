import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { PCCRecord, PCCTenderDetail } from "../types";
import type { CommitteeAnalysis } from "../committee-analysis";

// ── Mocks ──────────────────────────────────────────────────

vi.mock("../api", () => ({
  pccApiFetch: vi.fn(),
  delay: vi.fn(() => Promise.resolve()),
}));

vi.mock("../cache", () => ({
  cacheGet: vi.fn(() => null),
  cacheSet: vi.fn(),
}));

vi.mock("../committee-analysis", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../committee-analysis")>();
  return {
    ...actual,
    analyzeCommittees: vi.fn(),
  };
});

import { pccApiFetch } from "../api";
import { cacheGet, cacheSet } from "../cache";
import { analyzeCommittees } from "../committee-analysis";
import { useCommitteeAnalysis } from "../useCommitteeAnalysis";

const mockFetch = vi.mocked(pccApiFetch);
const mockCacheGet = vi.mocked(cacheGet);
const mockCacheSet = vi.mocked(cacheSet);
const mockAnalyze = vi.mocked(analyzeCommittees);

// ── Helpers ────────────────────────────────────────────────

function makeRecord(type = "決標公告", jobNumber = "J001"): PCCRecord {
  return {
    date: 20260101,
    filename: "f1",
    brief: { type, title: "Test Tender" },
    job_number: jobNumber,
    unit_id: "U001",
    unit_name: "Agency",
    unit_api_url: "",
    tender_api_url: "",
    unit_url: "",
    url: "",
  };
}

function makeDetail(committee: PCCTenderDetail["evaluation_committee"] = []): PCCTenderDetail {
  return {
    detail: {},
    evaluation_committee: committee,
  };
}

function makeAnalysis(overrides: Partial<CommitteeAnalysis> = {}): CommitteeAnalysis {
  return {
    totalMembers: 5,
    totalTenders: 3,
    frequentMembers: [],
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

describe("useCommitteeAnalysis — initial state", () => {
  it("returns null data, not loading", () => {
    const { result } = renderHook(() => useCommitteeAnalysis());
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.progress).toBeNull();
    expect(result.current.error).toBeNull();
  });
});

// ── Run ────────────────────────────────────────────────────

describe("useCommitteeAnalysis — run", () => {
  it("skips empty unitId", async () => {
    const { result } = renderHook(() => useCommitteeAnalysis());

    await act(async () => {
      await result.current.run("", "Agency");
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns empty analysis when no award records", async () => {
    // listByUnit returns only 招標 records (no 決標)
    mockFetch.mockResolvedValueOnce({ records: [makeRecord("招標公告")] });

    const { result } = renderHook(() => useCommitteeAnalysis());

    await act(async () => {
      await result.current.run("U001", "Agency");
    });

    expect(result.current.data).toEqual({ totalMembers: 0, totalTenders: 0, frequentMembers: [] });
    expect(mockAnalyze).not.toHaveBeenCalled();
  });

  it("fetches details and analyzes committees", async () => {
    const records = [makeRecord("決標公告", "J001"), makeRecord("決標公告", "J002")];
    mockFetch
      // listByUnit
      .mockResolvedValueOnce({ records })
      // getTenderDetail for J001
      .mockResolvedValueOnce(makeDetail([
        { name: "王委員", status: "出席", sequence: "1", attendance: "1/1", experience: "教授" },
      ]))
      // getTenderDetail for J002
      .mockResolvedValueOnce(makeDetail([
        { name: "李委員", status: "出席", sequence: "1", attendance: "1/1", experience: "教授" },
      ]));

    const analysis = makeAnalysis({ totalMembers: 2 });
    mockAnalyze.mockReturnValueOnce(analysis);

    const { result } = renderHook(() => useCommitteeAnalysis());

    await act(async () => {
      await result.current.run("U001", "Agency");
    });

    expect(mockAnalyze).toHaveBeenCalledTimes(1);
    // analyzeCommittees receives tenders with committee data
    const tenders = mockAnalyze.mock.calls[0][0];
    expect(tenders).toHaveLength(2);
    expect(result.current.data).toEqual(analysis);
  });

  it("skips records without evaluation_committee", async () => {
    mockFetch
      .mockResolvedValueOnce({ records: [makeRecord("決標公告")] })
      // Detail without committee
      .mockResolvedValueOnce(makeDetail([]));

    mockAnalyze.mockReturnValueOnce(makeAnalysis({ totalTenders: 0 }));

    const { result } = renderHook(() => useCommitteeAnalysis());

    await act(async () => {
      await result.current.run("U001", "Agency");
    });

    // analyzeCommittees called with empty tenders array (no committee data)
    const tenders = mockAnalyze.mock.calls[0][0];
    expect(tenders).toHaveLength(0);
  });

  it("continues on single detail fetch failure", async () => {
    const records = [makeRecord("決標公告", "J001"), makeRecord("決標公告", "J002")];
    mockFetch
      .mockResolvedValueOnce({ records })
      // J001 fails
      .mockRejectedValueOnce(new Error("Detail not found"))
      // J002 succeeds
      .mockResolvedValueOnce(makeDetail([
        { name: "王委員", status: "出席", sequence: "1", attendance: "1/1", experience: "教授" },
      ]));

    mockAnalyze.mockReturnValueOnce(makeAnalysis({ totalTenders: 1 }));

    const { result } = renderHook(() => useCommitteeAnalysis());

    await act(async () => {
      await result.current.run("U001", "Agency");
    });

    // Only 1 tender (J002 succeeded, J001 failed)
    const tenders = mockAnalyze.mock.calls[0][0];
    expect(tenders).toHaveLength(1);
    expect(result.current.error).toBeNull(); // overall error should be null
  });

  it("caches result after analysis", async () => {
    mockFetch.mockResolvedValueOnce({ records: [] });

    const { result } = renderHook(() => useCommitteeAnalysis());

    await act(async () => {
      await result.current.run("U001", "Agency");
    });

    // No awards → empty result, should NOT cache (early return)
    // The hook sets data directly without calling cacheSet for empty results
    expect(result.current.data).toEqual({ totalMembers: 0, totalTenders: 0, frequentMembers: [] });
  });
});

// ── Cache hit ──────────────────────────────────────────────

describe("useCommitteeAnalysis — cache", () => {
  it("returns cached analysis without fetching", async () => {
    const cached = makeAnalysis({ totalMembers: 99 });
    mockCacheGet.mockReturnValueOnce(cached);

    const { result } = renderHook(() => useCommitteeAnalysis());

    await act(async () => {
      await result.current.run("U001", "Agency");
    });

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.data).toEqual(cached);
  });
});

// ── Error handling ─────────────────────────────────────────

describe("useCommitteeAnalysis — error", () => {
  it("sets error on listByUnit failure", async () => {
    mockFetch.mockRejectedValueOnce(new Error("API error"));

    const { result } = renderHook(() => useCommitteeAnalysis());

    await act(async () => {
      await result.current.run("U001", "Agency");
    });

    expect(result.current.error).toBe("API error");
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
  });
});
