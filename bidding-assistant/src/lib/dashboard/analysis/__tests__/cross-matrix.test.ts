import { describe, it, expect } from "vitest";
import {
  computeCrossMatrix,
  DIMENSION_OPTIONS,
} from "../cross-matrix";
import type { CrossMatrix } from "../cross-matrix";
import type { NotionPage } from "../../types";
import { F } from "../../types";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

let _pageId = 0;
function mockPage(overrides: Record<string, unknown> = {}): NotionPage {
  _pageId++;
  return {
    id: `cross-page-${_pageId}`,
    url: `https://notion.so/cross-page-${_pageId}`,
    properties: {
      [F.名稱]: `Cross Case ${_pageId}`,
      [F.進程]: "等標期間",
      [F.預算]: 1_000_000,
      [F.押標金]: 10_000,
      [F.領標費]: 2_000,
      [F.企劃主筆]: [],
      [F.招標機關]: "",
      [F.標案類型]: [],
      [F.評審方式]: "",
      [F.投遞序位]: "",
      [F.決策]: "",
      ...overrides,
    },
  };
}

// ---------------------------------------------------------------------------
// DIMENSION_OPTIONS
// ---------------------------------------------------------------------------

describe("DIMENSION_OPTIONS", () => {
  it("has 7 dimension options", () => {
    expect(DIMENSION_OPTIONS).toHaveLength(7);
  });

  it("each option has a key and label", () => {
    for (const opt of DIMENSION_OPTIONS) {
      expect(typeof opt.key).toBe("string");
      expect(opt.key.length).toBeGreaterThan(0);
      expect(typeof opt.label).toBe("string");
      expect(opt.label.length).toBeGreaterThan(0);
    }
  });

  it("has expected dimension keys", () => {
    const keys = DIMENSION_OPTIONS.map((o) => o.key);
    expect(keys).toContain("writer");
    expect(keys).toContain("agency");
    expect(keys).toContain("type");
    expect(keys).toContain("method");
    expect(keys).toContain("budgetRange");
    expect(keys).toContain("decision");
    expect(keys).toContain("priority");
  });
});

// ---------------------------------------------------------------------------
// computeCrossMatrix — empty input
// ---------------------------------------------------------------------------

