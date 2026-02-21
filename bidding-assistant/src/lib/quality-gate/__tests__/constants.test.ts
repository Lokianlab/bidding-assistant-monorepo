import { describe, it, expect } from "vitest";
import {
  HALLUCINATION_PATTERNS,
  SCORE_WEIGHTS,
  SOURCE_MATCH_MIN_LENGTH,
} from "../constants";

describe("HALLUCINATION_PATTERNS", () => {
  it("包含七個幻覺偵測規則", () => {
    expect(HALLUCINATION_PATTERNS).toHaveLength(7);
  });

  it("每個規則都有 name、pattern、message", () => {
    HALLUCINATION_PATTERNS.forEach((rule) => {
      expect(typeof rule.name).toBe("string");
      expect(rule.name.length).toBeGreaterThan(0);
      expect(rule.pattern).toBeInstanceOf(RegExp);
      expect(typeof rule.message).toBe("string");
      expect(rule.message.length).toBeGreaterThan(0);
    });
  });

  it("規則名稱不重複", () => {
    const names = HALLUCINATION_PATTERNS.map((r) => r.name);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });

  it("包含預期的規則名稱", () => {
    const names = new Set(HALLUCINATION_PATTERNS.map((r) => r.name));
    expect(names.has("ungrounded_percentage")).toBe(true);
    expect(names.has("fabricated_research")).toBe(true);
    expect(names.has("superlative_claim")).toBe(true);
    expect(names.has("fabricated_award")).toBe(true);
  });
});

describe("SCORE_WEIGHTS", () => {
  it("baseScore 在合理範圍（50-90）", () => {
    expect(SCORE_WEIGHTS.baseScore).toBeGreaterThanOrEqual(50);
    expect(SCORE_WEIGHTS.baseScore).toBeLessThanOrEqual(90);
  });

  it("懲罰值均為正數", () => {
    expect(SCORE_WEIGHTS.unverifiedPenalty).toBeGreaterThan(0);
    expect(SCORE_WEIGHTS.hallucinationPenalty).toBeGreaterThan(0);
  });

  it("幻覺懲罰高於未驗證懲罰", () => {
    expect(SCORE_WEIGHTS.hallucinationPenalty).toBeGreaterThan(
      SCORE_WEIGHTS.unverifiedPenalty,
    );
  });

  it("minScore = 0，maxScore = 100", () => {
    expect(SCORE_WEIGHTS.minScore).toBe(0);
    expect(SCORE_WEIGHTS.maxScore).toBe(100);
  });
});

describe("SOURCE_MATCH_MIN_LENGTH", () => {
  it("為正整數", () => {
    expect(Number.isInteger(SOURCE_MATCH_MIN_LENGTH)).toBe(true);
    expect(SOURCE_MATCH_MIN_LENGTH).toBeGreaterThan(0);
  });
});
