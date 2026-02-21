import { describe, it, expect } from "vitest";
import { buildQualityReport } from "../report";
import type { QualityScore, CheckResult } from "../../quality/types";
import type {
  FactCheckResult,
  RequirementTraceResult,
  FeasibilityResult,
} from "../types";

// ── 測試用的 fixture 工廠 ───────────────────────────────

function makeGate0Score(value = 85): QualityScore {
  return {
    value,
    label: value >= 80 ? "品質良好" : value >= 60 ? "需要改善" : "品質不佳",
    errorCount: value >= 80 ? 0 : 2,
    warningCount: value >= 80 ? 1 : 3,
    infoCount: 0,
  };
}

function makeGate0Issues(errors = 0): CheckResult[] {
  const issues: CheckResult[] = [];
  for (let i = 0; i < errors; i++) {
    issues.push({
      type: "error",
      rule: `test-rule-${i}`,
      message: `閘門 0 錯誤 #${i + 1}`,
    });
  }
  return issues;
}

function makeGate1(score = 80, errorCount = 0): FactCheckResult {
  return {
    annotations: [],
    verifiedCount: 5,
    partialCount: 2,
    unverifiedCount: errorCount,
    hallucinationCount: 0,
    score,
    issues: errorCount > 0
      ? [{
          severity: "error" as const,
          type: "unverified_claim" as const,
          message: `有 ${errorCount} 處宣稱無法追溯`,
          context: "測試",
        }]
      : [],
  };
}

function makeGate2(score = 90, uncovered = 0): RequirementTraceResult {
  return {
    matrix: {
      requirements: [
        { id: "R-01", source: "評分", description: "測試需求", weight: 50, category: "評分" },
      ],
      coverage: [{
        requirementId: "R-01",
        status: uncovered > 0 ? "missing" as const : "covered" as const,
        coveredBy: uncovered > 0 ? [] : ["測試段落"],
        matchScore: uncovered > 0 ? 0 : 0.8,
        gap: uncovered > 0 ? "未覆蓋" : null,
      }],
      uncoveredCount: uncovered,
      coverageRate: uncovered > 0 ? 0 : 100,
    },
    score,
    issues: uncovered > 0
      ? [{
          severity: "error" as const,
          type: "missing_requirement" as const,
          message: "R-01 未覆蓋",
          context: "R-01",
        }]
      : [],
  };
}

function makeGate3(score = 85, budgetExceeded = false): FeasibilityResult {
  return {
    budget: budgetExceeded
      ? {
          totalBudget: 500_000,
          estimatedCosts: [],
          totalEstimate: 600_000,
          margin: -20,
          verdict: "超支" as const,
          warnings: ["估算成本超過預算 20%"],
        }
      : null,
    commonSense: [],
    score,
    issues: budgetExceeded
      ? [{
          severity: "error" as const,
          type: "budget_exceeded" as const,
          message: "估算成本超過預算",
          context: "餘裕 -20%",
        }]
      : [],
  };
}

// ── buildQualityReport ──────────────────────────────────

