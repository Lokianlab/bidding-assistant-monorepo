import { describe, it, expect } from "vitest";
import { computeYoY } from "../useAnalyticsMetrics";
import type { NotionPage } from "../types";
import { F } from "../types";

// ====== Helper ======

function makePage(props: Record<string, unknown>): NotionPage {
  return { id: "test-id", url: "https://notion.so/test", properties: props };
}

// ====== computeYoY ======

describe("computeYoY", () => {
  describe("monthly granularity", () => {
    it("returns empty data when no pages match either year", () => {
      const pages = [
        makePage({ [F.截標]: "2022-06-15", [F.進程]: "已投標" }),
      ];
      const result = computeYoY(pages, 2024, 2025, "month");
      expect(result.baseYear).toBe(2024);
      expect(result.compareYear).toBe(2025);
      expect(result.data).toHaveLength(0);
      expect(result.baseTotals.submitted).toBe(0);
      expect(result.compareTotals.submitted).toBe(0);
    });

    it("correctly buckets pages into base and compare years", () => {
      const pages = [
        makePage({ [F.截標]: "2024-03-15", [F.進程]: "已投標", [F.預算]: 100 }),
        makePage({ [F.截標]: "2024-03-20", [F.進程]: "得標", [F.預算]: 200 }),
        makePage({ [F.截標]: "2025-03-10", [F.進程]: "得標", [F.預算]: 300 }),
        makePage({ [F.截標]: "2025-06-01", [F.進程]: "已投標", [F.預算]: 400 }),
      ];
      const result = computeYoY(pages, 2024, 2025, "month");

      expect(result.baseYear).toBe(2024);
      expect(result.compareYear).toBe(2025);

      // March should have data from both years
      const march = result.data.find((d) => d.periodNum === 3);
      expect(march).toBeDefined();
      expect(march!.period).toBe("3月");
      expect(march!.baseSubmitted).toBe(2);
      expect(march!.baseWon).toBe(1);
      expect(march!.baseWonBudget).toBe(200);
      expect(march!.compareSubmitted).toBe(1);
      expect(march!.compareWon).toBe(1);
      expect(march!.compareWonBudget).toBe(300);

      // June should only have compare year data
      const june = result.data.find((d) => d.periodNum === 6);
      expect(june).toBeDefined();
      expect(june!.baseSubmitted).toBe(0);
      expect(june!.compareSubmitted).toBe(1);

      // Totals
      expect(result.baseTotals.submitted).toBe(2);
      expect(result.baseTotals.won).toBe(1);
      expect(result.baseTotals.wonBudget).toBe(200);
      expect(result.compareTotals.submitted).toBe(2);
      expect(result.compareTotals.won).toBe(1);
      expect(result.compareTotals.wonBudget).toBe(300);
    });

    it("skips periods where both years have zero submissions", () => {
      const pages = [
        makePage({ [F.截標]: "2024-01-15", [F.進程]: "已投標", [F.預算]: 100 }),
        makePage({ [F.截標]: "2025-06-01", [F.進程]: "已投標", [F.預算]: 200 }),
      ];
      const result = computeYoY(pages, 2024, 2025, "month");

      // Only months 1 and 6 should appear (months 2-5, 7-12 have zero in both years)
      expect(result.data.length).toBe(2);
      expect(result.data[0].periodNum).toBe(1);
      expect(result.data[1].periodNum).toBe(6);
    });

    it("maxPeriod is 12 for monthly granularity", () => {
      const pages = [
        makePage({ [F.截標]: "2024-12-31", [F.進程]: "已投標", [F.預算]: 100 }),
      ];
      const result = computeYoY(pages, 2024, 2025, "month");
      // December is period 12
      const dec = result.data.find((d) => d.periodNum === 12);
      expect(dec).toBeDefined();
      // No period > 12
      expect(result.data.every((d) => d.periodNum <= 12)).toBe(true);
    });

    it("ignores pages from years other than base or compare", () => {
      const pages = [
        makePage({ [F.截標]: "2020-03-15", [F.進程]: "已投標", [F.預算]: 100 }),
        makePage({ [F.截標]: "2024-03-15", [F.進程]: "已投標", [F.預算]: 200 }),
      ];
      const result = computeYoY(pages, 2024, 2025, "month");
      expect(result.baseTotals.submitted).toBe(1);
      expect(result.compareTotals.submitted).toBe(0);
    });
  });

  describe("weekly granularity", () => {
    it("buckets pages by ISO week", () => {
      // 2024-01-01 is ISO week 1 of 2024
      const pages = [
        makePage({ [F.截標]: "2024-01-03", [F.進程]: "已投標", [F.預算]: 100 }),
        makePage({ [F.截標]: "2025-01-06", [F.進程]: "得標", [F.預算]: 500 }),
      ];
      const result = computeYoY(pages, 2024, 2025, "week");
      expect(result.data.length).toBeGreaterThan(0);

      // Check first data point has correct structure
      const first = result.data[0];
      expect(first.period).toMatch(/^第\d+週$/);
      expect(first.periodNum).toBeGreaterThanOrEqual(1);
    });

    it("returns empty data for no matching pages", () => {
      const result = computeYoY([], 2024, 2025, "week");
      expect(result.data).toHaveLength(0);
      expect(result.baseTotals.submitted).toBe(0);
      expect(result.compareTotals.submitted).toBe(0);
    });

    it("handles pages with no valid deadline", () => {
      const pages = [
        makePage({ [F.截標]: null, [F.進程]: "已投標" }),
        makePage({ [F.截標]: "", [F.進程]: "得標" }),
      ];
      const result = computeYoY(pages, 2024, 2025, "week");
      expect(result.data).toHaveLength(0);
    });

    it("correctly counts won status and budget", () => {
      const pages = [
        makePage({ [F.截標]: "2024-06-10", [F.進程]: "得標", [F.預算]: 1000 }),
        makePage({ [F.截標]: "2024-06-11", [F.進程]: "已投標", [F.預算]: 2000 }),
        makePage({ [F.截標]: "2024-06-12", [F.進程]: "得標", [F.預算]: 3000 }),
      ];
      const result = computeYoY(pages, 2024, 2025, "week");
      expect(result.baseTotals.submitted).toBe(3);
      expect(result.baseTotals.won).toBe(2);
      expect(result.baseTotals.wonBudget).toBe(4000);
    });

    it("handles missing budget gracefully (defaults to 0)", () => {
      const pages = [
        makePage({ [F.截標]: "2024-06-10", [F.進程]: "得標" }),
      ];
      const result = computeYoY(pages, 2024, 2025, "week");
      expect(result.baseTotals.won).toBe(1);
      expect(result.baseTotals.wonBudget).toBe(0);
    });
  });

  describe("edge cases", () => {
    it("handles same year for base and compare", () => {
      const pages = [
        makePage({ [F.截標]: "2024-03-15", [F.進程]: "已投標", [F.預算]: 100 }),
      ];
      // Both base and compare are 2024 - the page will go to baseMap (checked first)
      const result = computeYoY(pages, 2024, 2024, "month");
      // The page matches baseYear === 2024, so it goes to baseMap
      // It also matches compareYear === 2024, but the code checks baseYear first
      // Actually: year === baseYear ? baseMap : year === compareYear ? compMap : null
      // Since baseYear === compareYear, it always goes to baseMap
      expect(result.baseTotals.submitted).toBe(1);
      expect(result.compareTotals.submitted).toBe(0);
    });

    it("returns correct structure with no pages", () => {
      const result = computeYoY([], 2024, 2025, "month");
      expect(result).toEqual({
        baseYear: 2024,
        compareYear: 2025,
        data: [],
        baseTotals: { submitted: 0, won: 0, wonBudget: 0 },
        compareTotals: { submitted: 0, won: 0, wonBudget: 0 },
      });
    });
  });
});
