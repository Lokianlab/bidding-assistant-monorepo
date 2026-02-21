import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useCrossAnalysis } from "../useCrossAnalysis";
import type { NotionPage } from "../types";
import { F } from "../types";

// ── Helpers ────────────────────────────────────────────────

function makePage(props: Record<string, unknown>): NotionPage {
  return { id: "test-id", url: "https://notion.so/test", properties: props };
}

// ── Tests ──────────────────────────────────────────────────

describe("useCrossAnalysis", () => {
  it("returns all expected fields", () => {
    const { result } = renderHook(() => useCrossAnalysis([]));

    expect(result.current).toHaveProperty("byWriter");
    expect(result.current).toHaveProperty("byAgency");
    expect(result.current).toHaveProperty("byType");
    expect(result.current).toHaveProperty("byMethod");
    expect(result.current).toHaveProperty("byBudgetRange");
    expect(result.current).toHaveProperty("byPriority");
    expect(result.current).toHaveProperty("byDecision");
    expect(result.current).toHaveProperty("globalInsights");
    expect(result.current).toHaveProperty("costAnalysis");
    expect(result.current).toHaveProperty("writerNames");
  });

  it("returns empty arrays for empty pages", () => {
    const { result } = renderHook(() => useCrossAnalysis([]));

    expect(result.current.byWriter).toEqual([]);
    expect(result.current.byAgency).toEqual([]);
    expect(result.current.writerNames).toEqual([]);
    expect(result.current.globalInsights).toEqual([]);
  });

  it("produces breakdowns from pages with data", () => {
    const pages = [
      makePage({
        [F.企劃主筆]: ["Alice"],
        [F.招標機關]: "Agency A",
        [F.標案類型]: "勞務",
        [F.進程]: "得標",
        [F.預算]: 1000000,
      }),
      makePage({
        [F.企劃主筆]: ["Bob"],
        [F.招標機關]: "Agency B",
        [F.標案類型]: "財物",
        [F.進程]: "未獲青睞",
        [F.預算]: 500000,
      }),
    ];

    const { result } = renderHook(() => useCrossAnalysis(pages));

    // byWriter should have 2 entries (Alice, Bob)
    expect(result.current.byWriter.length).toBeGreaterThanOrEqual(2);

    // writerNames should be sorted
    const names = result.current.writerNames;
    const sorted = [...names].sort();
    expect(names).toEqual(sorted);
  });

  it("memoizes results (same reference for same pages)", () => {
    const pages = [makePage({ [F.企劃主筆]: ["Alice"], [F.進程]: "得標" })];

    const { result, rerender } = renderHook(
      ({ p }) => useCrossAnalysis(p),
      { initialProps: { p: pages } },
    );

    const first = result.current.byWriter;
    rerender({ p: pages }); // same reference
    expect(result.current.byWriter).toBe(first);
  });

  it("recomputes on new pages array", () => {
    const pages1 = [makePage({ [F.企劃主筆]: ["Alice"], [F.進程]: "得標" })];
    const pages2 = [
      makePage({ [F.企劃主筆]: ["Alice"], [F.進程]: "得標" }),
      makePage({ [F.企劃主筆]: ["Bob"], [F.進程]: "未獲青睞" }),
    ];

    const { result, rerender } = renderHook(
      ({ p }) => useCrossAnalysis(p),
      { initialProps: { p: pages1 } },
    );

    const firstWriterCount = result.current.byWriter.length;
    rerender({ p: pages2 });

    // More data → potentially more writer entries
    expect(result.current.byWriter.length).toBeGreaterThanOrEqual(firstWriterCount);
  });

  it("costAnalysis has expected structure", () => {
    const pages = [
      makePage({
        [F.進程]: "得標",
        [F.預算]: 1000000,
        [F.押標金]: 50000,
      }),
    ];

    const { result } = renderHook(() => useCrossAnalysis(pages));

    expect(result.current.costAnalysis).toHaveProperty("totalInvested");
    expect(result.current.costAnalysis).toHaveProperty("totalWonBudget");
    expect(result.current.costAnalysis).toHaveProperty("overallROI");
    expect(result.current.costAnalysis).toHaveProperty("sunkCostTotal");
    expect(typeof result.current.costAnalysis.totalInvested).toBe("number");
  });
});
