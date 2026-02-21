/** M04 品質閘門 — 品質報告組裝（四道閘門合併） */

import type { QualityScore, CheckResult } from "../quality/types";
import type {
  FactCheckResult,
  RequirementTraceResult,
  FeasibilityResult,
  QualityReport,
  QualityReportOptions,
} from "./types";

const DEFAULT_OPTIONS: Required<QualityReportOptions> = {
  passThreshold: 70,
  riskThreshold: 50,
  weights: {
    gate0: 0.2,
    gate1: 0.3,
    gate2: 0.2,
    gate3: 0.3,
  },
};

/**
 * 組裝四道閘門的品質報告。
 *
 * 呼叫端負責分別執行各閘門的檢查函式，再把結果傳入此函式合併。
 * 這樣做讓每道閘門可以獨立使用，品質報告只是「組合層」。
 *
 * @param gate0Score - 閘門 0 品質分數（from lib/quality/score.ts calculateScore）
 * @param gate0Issues - 閘門 0 檢查結果（from lib/quality/rules.ts runChecks）
 * @param gate1 - 閘門 1 事實查核結果
 * @param gate2 - 閘門 2 需求追溯結果（null = 跳過）
 * @param gate3 - 閘門 3 實務檢驗結果
 * @param options - 報告選項
 */
export function buildQualityReport(
  gate0Score: QualityScore,
  gate0Issues: CheckResult[],
  gate1: FactCheckResult,
  gate2: RequirementTraceResult | null,
  gate3: FeasibilityResult,
  options: QualityReportOptions = {},
): QualityReport {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const weights = opts.weights ?? DEFAULT_OPTIONS.weights;

  const gate0 = {
    score: gate0Score.value,
    label: gate0Score.label,
    errorCount: gate0Score.errorCount,
    warningCount: gate0Score.warningCount,
  };

  const overallScore = calcOverallScore(
    gate0.score,
    gate1.score,
    gate2?.score ?? null,
    gate3.score,
    weights,
  );

  const verdict = deriveVerdict(overallScore, opts.passThreshold, opts.riskThreshold);
  const criticalIssues = collectCriticalIssues(gate0Issues, gate1, gate2, gate3);

  return {
    gate0,
    gate1,
    gate2,
    gate3,
    overallScore,
    verdict,
    criticalIssues,
  };
}

// ── 分數計算 ────────────────────────────────────────────

/**
 * 計算四道閘門的加權平均分數。
 * 閘門 2 跳過時，其權重平均分配給其他閘門。
 */
function calcOverallScore(
  gate0Score: number,
  gate1Score: number,
  gate2Score: number | null,
  gate3Score: number,
  weights: { gate0: number; gate1: number; gate2: number; gate3: number },
): number {
  if (gate2Score !== null) {
    const total =
      gate0Score * weights.gate0 +
      gate1Score * weights.gate1 +
      gate2Score * weights.gate2 +
      gate3Score * weights.gate3;
    const weightSum = weights.gate0 + weights.gate1 + weights.gate2 + weights.gate3;
    return Math.round(total / weightSum);
  }

  // 閘門 2 跳過：用剩餘三道的權重重新分配
  const weightSum = weights.gate0 + weights.gate1 + weights.gate3;
  if (weightSum === 0) return 0;

  const total =
    gate0Score * weights.gate0 +
    gate1Score * weights.gate1 +
    gate3Score * weights.gate3;

  return Math.round(total / weightSum);
}

function deriveVerdict(
  score: number,
  passThreshold: number,
  riskThreshold: number,
): QualityReport["verdict"] {
  if (score >= passThreshold) return "通過";
  if (score >= riskThreshold) return "有風險";
  return "不建議提交";
}

// ── 問題匯集 ────────────────────────────────────────────

function collectCriticalIssues(
  gate0Issues: CheckResult[],
  gate1: FactCheckResult,
  gate2: RequirementTraceResult | null,
  gate3: FeasibilityResult,
): string[] {
  const criticals: string[] = [];

  // 閘門 0 的 error
  for (const issue of gate0Issues) {
    if (issue.type === "error") {
      criticals.push(`[文字品質] ${issue.message}`);
    }
  }

  // 閘門 1 的 error
  for (const issue of gate1.issues) {
    if (issue.severity === "error") {
      criticals.push(`[事實查核] ${issue.message}`);
    }
  }

  // 閘門 2 的 error
  if (gate2) {
    for (const issue of gate2.issues) {
      if (issue.severity === "error") {
        criticals.push(`[需求追溯] ${issue.message}`);
      }
    }
  }

  // 閘門 3 的 error
  for (const issue of gate3.issues) {
    if (issue.severity === "error") {
      criticals.push(`[實務檢驗] ${issue.message}`);
    }
  }

  return criticals;
}
