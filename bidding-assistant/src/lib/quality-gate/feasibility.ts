/** M04 品質閘門 — 閘門 3：實務檢驗 */

import {
  BUDGET_THRESHOLDS,
  COMMON_SENSE_RULES,
  FEASIBILITY_SCORE,
} from "./constants";
import type {
  BudgetFeasibility,
  CommonSenseFlag,
  CostItem,
  FeasibilityContext,
  FeasibilityIssue,
  FeasibilityOptions,
  FeasibilityResult,
} from "./types";

const DEFAULT_OPTIONS: Required<FeasibilityOptions> = {
  marginMinPercent: 10,
  enableCommonSense: true,
};

/**
 * 對建議書執行閘門 3 實務檢驗。
 *
 * 兩個子檢查：
 * 1. 預算可行性：成本項目總和 vs 案件預算
 * 2. 常識檢查：regex 模式比對 + 上下文條件
 *
 * @param text - 建議書文字（用於常識檢查）
 * @param costItems - 成本項目清單（由呼叫端從建議書提取）
 * @param context - 案件背景（預算、工期、團隊等）
 * @param options - 檢驗選項
 */
export function checkFeasibility(
  text: string,
  costItems: CostItem[] = [],
  context: FeasibilityContext = {},
  options: FeasibilityOptions = {},
): FeasibilityResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const budget = context.budget != null
    ? checkBudget(costItems, context.budget, opts.marginMinPercent)
    : null;

  const commonSense = opts.enableCommonSense
    ? checkCommonSense(text, context)
    : [];

  const score = calcScore(budget, commonSense);
  const issues = buildIssues(budget, commonSense, opts);

  return { budget, commonSense, score, issues };
}

// ── 預算可行性 ──────────────────────────────────────────

/**
 * 檢查預算可行性。純函式。
 *
 * @param costItems - 成本項目
 * @param totalBudget - 案件總預算
 * @param marginMin - 餘裕警告門檻百分比
 */
export function checkBudget(
  costItems: CostItem[],
  totalBudget: number,
  marginMin: number = 10,
): BudgetFeasibility {
  const totalEstimate = costItems.reduce(
    (sum, item) => sum + item.estimatedAmount,
    0,
  );

  const margin = totalBudget > 0
    ? ((totalBudget - totalEstimate) / totalBudget) * 100
    : totalEstimate > 0 ? -100 : 0;

  const verdict = deriveVerdict(margin);
  const warnings = buildBudgetWarnings(costItems, margin, marginMin);

  return {
    totalBudget,
    estimatedCosts: costItems,
    totalEstimate,
    margin: Math.round(margin * 10) / 10,
    verdict,
    warnings,
  };
}

function deriveVerdict(
  margin: number,
): BudgetFeasibility["verdict"] {
  if (margin < 0) return "超支";
  if (margin < BUDGET_THRESHOLDS.reasonableMargin) return "緊繃";
  if (margin < BUDGET_THRESHOLDS.ampleMargin) return "合理";
  return "充裕";
}

function buildBudgetWarnings(
  costItems: CostItem[],
  margin: number,
  marginMin: number,
): string[] {
  const warnings: string[] = [];

  if (margin < 0) {
    warnings.push(`估算成本超過預算 ${Math.abs(Math.round(margin))}%`);
  } else if (margin < marginMin) {
    warnings.push(`預算餘裕僅 ${Math.round(margin)}%，低於 ${marginMin}% 警戒線`);
  }

  const lowConfidence = costItems.filter((c) => c.confidence === "低");
  if (lowConfidence.length > 0) {
    warnings.push(
      `有 ${lowConfidence.length} 項成本估算信心度低（${lowConfidence.map((c) => c.description).join("、")}）`,
    );
  }

  const inferred = costItems.filter((c) => c.source === "inferred");
  if (inferred.length > costItems.length / 2 && costItems.length > 0) {
    warnings.push("超過一半的成本為推算值，建議補充明確報價");
  }

  return warnings;
}

// ── 常識檢查 ────────────────────────────────────────────

/**
 * 用確定性規則檢查建議書中的不切實際方案。
 * 每條規則有 regex 模式 + 上下文條件，兩者都符合才觸發。
 */
export function checkCommonSense(
  text: string,
  context: FeasibilityContext,
): CommonSenseFlag[] {
  if (!text.trim()) return [];

  const flags: CommonSenseFlag[] = [];

  for (const rule of COMMON_SENSE_RULES) {
    const match = rule.pattern.exec(text);
    if (match && rule.contextCheck(context)) {
      flags.push({
        ruleName: rule.name,
        matchedText: match[0],
        message: rule.message,
      });
    }
  }

  return flags;
}

// ── 分數與問題 ──────────────────────────────────────────

function calcScore(
  budget: BudgetFeasibility | null,
  commonSense: CommonSenseFlag[],
): number {
  let score = FEASIBILITY_SCORE.baseScore;

  if (budget) {
    if (budget.verdict === "超支") score -= FEASIBILITY_SCORE.budgetExceededPenalty;
    else if (budget.verdict === "緊繃") score -= FEASIBILITY_SCORE.budgetTightPenalty;
  }

  score -= commonSense.length * FEASIBILITY_SCORE.commonSensePenalty;

  return Math.max(FEASIBILITY_SCORE.minScore, Math.min(FEASIBILITY_SCORE.maxScore, score));
}

function buildIssues(
  budget: BudgetFeasibility | null,
  commonSense: CommonSenseFlag[],
  opts: Required<FeasibilityOptions>,
): FeasibilityIssue[] {
  const issues: FeasibilityIssue[] = [];

  if (budget) {
    if (budget.verdict === "超支") {
      issues.push({
        severity: "error",
        type: "budget_exceeded",
        message: `估算成本 ${budget.totalEstimate.toLocaleString()} 超過預算 ${budget.totalBudget.toLocaleString()}`,
        context: `餘裕 ${budget.margin}%`,
      });
    } else if (budget.margin < opts.marginMinPercent) {
      issues.push({
        severity: "warning",
        type: "budget_tight",
        message: `預算餘裕僅 ${budget.margin}%，低於 ${opts.marginMinPercent}% 安全線`,
        context: `估算 ${budget.totalEstimate.toLocaleString()} / 預算 ${budget.totalBudget.toLocaleString()}`,
      });
    }

    for (const w of budget.warnings) {
      if (!issues.some((i) => i.message.includes(w.slice(0, 20)))) {
        issues.push({
          severity: "warning",
          type: "unrealistic",
          message: w,
          context: "預算分析",
        });
      }
    }
  }

  for (const flag of commonSense) {
    issues.push({
      severity: "warning",
      type: "common_sense",
      message: flag.message,
      context: flag.matchedText,
    });
  }

  return issues;
}
