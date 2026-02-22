import { describe, it, expect } from "vitest";
import { DEFAULT_KEYWORD_RULES, DEFAULT_SEARCH_KEYWORDS } from "../constants";
import type { KeywordCategory } from "../types";

describe("DEFAULT_KEYWORD_RULES", () => {
  it("涵蓋三種分類", () => {
    const categories = new Set(DEFAULT_KEYWORD_RULES.map((r) => r.category));
    expect(categories).toContain("must");
    expect(categories).toContain("review");
    expect(categories).toContain("exclude");
  });

  it("不包含 other 分類（other 由引擎自動產生）", () => {
    const categories = DEFAULT_KEYWORD_RULES.map((r) => r.category);
    expect(categories).not.toContain("other" as KeywordCategory);
  });

  it("每條規則都有 label", () => {
    for (const rule of DEFAULT_KEYWORD_RULES) {
      expect(rule.label).toBeTruthy();
    }
  });

  it("每條規則有 keywords 或 budgetMax（至少一個篩選條件）", () => {
    for (const rule of DEFAULT_KEYWORD_RULES) {
      const hasKeywords = rule.keywords.length > 0;
      const hasBudget = rule.budgetMax !== undefined;
      expect(hasKeywords || hasBudget).toBe(true);
    }
  });

  it("label 不重複", () => {
    const labels = DEFAULT_KEYWORD_RULES.map((r) => r.label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("must 規則至少 5 條", () => {
    const must = DEFAULT_KEYWORD_RULES.filter((r) => r.category === "must");
    expect(must.length).toBeGreaterThanOrEqual(5);
  });

  it("review 規則至少 3 條", () => {
    const review = DEFAULT_KEYWORD_RULES.filter((r) => r.category === "review");
    expect(review.length).toBeGreaterThanOrEqual(3);
  });

  it("exclude 規則至少 1 條", () => {
    const exclude = DEFAULT_KEYWORD_RULES.filter((r) => r.category === "exclude");
    expect(exclude.length).toBeGreaterThanOrEqual(1);
  });

  it("budgetMax 規則的值為正數", () => {
    const budgetRules = DEFAULT_KEYWORD_RULES.filter((r) => r.budgetMax !== undefined);
    for (const rule of budgetRules) {
      expect(rule.budgetMax).toBeGreaterThan(0);
    }
  });

  it("所有關鍵字不為空字串", () => {
    for (const rule of DEFAULT_KEYWORD_RULES) {
      for (const kw of rule.keywords) {
        expect(kw.trim()).not.toBe("");
      }
    }
  });
});

describe("DEFAULT_SEARCH_KEYWORDS", () => {
  it("至少 10 個搜尋關鍵字", () => {
    expect(DEFAULT_SEARCH_KEYWORDS.length).toBeGreaterThanOrEqual(10);
  });

  it("搜尋關鍵字不重複", () => {
    expect(new Set(DEFAULT_SEARCH_KEYWORDS).size).toBe(DEFAULT_SEARCH_KEYWORDS.length);
  });

  it("搜尋關鍵字不為空字串", () => {
    for (const kw of DEFAULT_SEARCH_KEYWORDS) {
      expect(kw.trim()).not.toBe("");
    }
  });

  it("must 規則的主要關鍵字都包含在搜尋清單中", () => {
    const mustRules = DEFAULT_KEYWORD_RULES.filter(
      (r) => r.category === "must" && r.keywords.length > 0,
    );
    for (const rule of mustRules) {
      const mainKw = rule.keywords[0];
      const found = DEFAULT_SEARCH_KEYWORDS.some(
        (sk) => sk.includes(mainKw) || mainKw.includes(sk),
      );
      expect(found).toBe(true);
    }
  });
});
