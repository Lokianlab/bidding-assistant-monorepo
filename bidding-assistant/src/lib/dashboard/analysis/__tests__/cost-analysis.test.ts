import { describe, it, expect } from "vitest";
import { computeCostAnalysis } from "../cost-analysis";
import type { NotionPage } from "../../types";
import { F } from "../../types";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

let _pageId = 0;
function mockPage(overrides: Record<string, unknown> = {}): NotionPage {
  _pageId++;
  return {
    id: `cost-page-${_pageId}`,
    url: `https://notion.so/cost-page-${_pageId}`,
    properties: {
      [F.名稱]: `Cost Case ${_pageId}`,
      [F.進程]: "等標期間",
      [F.預算]: 1_000_000,
      [F.押標金]: 10_000,
      [F.領標費]: 2_000,
      [F.企劃主筆]: [],
      [F.招標機關]: "",
      [F.標案類型]: [],
      [F.評審方式]: "",
      ...overrides,
    },
  };
}

// ---------------------------------------------------------------------------
// computeCostAnalysis — empty input
// ---------------------------------------------------------------------------

describe("computeCostAnalysis()", () => {
  it("returns zeroed result for empty pages", () => {
    const result = computeCostAnalysis([]);
    expect(result.sunkCostPages).toEqual([]);
    expect(result.sunkCostTotal).toBe(0);
    expect(result.agencyROI).toEqual([]);
    expect(result.typeROI).toEqual([]);
    expect(result.totalInvested).toBe(0);
    expect(result.totalWonBudget).toBe(0);
    expect(result.overallROI).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // Sunk cost detection
  // ---------------------------------------------------------------------------

  describe("sunk cost pages", () => {
    it("identifies pages with SUNK_STATUSES", () => {
      const pages = [
        mockPage({
          [F.進程]: "領標後未參與",
          [F.名稱]: "Sunk A",
          [F.招標機關]: "Agency X",
          [F.押標金]: 30_000,
          [F.領標費]: 5_000,
          [F.預算]: 2_000_000,
        }),
        mockPage({
          [F.進程]: "逾期未參與",
          [F.名稱]: "Sunk B",
          [F.招標機關]: "Agency Y",
          [F.押標金]: 20_000,
          [F.領標費]: 3_000,
          [F.預算]: 1_000_000,
        }),
        mockPage({ [F.進程]: "得標" }),
      ];
      const result = computeCostAnalysis(pages);
      expect(result.sunkCostPages).toHaveLength(2);
      expect(result.sunkCostTotal).toBe(30_000 + 5_000 + 20_000 + 3_000);
    });

    it("sorts sunk cost pages by total cost descending", () => {
      const pages = [
        mockPage({
          [F.進程]: "領標後未參與",
          [F.押標金]: 10_000,
          [F.領標費]: 1_000,
        }),
        mockPage({
          [F.進程]: "逾期未參與",
          [F.押標金]: 50_000,
          [F.領標費]: 5_000,
        }),
      ];
      const result = computeCostAnalysis(pages);
      expect(result.sunkCostPages[0].costBid + result.sunkCostPages[0].costFee).toBe(55_000);
      expect(result.sunkCostPages[1].costBid + result.sunkCostPages[1].costFee).toBe(11_000);
    });
  });

  // ---------------------------------------------------------------------------
  // Agency ROI
  // ---------------------------------------------------------------------------

  describe("agency ROI", () => {
    it("computes ROI per agency for procured-status pages", () => {
      const pages = [
        mockPage({
          [F.招標機關]: "Agency X",
          [F.進程]: "得標",
          [F.預算]: 10_000_000,
          [F.押標金]: 50_000,
          [F.領標費]: 5_000,
        }),
        mockPage({
          [F.招標機關]: "Agency X",
          [F.進程]: "未獲青睞",
          [F.預算]: 5_000_000,
          [F.押標金]: 30_000,
          [F.領標費]: 3_000,
        }),
      ];
      const result = computeCostAnalysis(pages);
      const agX = result.agencyROI.find((a) => a.key === "Agency X");
      expect(agX).toBeDefined();
      expect(agX!.costTotal).toBe(50_000 + 5_000 + 30_000 + 3_000);
      expect(agX!.wonBudget).toBe(10_000_000);
      expect(agX!.won).toBe(1);
      expect(agX!.total).toBe(2);
      expect(agX!.roi).toBeGreaterThan(0);
    });

    it("filters out agencies with zero cost", () => {
      const pages = [
        mockPage({
          [F.招標機關]: "Agency Z",
          [F.進程]: "等標期間", // not in PROCURED_STATUSES
          [F.押標金]: 100_000,
          [F.領標費]: 10_000,
        }),
      ];
      const result = computeCostAnalysis(pages);
      expect(result.agencyROI).toHaveLength(0);
    });

    it("sorts agencies by ROI descending", () => {
      const pages = [
        mockPage({
          [F.招標機關]: "Low ROI",
          [F.進程]: "未獲青睞",
          [F.押標金]: 50_000,
          [F.領標費]: 5_000,
          [F.預算]: 0,
        }),
        mockPage({
          [F.招標機關]: "High ROI",
          [F.進程]: "得標",
          [F.押標金]: 10_000,
          [F.領標費]: 1_000,
          [F.預算]: 5_000_000,
        }),
      ];
      const result = computeCostAnalysis(pages);
      expect(result.agencyROI[0].key).toBe("High ROI");
    });
  });

  // ---------------------------------------------------------------------------
  // Type ROI
  // ---------------------------------------------------------------------------

  describe("type ROI", () => {
    it("computes ROI per bid type", () => {
      const pages = [
        mockPage({
          [F.標案類型]: ["TypeA"],
          [F.進程]: "得標",
          [F.預算]: 8_000_000,
          [F.押標金]: 40_000,
          [F.領標費]: 4_000,
        }),
        mockPage({
          [F.標案類型]: ["TypeA", "TypeB"],
          [F.進程]: "未獲青睞",
          [F.預算]: 3_000_000,
          [F.押標金]: 20_000,
          [F.領標費]: 2_000,
        }),
      ];
      const result = computeCostAnalysis(pages);
      const typeA = result.typeROI.find((t) => t.key === "TypeA");
      expect(typeA).toBeDefined();
      expect(typeA!.costTotal).toBe(40_000 + 4_000 + 20_000 + 2_000);
      expect(typeA!.wonBudget).toBe(8_000_000);
    });

    it("filters out types with zero cost", () => {
      const pages = [
        mockPage({
          [F.標案類型]: ["TypeC"],
          [F.進程]: "等標期間", // not procured
        }),
      ];
      const result = computeCostAnalysis(pages);
      expect(result.typeROI).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Overall totals
  // ---------------------------------------------------------------------------

  describe("overall totals", () => {
    it("computes totalInvested from PROCURED_STATUSES pages only", () => {
      const pages = [
        mockPage({ [F.進程]: "得標", [F.押標金]: 50_000, [F.領標費]: 5_000 }),
        mockPage({ [F.進程]: "等標期間", [F.押標金]: 30_000, [F.領標費]: 3_000 }),
      ];
      const result = computeCostAnalysis(pages);
      expect(result.totalInvested).toBe(55_000); // only 得標 page counted
    });

    it("computes totalWonBudget from won pages only", () => {
      const pages = [
        mockPage({ [F.進程]: "得標", [F.預算]: 10_000_000 }),
        mockPage({ [F.進程]: "未獲青睞", [F.預算]: 5_000_000 }),
      ];
      const result = computeCostAnalysis(pages);
      expect(result.totalWonBudget).toBe(10_000_000);
    });

    it("computes overallROI as wonBudget/invested rounded to 2 decimals", () => {
      const pages = [
        mockPage({
          [F.進程]: "得標",
          [F.預算]: 10_000_000,
          [F.押標金]: 100_000,
          [F.領標費]: 0,
        }),
      ];
      const result = computeCostAnalysis(pages);
      // 10_000_000 / 100_000 = 100
      expect(result.overallROI).toBe(100);
    });

    it("returns 0 overallROI when totalInvested is 0", () => {
      const pages = [
        mockPage({ [F.進程]: "等標期間" }),
      ];
      const result = computeCostAnalysis(pages);
      expect(result.overallROI).toBe(0);
    });
  });
});
