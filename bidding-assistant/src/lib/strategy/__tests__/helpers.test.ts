import { describe, it, expect } from "vitest";
import {
  extractKeywords,
  textMatch,
  normalizeWeights,
  computeVerdict,
  median,
  iqr,
  clampScore,
  parseAmount,
} from "../helpers";
import type { FitScore, FitWeights } from "../types";
import { DEFAULT_FIT_WEIGHTS, DEFAULT_VERDICT_THRESHOLDS } from "../constants";

// ====== extractKeywords ======

describe("extractKeywords", () => {
  it("空字串回傳空陣列", () => {
    expect(extractKeywords("")).toEqual([]);
    expect(extractKeywords("  ")).toEqual([]);
  });

  it("提取業務類型詞彙", () => {
    const result = extractKeywords("113年度展覽策展委託案");
    expect(result).toContain("展覽策展");
  });

  it("按分隔符拆分", () => {
    // 用明確無歧義的輸入：「環境教育」和「教育推廣」不重疊
    const result = extractKeywords("文化局、環境教育委託案");
    expect(result).toContain("文化局");
    expect(result).toContain("環境教育");
  });

  it("去重", () => {
    const result = extractKeywords("展覽策展及展覽策展服務");
    const count = result.filter((k) => k === "展覽策展").length;
    expect(count).toBe(1);
  });

  it("過濾太短的片段", () => {
    const result = extractKeywords("A 計畫管理案");
    expect(result).not.toContain("A");
    expect(result).toContain("計畫管理");
  });

  it("長詞優先匹配", () => {
    // "展覽策展" 應該被完整匹配，而不是拆成 "展覽" 和 "策展"
    const result = extractKeywords("展覽策展");
    expect(result).toContain("展覽策展");
  });

  it("混合中英文案名", () => {
    const result = extractKeywords("APP開發暨資訊系統建置案");
    expect(result).toContain("APP開發");
    expect(result).toContain("資訊系統");
  });
});

// ====== textMatch ======

describe("textMatch", () => {
  it("空字串回傳 0", () => {
    expect(textMatch("", "test")).toBe(0);
    expect(textMatch("test", "")).toBe(0);
  });

  it("完全相同回傳 1", () => {
    expect(textMatch("展覽", "展覽")).toBe(1);
  });

  it("包含關係回傳 1", () => {
    expect(textMatch("展覽策展計畫", "展覽")).toBe(1);
    expect(textMatch("展覽", "展覽策展計畫")).toBe(1);
  });

  it("不區分大小寫", () => {
    expect(textMatch("APP", "app")).toBe(1);
  });

  it("無關文字回傳低分", () => {
    expect(textMatch("展覽", "資訊系統")).toBeLessThan(0.5);
  });
});

// ====== normalizeWeights ======

describe("normalizeWeights", () => {
  it("預設權重不變（已是 100）", () => {
    const result = normalizeWeights(DEFAULT_FIT_WEIGHTS);
    const sum = Object.values(result).reduce((s, v) => s + v, 0);
    expect(sum).toBeCloseTo(100);
  });

  it("不等權重正確歸一化", () => {
    const custom: FitWeights = { domain: 40, agency: 20, competition: 20, scale: 10, team: 10 };
    const result = normalizeWeights(custom);
    expect(result.domain).toBe(40);
    expect(result.agency).toBe(20);
  });

  it("全零回傳均等權重", () => {
    const zeros: FitWeights = { domain: 0, agency: 0, competition: 0, scale: 0, team: 0 };
    const result = normalizeWeights(zeros);
    expect(result.domain).toBe(20);
    expect(result.agency).toBe(20);
  });

  it("負數視為 0", () => {
    const neg: FitWeights = { domain: -10, agency: 50, competition: 50, scale: 0, team: 0 };
    const result = normalizeWeights(neg);
    expect(result.domain).toBe(0);
    expect(result.agency).toBe(50);
  });
});

// ====== computeVerdict ======