describe("buildQualityReport", () => {
  it("四道閘門都好 → 通過", () => {
    const report = buildQualityReport(
      makeGate0Score(90),
      makeGate0Issues(0),
      makeGate1(85),
      makeGate2(95),
      makeGate3(90),
    );

    expect(report.verdict).toBe("通過");
    expect(report.overallScore).toBeGreaterThanOrEqual(70);
    expect(report.criticalIssues).toHaveLength(0);
  });

  it("有一道閘門很差 → 有風險", () => {
    const report = buildQualityReport(
      makeGate0Score(85),
      makeGate0Issues(0),
      makeGate1(30, 5),   // 閘門 1 很差
      makeGate2(90),
      makeGate3(85),
    );

    // 加權後分數應下降
    expect(report.overallScore).toBeLessThan(80);
    expect(report.criticalIssues.length).toBeGreaterThan(0);
  });

  it("多道閘門都差 → 不建議提交", () => {
    const report = buildQualityReport(
      makeGate0Score(30),
      makeGate0Issues(3),
      makeGate1(20, 8),
      makeGate2(10, 1),
      makeGate3(25, true),
    );

    expect(report.verdict).toBe("不建議提交");
    expect(report.overallScore).toBeLessThan(50);
    expect(report.criticalIssues.length).toBeGreaterThan(0);
  });

  it("閘門 2 為 null 時跳過（重新分配權重）", () => {
    const report = buildQualityReport(
      makeGate0Score(80),
      makeGate0Issues(0),
      makeGate1(80),
      null,               // 沒有需求清單
      makeGate3(80),
    );

    // 三道閘門都 80 → 加權平均約 80
    expect(report.overallScore).toBe(80);
    expect(report.gate2).toBeNull();
    expect(report.verdict).toBe("通過");
  });

  it("criticalIssues 包含所有 error 級別的問題", () => {
    const report = buildQualityReport(
      makeGate0Score(50),
      makeGate0Issues(2),
      makeGate1(40, 3),
      makeGate2(30, 1),
      makeGate3(20, true),
    );

    // 閘門 0: 2 個 error + 閘門 1: 1 個 error + 閘門 2: 1 個 error + 閘門 3: 1 個 error
    expect(report.criticalIssues.length).toBe(5);
    expect(report.criticalIssues.some((i) => i.includes("[文字品質]"))).toBe(true);
    expect(report.criticalIssues.some((i) => i.includes("[事實查核]"))).toBe(true);
    expect(report.criticalIssues.some((i) => i.includes("[需求追溯]"))).toBe(true);
    expect(report.criticalIssues.some((i) => i.includes("[實務檢驗]"))).toBe(true);
  });

  it("自訂門檻", () => {
    const report = buildQualityReport(
      makeGate0Score(80),
      makeGate0Issues(0),
      makeGate1(65),
      null,
      makeGate3(70),
      { passThreshold: 80, riskThreshold: 60 },
    );

    // 分數約 72，低於 80 但高於 60
    expect(report.verdict).toBe("有風險");
  });

  it("自訂權重", () => {
    // 閘門 1 權重設很高，閘門 1 分數低 → 拖低總分
    const report = buildQualityReport(
      makeGate0Score(90),
      makeGate0Issues(0),
      makeGate1(30),       // 閘門 1 很差
      null,
      makeGate3(90),
      {
        weights: { gate0: 0.1, gate1: 0.8, gate2: 0.0, gate3: 0.1 },
      },
    );

    // 閘門 1 佔 80% 權重，分數 30 → 總分很低
    expect(report.overallScore).toBeLessThan(50);
  });

  it("gate0 結果正確轉換", () => {
    const report = buildQualityReport(
      makeGate0Score(75),
      makeGate0Issues(1),
      makeGate1(80),
      null,
      makeGate3(80),
    );

    expect(report.gate0.score).toBe(75);
    expect(report.gate0.label).toBe("需要改善");
    expect(report.gate0.errorCount).toBe(2);
  });

  it("分數合法範圍 0-100", () => {
    const report = buildQualityReport(
      makeGate0Score(0),
      makeGate0Issues(10),
      makeGate1(0, 10),
      makeGate2(0, 1),
      makeGate3(0, true),
    );

    expect(report.overallScore).toBeGreaterThanOrEqual(0);
    expect(report.overallScore).toBeLessThanOrEqual(100);
  });

  it("所有閘門滿分 → overallScore = 100", () => {
    const g0: QualityScore = { value: 100, label: "品質良好", errorCount: 0, warningCount: 0, infoCount: 0 };
    const g1: FactCheckResult = {
      annotations: [], verifiedCount: 0, partialCount: 0, unverifiedCount: 0,
      hallucinationCount: 0, score: 100, issues: [],
    };
    const g2: RequirementTraceResult = {
      matrix: { requirements: [], coverage: [], uncoveredCount: 0, coverageRate: 100 },
      score: 100, issues: [],
    };
    const g3: FeasibilityResult = { budget: null, commonSense: [], score: 100, issues: [] };

    const report = buildQualityReport(g0, [], g1, g2, g3);
    expect(report.overallScore).toBe(100);
    expect(report.verdict).toBe("通過");
    expect(report.criticalIssues).toHaveLength(0);
  });
});