describe("computeCrossMatrix()", () => {
  it("returns empty matrix for no pages", () => {
    const matrix = computeCrossMatrix([], "writer", "agency");
    expect(matrix.rows).toEqual([]);
    expect(matrix.cols).toEqual([]);
    expect(matrix.cells).toEqual([]);
    expect(matrix.rowTotals).toEqual({});
    expect(matrix.colTotals).toEqual({});
  });

  it("sets correct row/col labels", () => {
    const matrix = computeCrossMatrix([], "writer", "agency");
    expect(matrix.rowLabel).toBe("企劃人員");
    expect(matrix.colLabel).toBe("招標機關");
  });

  // ---------------------------------------------------------------------------
  // Basic cross analysis: writer x agency
  // ---------------------------------------------------------------------------

  describe("writer x agency cross analysis", () => {
    const pages = [
      mockPage({
        [F.企劃主筆]: ["Alice"],
        [F.招標機關]: "Agency X",
        [F.進程]: "得標",
        [F.預算]: 5_000_000,
      }),
      mockPage({
        [F.企劃主筆]: ["Alice"],
        [F.招標機關]: "Agency Y",
        [F.進程]: "未獲青睞",
        [F.預算]: 3_000_000,
      }),
      mockPage({
        [F.企劃主筆]: ["Bob"],
        [F.招標機關]: "Agency X",
        [F.進程]: "得標",
        [F.預算]: 2_000_000,
      }),
    ];

    let matrix: CrossMatrix;

    it("computes rows and cols", () => {
      matrix = computeCrossMatrix(pages, "writer", "agency");
      expect(matrix.rows.sort()).toEqual(["Alice", "Bob"]);
      expect(matrix.cols.sort()).toEqual(["Agency X", "Agency Y"]);
    });

    it("creates correct number of cells (rows x cols)", () => {
      matrix = computeCrossMatrix(pages, "writer", "agency");
      expect(matrix.cells).toHaveLength(matrix.rows.length * matrix.cols.length);
    });

    it("fills cell data correctly", () => {
      matrix = computeCrossMatrix(pages, "writer", "agency");
      const aliceX = matrix.cells.find(
        (c) => c.rowKey === "Alice" && c.colKey === "Agency X"
      );
      expect(aliceX).toBeDefined();
      expect(aliceX!.total).toBe(1);
      expect(aliceX!.won).toBe(1);
      expect(aliceX!.wonBudget).toBe(5_000_000);
    });

    it("fills zero for cells with no matching pages", () => {
      matrix = computeCrossMatrix(pages, "writer", "agency");
      const bobY = matrix.cells.find(
        (c) => c.rowKey === "Bob" && c.colKey === "Agency Y"
      );
      expect(bobY).toBeDefined();
      expect(bobY!.total).toBe(0);
      expect(bobY!.won).toBe(0);
    });

    it("computes win rate only from concluded cases", () => {
      matrix = computeCrossMatrix(pages, "writer", "agency");
      const aliceY = matrix.cells.find(
        (c) => c.rowKey === "Alice" && c.colKey === "Agency Y"
      );
      expect(aliceY).toBeDefined();
      // Alice at Agency Y: 1 page "未獲青睞" => concluded = 1, won = 0
      expect(aliceY!.winRate).toBe(0);

      const aliceX = matrix.cells.find(
        (c) => c.rowKey === "Alice" && c.colKey === "Agency X"
      );
      // Alice at Agency X: 1 page "得標" => concluded = 1, won = 1
      expect(aliceX!.winRate).toBe(100);
    });

    it("provides row totals as ResultBreakdown", () => {
      matrix = computeCrossMatrix(pages, "writer", "agency");
      expect(matrix.rowTotals["Alice"]).toBeDefined();
      expect(matrix.rowTotals["Alice"].total).toBe(2);
      expect(matrix.rowTotals["Alice"].won).toBe(1);
      expect(matrix.rowTotals["Bob"]).toBeDefined();
      expect(matrix.rowTotals["Bob"].total).toBe(1);
    });

    it("provides col totals as ResultBreakdown", () => {
      matrix = computeCrossMatrix(pages, "writer", "agency");
      expect(matrix.colTotals["Agency X"]).toBeDefined();
      expect(matrix.colTotals["Agency X"].total).toBe(2);
      expect(matrix.colTotals["Agency Y"]).toBeDefined();
      expect(matrix.colTotals["Agency Y"].total).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // Multi-value dimension (type x method)
  // ---------------------------------------------------------------------------

  describe("type x method (multi-value row)", () => {
    it("handles multi-value dimensions correctly", () => {
      const pages = [
        mockPage({
          [F.標案類型]: ["TypeA", "TypeB"],
          [F.評審方式]: "最有利標",
          [F.進程]: "得標",
          [F.預算]: 5_000_000,
        }),
      ];
      const matrix = computeCrossMatrix(pages, "type", "method");
      // The page should appear in both TypeA and TypeB rows
      expect(matrix.rows.sort()).toEqual(["TypeA", "TypeB"]);
      expect(matrix.cols).toEqual(["最有利標"]);

      const typeACell = matrix.cells.find(
        (c) => c.rowKey === "TypeA" && c.colKey === "最有利標"
      );
      expect(typeACell!.total).toBe(1);
      expect(typeACell!.won).toBe(1);

      const typeBCell = matrix.cells.find(
        (c) => c.rowKey === "TypeB" && c.colKey === "最有利標"
      );
      expect(typeBCell!.total).toBe(1);
      expect(typeBCell!.won).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // budgetRange dimension
  // ---------------------------------------------------------------------------

  describe("budgetRange dimension", () => {
    it("uses budget range labels from getBudgetRange", () => {
      const pages = [
        mockPage({
          [F.預算]: 500_000,
          [F.招標機關]: "Agency A",
          [F.進程]: "得標",
        }),
        mockPage({
          [F.預算]: 15_000_000,
          [F.招標機關]: "Agency A",
          [F.進程]: "未獲青睞",
        }),
      ];
      const matrix = computeCrossMatrix(pages, "budgetRange", "agency");
      expect(matrix.rows).toContain("100萬以下");
      expect(matrix.rows).toContain("1000萬~3000萬");
    });
  });

  // ---------------------------------------------------------------------------
  // Rows/cols are sorted alphabetically
  // ---------------------------------------------------------------------------

  describe("sorting", () => {
    it("sorts rows and columns alphabetically", () => {
      const pages = [
        mockPage({ [F.招標機關]: "C Agency", [F.評審方式]: "Z Method" }),
        mockPage({ [F.招標機關]: "A Agency", [F.評審方式]: "A Method" }),
        mockPage({ [F.招標機關]: "B Agency", [F.評審方式]: "M Method" }),
      ];
      const matrix = computeCrossMatrix(pages, "agency", "method");
      expect(matrix.rows).toEqual(["A Agency", "B Agency", "C Agency"]);
      expect(matrix.cols).toEqual(["A Method", "M Method", "Z Method"]);
    });
  });
});
