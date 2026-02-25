import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  analyzeTopWinners,
  calculateConsecutiveYears,
  overallAssessment,
  generateRecommendation,
  formatBudget,
  daysUntilDeadline,
} from "@/lib/intelligence/helpers";
import type { AgencyCase, WinCheck } from "@/lib/intelligence/types";

// ──────────────────────────────────────────────────────────────
// Fixtures
// ──────────────────────────────────────────────────────────────

function makeCase(overrides: Partial<AgencyCase> = {}): AgencyCase {
  return {
    job_number: "JOB-001",
    title: "測試標案",
    award_date: "2024/01/15",
    award_amount: 1_000_000,
    winner_name: "甲公司",
    winner_id: "A001",
    bidder_count: 3,
    category: "其他",
    all_bidder_names: [],
    ...overrides,
  };
}

function makeCheck(
  status: WinCheck["status"],
  label = "測試項目",
): WinCheck {
  return {
    id: "consecutive_winner",
    label,
    status,
    evidence: "",
    source: "",
    auto_filled: false,
  };
}

// ──────────────────────────────────────────────────────────────
// analyzeTopWinners
// ──────────────────────────────────────────────────────────────

describe("analyzeTopWinners", () => {
  it("returns empty array for empty input", () => {
    expect(analyzeTopWinners([])).toEqual([]);
  });

  it("returns a single winner with win_count 1", () => {
    const cases = [makeCase()];
    const result = analyzeTopWinners(cases);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("甲公司");
    expect(result[0].win_count).toBe(1);
    expect(result[0].total_amount).toBe(1_000_000);
  });

  it("skips cases with no winner_name", () => {
    const cases = [makeCase({ winner_name: "" })];
    expect(analyzeTopWinners(cases)).toHaveLength(0);
  });

  it("accumulates win_count and total_amount for the same winner (keyed by winner_id)", () => {
    const cases = [
      makeCase({ winner_id: "A001", winner_name: "甲公司", award_amount: 500_000 }),
      makeCase({ winner_id: "A001", winner_name: "甲公司", award_amount: 300_000 }),
    ];
    const result = analyzeTopWinners(cases);
    expect(result).toHaveLength(1);
    expect(result[0].win_count).toBe(2);
    expect(result[0].total_amount).toBe(800_000);
  });

  it("treats winners with the same name but different IDs as different winners", () => {
    const cases = [
      makeCase({ winner_id: "A001", winner_name: "甲公司" }),
      makeCase({ winner_id: "A002", winner_name: "甲公司" }),
    ];
    const result = analyzeTopWinners(cases);
    expect(result).toHaveLength(2);
  });

  it("falls back to winner_name as map key when winner_id is falsy", () => {
    const cases = [
      makeCase({ winner_id: "", winner_name: "乙公司", award_amount: 100_000 }),
      makeCase({ winner_id: "", winner_name: "乙公司", award_amount: 200_000 }),
    ];
    const result = analyzeTopWinners(cases);
    expect(result).toHaveLength(1);
    expect(result[0].win_count).toBe(2);
  });

  it("sorts results descending by win_count", () => {
    const cases = [
      makeCase({ winner_id: "B001", winner_name: "乙公司", award_date: "2023/01/01" }),
      makeCase({ winner_id: "A001", winner_name: "甲公司", award_date: "2024/01/01" }),
      makeCase({ winner_id: "A001", winner_name: "甲公司", award_date: "2024/06/01" }),
      makeCase({ winner_id: "A001", winner_name: "甲公司", award_date: "2025/01/01" }),
    ];
    const result = analyzeTopWinners(cases);
    expect(result[0].name).toBe("甲公司");
    expect(result[0].win_count).toBe(3);
    expect(result[1].name).toBe("乙公司");
    expect(result[1].win_count).toBe(1);
  });

  it("handles null award_amount by treating it as 0", () => {
    const cases = [makeCase({ award_amount: null })];
    const result = analyzeTopWinners(cases);
    expect(result[0].total_amount).toBe(0);
  });

  it("includes consecutive_years in the returned TopWinner objects", () => {
    const cases = [
      makeCase({ winner_id: "A001", winner_name: "甲公司", award_date: "2024/03/01" }),
      makeCase({ winner_id: "A001", winner_name: "甲公司", award_date: "2025/03/01" }),
    ];
    const result = analyzeTopWinners(cases);
    expect(result[0].consecutive_years).toBe(2);
  });

  it("handles multiple winners with equal win_count (order stable — both present)", () => {
    const cases = [
      makeCase({ winner_id: "A001", winner_name: "甲公司" }),
      makeCase({ winner_id: "B001", winner_name: "乙公司" }),
    ];
    const result = analyzeTopWinners(cases);
    expect(result).toHaveLength(2);
    expect(result.every((w) => w.win_count === 1)).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────
// calculateConsecutiveYears
// ──────────────────────────────────────────────────────────────

describe("calculateConsecutiveYears", () => {
  it("returns 0 when no cases match the winner name", () => {
    const cases = [makeCase({ winner_name: "乙公司", award_date: "2024/01/01" })];
    expect(calculateConsecutiveYears(cases, "甲公司")).toBe(0);
  });

  it("returns 0 when matching cases have no award_date", () => {
    const cases = [makeCase({ winner_name: "甲公司", award_date: "" })];
    expect(calculateConsecutiveYears(cases, "甲公司")).toBe(0);
  });

  it("returns 1 for a single winning year", () => {
    const cases = [makeCase({ winner_name: "甲公司", award_date: "2024/01/01" })];
    expect(calculateConsecutiveYears(cases, "甲公司")).toBe(1);
  });

  it("returns 2 for two consecutive years", () => {
    const cases = [
      makeCase({ winner_name: "甲公司", award_date: "2023/06/01" }),
      makeCase({ winner_name: "甲公司", award_date: "2024/06/01" }),
    ];
    expect(calculateConsecutiveYears(cases, "甲公司")).toBe(2);
  });

  it("returns 3 for three consecutive years", () => {
    const cases = [
      makeCase({ winner_name: "甲公司", award_date: "2022/01/01" }),
      makeCase({ winner_name: "甲公司", award_date: "2023/01/01" }),
      makeCase({ winner_name: "甲公司", award_date: "2024/01/01" }),
    ];
    expect(calculateConsecutiveYears(cases, "甲公司")).toBe(3);
  });

  it("breaks the streak at a gap year — returns count from the most recent consecutive block", () => {
    // 2021, 2023, 2024 → sorted desc: 2024, 2023, 2021 → streak stops at 2021
    const cases = [
      makeCase({ winner_name: "甲公司", award_date: "2021/01/01" }),
      makeCase({ winner_name: "甲公司", award_date: "2023/01/01" }),
      makeCase({ winner_name: "甲公司", award_date: "2024/01/01" }),
    ];
    expect(calculateConsecutiveYears(cases, "甲公司")).toBe(2);
  });

  it("deduplicates multiple wins in the same year", () => {
    const cases = [
      makeCase({ winner_name: "甲公司", award_date: "2024/01/01" }),
      makeCase({ winner_name: "甲公司", award_date: "2024/06/15" }),
    ];
    expect(calculateConsecutiveYears(cases, "甲公司")).toBe(1);
  });

  it("handles award_date in compact format (YYYYMMDD) without slashes", () => {
    const cases = [makeCase({ winner_name: "甲公司", award_date: "20240115" })];
    expect(calculateConsecutiveYears(cases, "甲公司")).toBe(1);
  });

  it("ignores cases belonging to a different winner", () => {
    const cases = [
      makeCase({ winner_name: "甲公司", award_date: "2024/01/01" }),
      makeCase({ winner_name: "乙公司", award_date: "2023/01/01" }),
    ];
    // 乙公司's 2023 must not extend 甲公司's streak
    expect(calculateConsecutiveYears(cases, "甲公司")).toBe(1);
  });
});

// ──────────────────────────────────────────────────────────────
// overallAssessment
// ──────────────────────────────────────────────────────────────

describe("overallAssessment", () => {
  it("returns unknown for an empty checks array", () => {
    expect(overallAssessment([])).toBe("unknown");
  });

  it("returns red when any check is red (even with other greens)", () => {
    const checks = [makeCheck("green"), makeCheck("red"), makeCheck("green")];
    expect(overallAssessment(checks)).toBe("red");
  });

  it("returns red when all checks are red", () => {
    const checks = [makeCheck("red"), makeCheck("red")];
    expect(overallAssessment(checks)).toBe("red");
  });

  it("returns green when all checks are green", () => {
    const checks = [makeCheck("green"), makeCheck("green"), makeCheck("green")];
    expect(overallAssessment(checks)).toBe("green");
  });

  it("returns unknown when all checks are unknown", () => {
    const checks = [makeCheck("unknown"), makeCheck("unknown")];
    expect(overallAssessment(checks)).toBe("unknown");
  });

  it("returns yellow for mixed green and yellow", () => {
    const checks = [makeCheck("green"), makeCheck("yellow")];
    expect(overallAssessment(checks)).toBe("yellow");
  });

  it("returns yellow for mixed green and unknown", () => {
    const checks = [makeCheck("green"), makeCheck("unknown")];
    expect(overallAssessment(checks)).toBe("yellow");
  });

  it("returns yellow for mixed yellow and unknown (no red)", () => {
    const checks = [makeCheck("yellow"), makeCheck("unknown")];
    expect(overallAssessment(checks)).toBe("yellow");
  });

  it("red takes precedence over unknown checks", () => {
    const checks = [makeCheck("unknown"), makeCheck("red"), makeCheck("unknown")];
    expect(overallAssessment(checks)).toBe("red");
  });

  it("returns green for a single green check", () => {
    expect(overallAssessment([makeCheck("green")])).toBe("green");
  });
});

// ──────────────────────────────────────────────────────────────
// generateRecommendation
// ──────────────────────────────────────────────────────────────

describe("generateRecommendation", () => {
  it("red overall — mentions warning and lists the red check labels", () => {
    const checks = [
      makeCheck("red", "連續得標廠商"),
      makeCheck("red", "評委結構"),
    ];
    const result = generateRecommendation(checks, "red");
    expect(result).toContain("警告");
    expect(result).toContain("連續得標廠商");
    expect(result).toContain("評委結構");
    expect(result).toContain("謹慎評估");
  });

  it("green overall — positive recommendation to bid actively", () => {
    const checks = [makeCheck("green"), makeCheck("green")];
    const result = generateRecommendation(checks, "green");
    expect(result).toContain("綠燈");
    expect(result).toContain("積極準備投標");
  });

  it("yellow overall — summarises green count and prompts for missing info", () => {
    const checks = [makeCheck("green"), makeCheck("unknown"), makeCheck("unknown")];
    const result = generateRecommendation(checks, "yellow");
    expect(result).toContain("1 項為綠燈");
    expect(result).toContain("2 項待確認");
    expect(result).toContain("最終決策");
  });

  it("yellow overall — mentions red count when red checks are present", () => {
    const checks = [makeCheck("red"), makeCheck("yellow")];
    const result = generateRecommendation(checks, "yellow");
    expect(result).toContain("1 項需注意");
  });

  it("yellow overall — only unknown checks produces a message without green or red mention", () => {
    // A purely unknown set still ends up yellow if mixed, but we can craft yellow directly
    // by passing yellow as overall and all-unknown checks
    const checks = [makeCheck("unknown"), makeCheck("unknown")];
    const result = generateRecommendation(checks, "yellow");
    // should NOT contain "0 項為綠燈" since greenChecks.length === 0
    expect(result).not.toContain("0 項為綠燈");
    expect(result).toContain("待確認");
  });

  it("unknown overall — recommends gathering more intelligence", () => {
    const checks = [makeCheck("unknown")];
    const result = generateRecommendation(checks, "unknown");
    expect(result).toContain("尚未取得足夠情報");
    expect(result).toContain("PCC");
  });
});

// ──────────────────────────────────────────────────────────────
// formatBudget
// ──────────────────────────────────────────────────────────────

describe("formatBudget", () => {
  it("formats zero as plain number with 元 suffix", () => {
    expect(formatBudget(0)).toBe("0 元");
  });

  it("formats amounts below 10,000 as plain number with 元 suffix", () => {
    expect(formatBudget(9_999)).toBe("9,999 元");
    expect(formatBudget(1)).toBe("1 元");
    expect(formatBudget(500)).toBe("500 元");
  });

  it("formats 10,000 exactly as 1 萬元", () => {
    expect(formatBudget(10_000)).toBe("1 萬元");
  });

  it("formats amounts in 萬 range (10,000 – 99,999,999)", () => {
    expect(formatBudget(1_500_000)).toBe("150 萬元");
    expect(formatBudget(50_000)).toBe("5 萬元");
    expect(formatBudget(99_990_000)).toBe("9999 萬元");
  });

  it("rounds 萬 amounts to nearest 萬 (Math.round)", () => {
    // 15,500 / 10,000 = 1.55 → rounds to 2
    expect(formatBudget(15_500)).toBe("2 萬元");
    // 14_999 / 10_000 = 1.4999 → rounds to 1
    expect(formatBudget(14_999)).toBe("1 萬元");
  });

  it("formats 100,000,000 exactly as 1.0 億元", () => {
    expect(formatBudget(100_000_000)).toBe("1.0 億元");
  });

  it("formats amounts in 億 range with one decimal place", () => {
    expect(formatBudget(120_000_000)).toBe("1.2 億元");
    expect(formatBudget(1_000_000_000)).toBe("10.0 億元");
    expect(formatBudget(250_000_000)).toBe("2.5 億元");
  });

  it("formats 億 amount that would have more decimals — toFixed(1) truncates", () => {
    // 133_333_333 / 100_000_000 = 1.33333... → "1.3 億元"
    expect(formatBudget(133_333_333)).toBe("1.3 億元");
  });
});

// ──────────────────────────────────────────────────────────────
// daysUntilDeadline
// ──────────────────────────────────────────────────────────────

describe("daysUntilDeadline", () => {
  beforeEach(() => {
    // Pin "today" to 2026-02-25 (currentDate from system prompt)
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-25T08:00:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns null for an unparseable date string", () => {
    expect(daysUntilDeadline("not-a-date")).toBeNull();
    expect(daysUntilDeadline("")).toBeNull();
    expect(daysUntilDeadline("25/02/2026")).toBeNull(); // DD/MM/YYYY not parseable by Date.parse
  });

  it("returns 0 when the deadline is today", () => {
    expect(daysUntilDeadline("2026-02-25")).toBe(0);
  });

  it("returns a positive number for a future deadline", () => {
    expect(daysUntilDeadline("2026-03-07")).toBe(10);
    expect(daysUntilDeadline("2026-02-26")).toBe(1);
  });

  it("returns a negative number for a past deadline", () => {
    expect(daysUntilDeadline("2026-02-24")).toBe(-1);
    expect(daysUntilDeadline("2026-01-01")).toBe(-55);
  });

  it("handles ISO 8601 strings with time components (uses date only)", () => {
    // Time portion must not affect the day calculation
    expect(daysUntilDeadline("2026-03-07T23:59:59")).toBe(10);
    expect(daysUntilDeadline("2026-02-25T00:00:00")).toBe(0);
  });

  it("handles a far-future deadline correctly", () => {
    expect(daysUntilDeadline("2027-02-25")).toBe(365);
  });
});
