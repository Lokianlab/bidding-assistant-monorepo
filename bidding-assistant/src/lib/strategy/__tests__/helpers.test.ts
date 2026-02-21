import { describe, it, expect } from "vitest";
import {
  extractKeywords,
  keywordOverlap,
  parseContractAmount,
  calculateIQR,
  clampScore,
  formatBudget,
} from "../helpers";

describe("extractKeywords", () => {
  it("辨識活動相關關鍵字", () => {
    const result = extractKeywords("113 年文化節活動策展計畫");
    expect(result.categories).toContain("活動");
    expect(result.categories).toContain("展覽");
    expect(result.terms).toContain("活動");
    expect(result.terms).toContain("策展");
  });

  it("辨識多領域案名", () => {
    const result = extractKeywords("博物館展覽設計暨行銷推廣");
    expect(result.categories).toContain("展覽");
    expect(result.categories).toContain("設計");
    expect(result.categories).toContain("行銷");
  });

  it("無法辨識的案名 → 空結果", () => {
    const result = extractKeywords("XYZ-2025-001");
    expect(result.categories).toHaveLength(0);
    expect(result.terms).toHaveLength(0);
  });

  it("不重複類別", () => {
    const result = extractKeywords("策展展覽展示展場");
    // 全部屬於「展覽」類，只出現一次
    expect(result.categories.filter((c) => c === "展覽")).toHaveLength(1);
  });
});

describe("keywordOverlap", () => {
  it("完全相同 → 1", () => {
    expect(keywordOverlap("文化活動", "文化活動")).toBe(1);
  });

  it("部分重疊 → 0-1 之間", () => {
    const score = keywordOverlap("文化活動策展", "活動行銷推廣");
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(1);
  });

  it("完全無關 → 0", () => {
    expect(keywordOverlap("工程施工", "行銷推廣")).toBe(0);
  });

  it("兩邊都無關鍵字 → 0", () => {
    expect(keywordOverlap("ABC", "XYZ")).toBe(0);
  });
});

describe("parseContractAmount", () => {
  it("標準格式", () => {
    expect(parseContractAmount("3,000,000")).toBe(3000000);
  });

  it("含中文", () => {
    expect(parseContractAmount("新臺幣3,000,000元")).toBe(3000000);
  });

  it("含 $ 符號", () => {
    expect(parseContractAmount("$5,000,000")).toBe(5000000);
  });

  it("空字串 → null", () => {
    expect(parseContractAmount("")).toBeNull();
  });

  it("純文字 → null", () => {
    expect(parseContractAmount("面議")).toBeNull();
  });
});

describe("calculateIQR", () => {
  it("正常計算", () => {
    const result = calculateIQR([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(result).not.toBeNull();
    // sorted: [1,2,3,4,5,6,7,8], n=8
    // q1 = sorted[floor(8*0.25)] = sorted[2] = 3
    // median = sorted[floor(8*0.5)] = sorted[4] = 5
    // q3 = sorted[floor(8*0.75)] = sorted[6] = 7
    expect(result!.q1).toBe(3);
    expect(result!.median).toBe(5);
    expect(result!.q3).toBe(7);
    expect(result!.iqr).toBe(4);
  });

  it("不足 4 筆 → null", () => {
    expect(calculateIQR([1, 2, 3])).toBeNull();
  });

  it("不修改原陣列", () => {
    const original = [5, 3, 1, 4, 2];
    calculateIQR(original);
    expect(original).toEqual([5, 3, 1, 4, 2]);
  });
});

describe("clampScore", () => {
  it("正常範圍", () => {
    expect(clampScore(10)).toBe(10);
  });

  it("超過 20 → 20", () => {
    expect(clampScore(25)).toBe(20);
  });

  it("低於 0 → 0", () => {
    expect(clampScore(-5)).toBe(0);
  });

  it("四捨五入", () => {
    expect(clampScore(10.6)).toBe(11);
    expect(clampScore(10.4)).toBe(10);
  });
});

describe("formatBudget", () => {
  it("億級", () => {
    expect(formatBudget(150_000_000)).toBe("1.5 億");
  });

  it("萬級", () => {
    expect(formatBudget(3_000_000)).toBe("300 萬");
  });

  it("小額", () => {
    expect(formatBudget(5000)).toContain("5,000");
  });
});
