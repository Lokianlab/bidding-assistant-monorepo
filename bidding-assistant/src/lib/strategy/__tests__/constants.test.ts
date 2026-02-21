import { describe, it, expect } from "vitest";
import {
  DEFAULT_FIT_WEIGHTS,
  FIT_THRESHOLDS,
  BUSINESS_KEYWORDS,
  COMPETITION_THRESHOLDS,
} from "../constants";

describe("DEFAULT_FIT_WEIGHTS", () => {
  it("五維權重各為 20，總和 100", () => {
    const dims = ["domain", "agency", "competition", "scale", "team"] as const;
    dims.forEach((d) => expect(DEFAULT_FIT_WEIGHTS[d]).toBe(20));
    const total = Object.values(DEFAULT_FIT_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(total).toBe(100);
  });
});

describe("FIT_THRESHOLDS", () => {
  it("recommend 高於 evaluate", () => {
    expect(FIT_THRESHOLDS.recommend).toBeGreaterThan(FIT_THRESHOLDS.evaluate);
  });

  it("門檻值合理（0-100 範圍）", () => {
    expect(FIT_THRESHOLDS.recommend).toBeGreaterThan(0);
    expect(FIT_THRESHOLDS.recommend).toBeLessThanOrEqual(100);
    expect(FIT_THRESHOLDS.evaluate).toBeGreaterThan(0);
  });
});

describe("BUSINESS_KEYWORDS", () => {
  it("包含業務分類（非空）", () => {
    expect(Object.keys(BUSINESS_KEYWORDS).length).toBeGreaterThan(0);
  });

  it("每個分類都包含非空詞彙陣列", () => {
    for (const [category, keywords] of Object.entries(BUSINESS_KEYWORDS)) {
      expect(Array.isArray(keywords)).toBe(true);
      expect(keywords.length).toBeGreaterThan(0);
      keywords.forEach((kw) => {
        expect(typeof kw).toBe("string");
        expect(kw.length).toBeGreaterThan(0);
      });
      expect(typeof category).toBe("string");
    }
  });
});

describe("COMPETITION_THRESHOLDS", () => {
  it("藍海門檻低於紅海門檻", () => {
    expect(COMPETITION_THRESHOLDS.blueOcean).toBeLessThan(
      COMPETITION_THRESHOLDS.redSea,
    );
  });

  it("門檻為正整數", () => {
    expect(COMPETITION_THRESHOLDS.blueOcean).toBeGreaterThan(0);
    expect(COMPETITION_THRESHOLDS.redSea).toBeGreaterThan(0);
  });
});
