import { describe, it, expect } from "vitest";
import {
  TEMPLATE_IDS,
  CHAPTER_MIN_CHARS,
  CHAPTER_MAX_CHARS,
  MAX_RECENT_EXPORTS,
  DUPLICATE_CONTENT_THRESHOLD,
  MIN_PARAGRAPH_LENGTH_FOR_DEDUP,
} from "../constants";

// ── TEMPLATE_IDS ─────────────────────────────────────────────

describe("TEMPLATE_IDS", () => {
  it("包含四種範本 ID", () => {
    expect(Object.keys(TEMPLATE_IDS)).toHaveLength(4);
  });

  it("包含預期的範本", () => {
    expect(TEMPLATE_IDS.PROPOSAL_STANDARD).toBe("proposal-standard");
    expect(TEMPLATE_IDS.PROPOSAL_SIMPLIFIED).toBe("proposal-simplified");
    expect(TEMPLATE_IDS.PLAN_BRIEF).toBe("plan-brief");
    expect(TEMPLATE_IDS.CUSTOM).toBe("custom");
  });

  it("所有值都是非空字串", () => {
    for (const value of Object.values(TEMPLATE_IDS)) {
      expect(typeof value).toBe("string");
      expect(value.length).toBeGreaterThan(0);
    }
  });

  it("所有值不重複", () => {
    const values = Object.values(TEMPLATE_IDS);
    expect(new Set(values).size).toBe(values.length);
  });

  it("值為 kebab-case 格式", () => {
    for (const value of Object.values(TEMPLATE_IDS)) {
      expect(value).toMatch(/^[a-z]+(-[a-z]+)*$/);
    }
  });
});

// ── 字數門檻 ─────────────────────────────────────────────────

describe("字數門檻常數", () => {
  it("CHAPTER_MIN_CHARS 為正整數", () => {
    expect(Number.isInteger(CHAPTER_MIN_CHARS)).toBe(true);
    expect(CHAPTER_MIN_CHARS).toBeGreaterThan(0);
  });

  it("CHAPTER_MAX_CHARS 為正整數", () => {
    expect(Number.isInteger(CHAPTER_MAX_CHARS)).toBe(true);
    expect(CHAPTER_MAX_CHARS).toBeGreaterThan(0);
  });

  it("CHAPTER_MAX_CHARS > CHAPTER_MIN_CHARS（上限大於下限）", () => {
    expect(CHAPTER_MAX_CHARS).toBeGreaterThan(CHAPTER_MIN_CHARS);
  });

  it("CHAPTER_MIN_CHARS 在合理範圍（50-500）", () => {
    expect(CHAPTER_MIN_CHARS).toBeGreaterThanOrEqual(50);
    expect(CHAPTER_MIN_CHARS).toBeLessThanOrEqual(500);
  });

  it("CHAPTER_MAX_CHARS 在合理範圍（2000-20000）", () => {
    expect(CHAPTER_MAX_CHARS).toBeGreaterThanOrEqual(2000);
    expect(CHAPTER_MAX_CHARS).toBeLessThanOrEqual(20000);
  });
});

// ── MAX_RECENT_EXPORTS ───────────────────────────────────────

describe("MAX_RECENT_EXPORTS", () => {
  it("為正整數", () => {
    expect(Number.isInteger(MAX_RECENT_EXPORTS)).toBe(true);
    expect(MAX_RECENT_EXPORTS).toBeGreaterThan(0);
  });

  it("在合理範圍（5-50）", () => {
    expect(MAX_RECENT_EXPORTS).toBeGreaterThanOrEqual(5);
    expect(MAX_RECENT_EXPORTS).toBeLessThanOrEqual(50);
  });
});

// ── 重複內容偵測 ─────────────────────────────────────────────

describe("重複內容偵測常數", () => {
  it("DUPLICATE_CONTENT_THRESHOLD 是 0-1 之間的比例", () => {
    expect(typeof DUPLICATE_CONTENT_THRESHOLD).toBe("number");
    expect(DUPLICATE_CONTENT_THRESHOLD).toBeGreaterThan(0);
    expect(DUPLICATE_CONTENT_THRESHOLD).toBeLessThanOrEqual(1);
  });

  it("MIN_PARAGRAPH_LENGTH_FOR_DEDUP 為正整數", () => {
    expect(Number.isInteger(MIN_PARAGRAPH_LENGTH_FOR_DEDUP)).toBe(true);
    expect(MIN_PARAGRAPH_LENGTH_FOR_DEDUP).toBeGreaterThan(0);
  });

  it("MIN_PARAGRAPH_LENGTH_FOR_DEDUP 在合理範圍（10-200）", () => {
    expect(MIN_PARAGRAPH_LENGTH_FOR_DEDUP).toBeGreaterThanOrEqual(10);
    expect(MIN_PARAGRAPH_LENGTH_FOR_DEDUP).toBeLessThanOrEqual(200);
  });
});
