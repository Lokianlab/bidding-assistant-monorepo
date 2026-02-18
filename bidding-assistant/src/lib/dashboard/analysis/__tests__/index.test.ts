import { describe, it, expect } from "vitest";
import * as analysisModule from "../index";

// ---------------------------------------------------------------------------
// Barrel export verification
// ---------------------------------------------------------------------------

describe("analysis/index barrel exports", () => {
  // ====== breakdown ======
  describe("breakdown re-exports", () => {
    it("exports buildBreakdown", () => {
      expect(typeof analysisModule.buildBreakdown).toBe("function");
    });

    it("exports groupByField", () => {
      expect(typeof analysisModule.groupByField).toBe("function");
    });

    it("exports getBudgetRange", () => {
      expect(typeof analysisModule.getBudgetRange).toBe("function");
    });

    it("exports BUDGET_RANGES", () => {
      expect(Array.isArray(analysisModule.BUDGET_RANGES)).toBe(true);
      expect(analysisModule.BUDGET_RANGES.length).toBeGreaterThan(0);
    });

    it("exports analyzeByWriter", () => {
      expect(typeof analysisModule.analyzeByWriter).toBe("function");
    });

    it("exports analyzeByAgency", () => {
      expect(typeof analysisModule.analyzeByAgency).toBe("function");
    });

    it("exports analyzeByType", () => {
      expect(typeof analysisModule.analyzeByType).toBe("function");
    });

    it("exports analyzeByMethod", () => {
      expect(typeof analysisModule.analyzeByMethod).toBe("function");
    });

    it("exports analyzeByBudgetRange", () => {
      expect(typeof analysisModule.analyzeByBudgetRange).toBe("function");
    });

    it("exports analyzeByPriority", () => {
      expect(typeof analysisModule.analyzeByPriority).toBe("function");
    });

    it("exports analyzeByDecision", () => {
      expect(typeof analysisModule.analyzeByDecision).toBe("function");
    });
  });

  // ====== cross-matrix ======
  describe("cross-matrix re-exports", () => {
    it("exports computeCrossMatrix", () => {
      expect(typeof analysisModule.computeCrossMatrix).toBe("function");
    });

    it("exports DIMENSION_OPTIONS", () => {
      expect(Array.isArray(analysisModule.DIMENSION_OPTIONS)).toBe(true);
      expect(analysisModule.DIMENSION_OPTIONS.length).toBeGreaterThan(0);
    });
  });

  // ====== person-report ======
  describe("person-report re-exports", () => {
    it("exports buildPersonReport", () => {
      expect(typeof analysisModule.buildPersonReport).toBe("function");
    });
  });

  // ====== global-insights ======
  describe("global-insights re-exports", () => {
    it("exports generateGlobalInsights", () => {
      expect(typeof analysisModule.generateGlobalInsights).toBe("function");
    });
  });

  // ====== cost-analysis ======
  describe("cost-analysis re-exports", () => {
    it("exports computeCostAnalysis", () => {
      expect(typeof analysisModule.computeCostAnalysis).toBe("function");
    });
  });
});
