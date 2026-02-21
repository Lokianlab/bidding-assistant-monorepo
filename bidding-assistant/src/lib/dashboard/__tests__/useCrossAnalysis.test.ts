import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useCrossAnalysis } from "../useCrossAnalysis";
import type { NotionPage } from "../types";
import { F } from "../types";

// ── Helpers ────────────────────────────────────────────────

let pageIdx = 0;

function makePage(
  props: Record<string, unknown>,
  overrides?: Partial<NotionPage>,
): NotionPage {
  return {
    id: `page-${++pageIdx}`,
    url: `https://notion.so/page-${pageIdx}`,
    properties: props,
    ...overrides,
  };
}

function makeWonPage(writer: string, agency: string, budget: number) {
  return makePage({
    [F.企劃主筆]: [writer],
    [F.招標機關]: agency,
    [F.標案類型]: ["勞務"],
    [F.進程]: "得標",
    [F.預算]: budget,
    [F.押標金]: 10000,
    [F.領標費]: 2000,
  });
}

function makeLostPage(writer: string, agency: string, budget: number) {
  return makePage({
    [F.企劃主筆]: [writer],
    [F.招標機關]: agency,
    [F.標案類型]: ["勞務"],
    [F.進程]: "未獲青睞",
    [F.預算]: budget,
    [F.押標金]: 10000,
    [F.領標費]: 2000,
  });
}

// ── Tests ──────────────────────────────────────────────────

