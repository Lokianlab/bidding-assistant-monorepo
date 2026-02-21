import { describe, it, expect } from "vitest";
import {
  DEFAULT_FIT_WEIGHTS,
  DEFAULT_VERDICT_THRESHOLDS,
  BUSINESS_TYPE_VOCABULARY,
  COMPETITION_BLUE_OCEAN,
  COMPETITION_RED_OCEAN,
  DIMENSION_MAX_SCORE,
  LOW_CONFIDENCE_RATIO_THRESHOLD,
} from "../constants";

describe("DEFAULT_FIT_WEIGHTS", () => {
  it("五維權重各為 20，總和 100", () => {
    const dims = ["domain", "agency", "competition", "scale", "team"] as const;
    dims.forEach((d) => expect(DEFAULT_FIT_WEIGHTS[d]).toBe(20));
    const total = Object.values(DEFAULT_FIT_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(total).toBe(100);
  });
});

describe("DEFAULT_VERDICT_THRESHOLDS", () => {
  it("recommend 高於 evaluate", () => {
    expect(DEFAULT_VERDICT_THRESHOLDS.recommend).toBeGreaterThan(
      DEFAULT_VERDICT_THRESHOLDS.evaluate,
    );
  });

  it("門檻值合理（0-100 範圍）", () => {
    expect(DEFAULT_VERDICT_THRESHOLDS.recommend).toBeGreaterThan(0);
    expect(DEFAULT_VERDICT_THRESHOLDS.recommend).toBeLessThanOrEqual(100);
    expect(DEFAULT_VERDICT_THRESHOLDS.evaluate).toBeGreaterThan(0);
  });
});

describe("BUSINESS_TYPE_VOCABULARY", () => {
  it("包含詞彙（非空）", () => {
    expect(BUSINESS_TYPE_VOCABULARY.length).toBeGreaterThan(0);
  });

  it("所有詞彙都是非空字串", () => {
    BUSINESS_TYPE_VOCABULARY.forEach((word) => {
      expect(typeof word).toBe("string");
      expect(word.length).toBeGreaterThan(0);
    });
  });
});

describe("COMPETITION_THRESHOLDS", () => {
  it("藍海門檻低於紅海門檻", () => {
    expect(COMPETITION_BLUE_OCEAN).toBeLessThan(COMPETITION_RED_OCEAN);
  });

  it("門檻為正整數", () => {
    expect(COMPETITION_BLUE_OCEAN).toBeGreaterThan(0);
    expect(COMPETITION_RED_OCEAN).toBeGreaterThan(0);
  });
});

describe("DIMENSION_MAX_SCORE", () => {
  it("各維度上限為 20", () => {
    expect(DIMENSION_MAX_SCORE).toBe(20);
  });
});

describe("LOW_CONFIDENCE_RATIO_THRESHOLD", () => {
  it("在 0 到 1 之間", () => {
    expect(LOW_CONFIDENCE_RATIO_THRESHOLD).toBeGreaterThan(0);
    expect(LOW_CONFIDENCE_RATIO_THRESHOLD).toBeLessThan(1);
  });
});