describe("computeVerdict", () => {
  const makeDimensions = (conf: "高" | "中" | "低" = "高"): FitScore["dimensions"] => ({
    domain: { score: 15, confidence: conf, evidence: "" },
    agency: { score: 15, confidence: conf, evidence: "" },
    competition: { score: 15, confidence: conf, evidence: "" },
    scale: { score: 15, confidence: conf, evidence: "" },
    team: { score: 15, confidence: conf, evidence: "" },
  });

  it("高分 → 建議投標", () => {
    expect(computeVerdict(75, makeDimensions(), DEFAULT_VERDICT_THRESHOLDS, DEFAULT_FIT_WEIGHTS)).toBe("建議投標");
  });

  it("中分 → 值得評估", () => {
    expect(computeVerdict(55, makeDimensions(), DEFAULT_VERDICT_THRESHOLDS, DEFAULT_FIT_WEIGHTS)).toBe("值得評估");
  });

  it("低分 → 不建議", () => {
    expect(computeVerdict(40, makeDimensions(), DEFAULT_VERDICT_THRESHOLDS, DEFAULT_FIT_WEIGHTS)).toBe("不建議");
  });

  it("低信心佔比過高 → 資料不足", () => {
    const dims = makeDimensions("低");
    // 全部低信心 = 100% > 40%
    expect(computeVerdict(75, dims, DEFAULT_VERDICT_THRESHOLDS, DEFAULT_FIT_WEIGHTS)).toBe("資料不足");
  });

  it("邊界值：剛好等於門檻", () => {
    expect(computeVerdict(70, makeDimensions(), DEFAULT_VERDICT_THRESHOLDS, DEFAULT_FIT_WEIGHTS)).toBe("建議投標");
    expect(computeVerdict(50, makeDimensions(), DEFAULT_VERDICT_THRESHOLDS, DEFAULT_FIT_WEIGHTS)).toBe("值得評估");
  });
});

// ====== median ======

describe("median", () => {
  it("空陣列回傳 0", () => {
    expect(median([])).toBe(0);
  });

  it("奇數長度", () => {
    expect(median([1, 3, 5])).toBe(3);
  });

  it("偶數長度", () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });

  it("不改變原陣列", () => {
    const arr = [5, 1, 3];
    median(arr);
    expect(arr).toEqual([5, 1, 3]);
  });

  it("單一元素", () => {
    expect(median([42])).toBe(42);
  });
});

// ====== iqr ======

describe("iqr", () => {
  it("正常資料", () => {
    const result = iqr([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(result.q1).toBe(2.5);
    expect(result.q3).toBe(6.5);
    expect(result.iqr).toBe(4);
  });

  it("資料太少時用 min/max", () => {
    const result = iqr([10, 20]);
    expect(result.q1).toBe(10);
    expect(result.q3).toBe(20);
    expect(result.iqr).toBe(10);
  });

  it("空陣列", () => {
    const result = iqr([]);
    expect(result.q1).toBe(0);
    expect(result.q3).toBe(0);
    expect(result.iqr).toBe(0);
  });
});

// ====== clampScore ======

describe("clampScore", () => {
  it("正常範圍不變", () => {
    expect(clampScore(10)).toBe(10);
  });

  it("超過上限限制", () => {
    expect(clampScore(25)).toBe(20);
  });

  it("低於 0 限制", () => {
    expect(clampScore(-5)).toBe(0);
  });

  it("四捨五入到一位小數", () => {
    expect(clampScore(10.567)).toBe(10.6);
  });

  it("自訂上限", () => {
    expect(clampScore(150, 100)).toBe(100);
  });
});

// ====== parseAmount ======

describe("parseAmount", () => {
  it("null/undefined 回傳 null", () => {
    expect(parseAmount(null)).toBeNull();
    expect(parseAmount(undefined)).toBeNull();
  });

  it("空字串回傳 null", () => {
    expect(parseAmount("")).toBeNull();
  });

  it("純數字", () => {
    expect(parseAmount("1234567")).toBe(1234567);
  });

  it("含逗號", () => {
    expect(parseAmount("1,234,567")).toBe(1234567);
  });

  it("含中文", () => {
    expect(parseAmount("新台幣 1,234,567 元")).toBe(1234567);
  });

  it("非數字回傳 null", () => {
    expect(parseAmount("無資料")).toBeNull();
  });
});