describe("useCrossAnalysis", () => {
  // --- 空輸入 ---

  it("returns empty results for empty pages", () => {
    const { result } = renderHook(() => useCrossAnalysis([]));

    expect(result.current.byWriter).toEqual([]);
    expect(result.current.byAgency).toEqual([]);
    expect(result.current.byType).toEqual([]);
    expect(result.current.byMethod).toEqual([]);
    expect(result.current.byBudgetRange).toEqual([]);
    expect(result.current.byPriority).toEqual([]);
    expect(result.current.byDecision).toEqual([]);
    expect(result.current.writerNames).toEqual([]);
    expect(result.current.globalInsights).toEqual([]);
    expect(result.current.costAnalysis.totalInvested).toBe(0);
    expect(result.current.costAnalysis.totalWonBudget).toBe(0);
    expect(result.current.costAnalysis.overallROI).toBe(0);
  });

  // --- byWriter 分組 ---

  it("groups by writer with correct counts", () => {
    const pages = [
      makeWonPage("Alice", "機關A", 1000000),
      makeLostPage("Alice", "機關B", 500000),
      makeWonPage("Bob", "機關A", 800000),
    ];

    const { result } = renderHook(() => useCrossAnalysis(pages));

    expect(result.current.byWriter).toHaveLength(2);
    const alice = result.current.byWriter.find((w) => w.key === "Alice");
    const bob = result.current.byWriter.find((w) => w.key === "Bob");

    expect(alice).toBeDefined();
    expect(alice!.total).toBe(2);
    expect(alice!.won).toBe(1);
    expect(alice!.lost).toBe(1);
    expect(alice!.winRate).toBe(50); // 1 won / (1 won + 1 lost) * 100

    expect(bob).toBeDefined();
    expect(bob!.total).toBe(1);
    expect(bob!.won).toBe(1);
    expect(bob!.winRate).toBe(100);
  });

  // --- writerNames 排序 ---

  it("writerNames are sorted alphabetically", () => {
    const pages = [
      makeWonPage("Charlie", "機關A", 100000),
      makeWonPage("Alice", "機關B", 200000),
      makeWonPage("Bob", "機關C", 300000),
    ];

    const { result } = renderHook(() => useCrossAnalysis(pages));

    expect(result.current.writerNames).toEqual(["Alice", "Bob", "Charlie"]);
  });

  // --- byType 分組（修正：陣列格式） ---

  it("groups by type correctly (array format)", () => {
    const pages = [
      makePage({
        [F.企劃主筆]: ["Alice"],
        [F.標案類型]: ["勞務"],
        [F.進程]: "得標",
      }),
      makePage({
        [F.企劃主筆]: ["Bob"],
        [F.標案類型]: ["財物"],
        [F.進程]: "未獲青睞",
      }),
      makePage({
        [F.企劃主筆]: ["Charlie"],
        [F.標案類型]: ["勞務"],
        [F.進程]: "得標",
      }),
    ];

    const { result } = renderHook(() => useCrossAnalysis(pages));

    expect(result.current.byType).toHaveLength(2);
    const labor = result.current.byType.find((t) => t.key === "勞務");
    const goods = result.current.byType.find((t) => t.key === "財物");

    expect(labor).toBeDefined();
    expect(labor!.total).toBe(2);
    expect(labor!.won).toBe(2);

    expect(goods).toBeDefined();
    expect(goods!.total).toBe(1);
    expect(goods!.lost).toBe(1);
  });

  // --- costAnalysis 精確計算 ---

  it("costAnalysis calculates correct totals", () => {
    const pages = [
      makePage({
        [F.進程]: "得標",
        [F.預算]: 1000000,
        [F.押標金]: 50000,
        [F.領標費]: 5000,
      }),
      makePage({
        [F.進程]: "未獲青睞",
        [F.預算]: 500000,
        [F.押標金]: 30000,
        [F.領標費]: 3000,
      }),
    ];

    const { result } = renderHook(() => useCrossAnalysis(pages));

    // totalInvested = (50000+5000) + (30000+3000) = 88000
    expect(result.current.costAnalysis.totalInvested).toBe(88000);
    // totalWonBudget = 1000000 (only 得標)
    expect(result.current.costAnalysis.totalWonBudget).toBe(1000000);
    // overallROI = 1000000 / 88000 ≈ 11.36
    expect(result.current.costAnalysis.overallROI).toBeCloseTo(11.36, 1);
  });

  it("costAnalysis returns 0 ROI when no investment", () => {
    const pages = [
      makePage({ [F.進程]: "追蹤中" }), // not in PROCURED_STATUSES
    ];

    const { result } = renderHook(() => useCrossAnalysis(pages));

    expect(result.current.costAnalysis.totalInvested).toBe(0);
    expect(result.current.costAnalysis.overallROI).toBe(0);
  });

  // --- memoization ---

  it("memoizes results for same pages reference", () => {
    const pages = [makeWonPage("Alice", "機關A", 100000)];

    const { result, rerender } = renderHook(
      ({ p }) => useCrossAnalysis(p),
      { initialProps: { p: pages } },
    );

    const first = result.current.byWriter;
    rerender({ p: pages }); // same reference
    expect(result.current.byWriter).toBe(first);
  });

  it("recomputes on new pages array", () => {
    const pages1 = [makeWonPage("Alice", "機關A", 100000)];
    const pages2 = [
      makeWonPage("Alice", "機關A", 100000),
      makeWonPage("Bob", "機關B", 200000),
    ];

    const { result, rerender } = renderHook(
      ({ p }) => useCrossAnalysis(p),
      { initialProps: { p: pages1 } },
    );

    expect(result.current.byWriter).toHaveLength(1);
    rerender({ p: pages2 });
    expect(result.current.byWriter).toHaveLength(2);
  });

  // --- 缺欄位容錯 ---

  it("handles pages with missing fields gracefully", () => {
    const pages = [
      makePage({}), // completely empty properties
      makePage({ [F.進程]: "得標" }), // no writer/agency/budget
    ];

    const { result } = renderHook(() => useCrossAnalysis(pages));

    // Should not crash
    expect(result.current.costAnalysis.totalWonBudget).toBe(0);
  });

  // --- byAgency 分組 ---

  it("groups by agency with correct win rate", () => {
    const pages = [
      makeWonPage("Alice", "教育部", 1000000),
      makeLostPage("Bob", "教育部", 500000),
      makeLostPage("Charlie", "教育部", 300000),
      makeWonPage("Alice", "衛福部", 800000),
    ];

    const { result } = renderHook(() => useCrossAnalysis(pages));

    const edu = result.current.byAgency.find((a) => a.key === "教育部");
    const health = result.current.byAgency.find((a) => a.key === "衛福部");

    expect(edu).toBeDefined();
    expect(edu!.total).toBe(3);
    expect(edu!.won).toBe(1);
    expect(edu!.winRate).toBe(33); // 1/3 = 33%

    expect(health).toBeDefined();
    expect(health!.total).toBe(1);
    expect(health!.winRate).toBe(100);
  });

  // --- globalInsights 觸發 ---

  it("generates agency difficulty insight when 5+ losses at same agency", () => {
    // 在同一機關投 5 件全部未得標 → 觸發「機關難度高」洞見
    const pages = Array.from({ length: 5 }, (_, i) =>
      makeLostPage(`Writer${i}`, "難搞機關", 100000 * (i + 1)),
    );

    const { result } = renderHook(() => useCrossAnalysis(pages));

    const agencyInsight = result.current.globalInsights.find(
      (ins) => ins.text.includes("難搞機關"),
    );
    expect(agencyInsight).toBeDefined();
  });

  it("generates agency advantage insight when 50%+ win rate at agency with 3+ bids", () => {
    // 在同一機關投 4 件得標 3 件 → 勝率 75% ≥ 50% 且 ≥3 件 → 觸發「機關優勢」
    const pages = [
      makeWonPage("Alice", "友善機關", 1000000),
      makeWonPage("Bob", "友善機關", 800000),
      makeWonPage("Charlie", "友善機關", 600000),
      makeLostPage("Dave", "友善機關", 400000),
    ];

    const { result } = renderHook(() => useCrossAnalysis(pages));

    const goodInsight = result.current.globalInsights.find(
      (ins) => ins.type === "good" && ins.text.includes("友善機關"),
    );
    expect(goodInsight).toBeDefined();
  });
});
