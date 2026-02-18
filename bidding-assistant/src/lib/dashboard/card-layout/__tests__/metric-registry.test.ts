import { describe, it, expect } from "vitest";
import {
  METRIC_REGISTRY,
  getCompatibleVisualizations,
} from "../metric-registry";
import type { MetricKey, VisualizationType } from "../types";

/**
 * All MetricKey values defined in types.ts.
 * Keeping this list explicit ensures the registry stays in sync with the type.
 */
const ALL_METRIC_KEYS: MetricKey[] = [
  "activeProjects",
  "totalBudget",
  "wonBudget",
  "winRate",
  "biddingBudget",
  "yearSubmitted",
  "yearWon",
  "monthSubmitted",
  "weekSubmitted",
  "yearlyGoal",
  "goalAttainment",
  "monthlyTarget",
  "weeklyTarget",
  "totalCost",
  "teamWorkload",
  "monthlyTrend",
  "typeAnalysis",
  "statusDistribution",
  "costBreakdown",
];

const VALID_VISUALIZATIONS: VisualizationType[] = [
  "number",
  "ring",
  "bar",
  "line",
  "gauge",
  "mini-table",
  "stacked-bar",
  "heatmap",
];

describe("METRIC_REGISTRY", () => {
  it("covers all MetricKey values", () => {
    const registeredKeys = new Set(METRIC_REGISTRY.map((m) => m.key));
    for (const key of ALL_METRIC_KEYS) {
      expect(registeredKeys.has(key)).toBe(true);
    }
  });

  it("has exactly 19 entries (one per MetricKey)", () => {
    expect(METRIC_REGISTRY).toHaveLength(19);
  });

  it("each key is unique", () => {
    const keys = METRIC_REGISTRY.map((m) => m.key);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(keys.length);
  });

  it("each metric has valid compatibleVisualizations", () => {
    for (const metric of METRIC_REGISTRY) {
      expect(metric.compatibleVisualizations.length).toBeGreaterThan(0);
      for (const viz of metric.compatibleVisualizations) {
        expect(VALID_VISUALIZATIONS).toContain(viz);
      }
    }
  });

  it("defaultVisualization is included in compatibleVisualizations", () => {
    for (const metric of METRIC_REGISTRY) {
      expect(metric.compatibleVisualizations).toContain(
        metric.defaultVisualization,
      );
    }
  });
});

describe("getCompatibleVisualizations", () => {
  it("returns non-empty array for every registered metric", () => {
    for (const key of ALL_METRIC_KEYS) {
      const visualizations = getCompatibleVisualizations(key);
      expect(visualizations.length).toBeGreaterThan(0);
    }
  });

  it("returns correct visualizations for activeProjects", () => {
    const viz = getCompatibleVisualizations("activeProjects");
    expect(viz).toEqual(["number", "ring", "gauge"]);
  });

  it("returns correct visualizations for winRate (ratio)", () => {
    const viz = getCompatibleVisualizations("winRate");
    expect(viz).toEqual(["ring", "gauge", "number"]);
  });

  it("returns correct visualizations for monthlyTrend (array)", () => {
    const viz = getCompatibleVisualizations("monthlyTrend");
    expect(viz).toEqual(["bar", "line", "stacked-bar", "mini-table"]);
  });

  it("returns correct visualizations for costBreakdown (matrix)", () => {
    const viz = getCompatibleVisualizations("costBreakdown");
    expect(viz).toEqual(["heatmap"]);
  });

  it("returns empty array for unknown metric key", () => {
    const viz = getCompatibleVisualizations("nonExistent" as MetricKey);
    expect(viz).toEqual([]);
  });
});
