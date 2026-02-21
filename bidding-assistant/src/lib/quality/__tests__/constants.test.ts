import { describe, it, expect } from "vitest";
import { RULE_NAMES, IRON_LAW_LABELS } from "../constants";

describe("RULE_NAMES", () => {
  it("包含所有必要規則鍵", () => {
    const expected = [
      "BLACKLIST", "TERMINOLOGY", "CUSTOM",
      "CROSS_VALIDATE_NUMBERS", "DATE_CONSISTENCY",
      "BUDGET_CONSISTENCY", "TEAM_CONSISTENCY",
      "SCOPE_CONSISTENCY", "COMPANY_NAME",
      "PARAGRAPH_LENGTH", "SENTENCE_LENGTH",
      "DUPLICATE", "RISKY_PROMISE",
    ];
    expected.forEach((key) => {
      expect(RULE_NAMES).toHaveProperty(key);
    });
  });

  it("所有值都是非空字串", () => {
    Object.values(RULE_NAMES).forEach((v) => {
      expect(typeof v).toBe("string");
      expect(v.length).toBeGreaterThan(0);
    });
  });

  it("值沒有重複", () => {
    const values = Object.values(RULE_NAMES);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });
});

describe("IRON_LAW_LABELS", () => {
  it("包含五個鐵律 flag", () => {
    const expectedFlags = [
      "crossValidateNumbers",
      "budgetConsistency",
      "dateConsistency",
      "teamConsistency",
      "scopeConsistency",
    ];
    expectedFlags.forEach((flag) => {
      expect(IRON_LAW_LABELS).toHaveProperty(flag);
    });
    expect(Object.keys(IRON_LAW_LABELS)).toHaveLength(5);
  });

  it("每個鐵律 flag 對應到 RULE_NAMES 中的值", () => {
    const ruleValues = new Set<string>(Object.values(RULE_NAMES));
    Object.values(IRON_LAW_LABELS).forEach((label) => {
      expect(ruleValues.has(label)).toBe(true);
    });
  });
});
