/**
 * 分析模組 barrel export
 * 統一匯出所有分析函式與型別
 */

// ====== breakdown ======
export {
  buildBreakdown,
  groupByField,
  getBudgetRange,
  BUDGET_RANGES,
  analyzeByWriter,
  analyzeByAgency,
  analyzeByType,
  analyzeByMethod,
  analyzeByBudgetRange,
  analyzeByPriority,
  analyzeByDecision,
} from "./breakdown";
export type { ResultBreakdown, Insight } from "./breakdown";

// ====== cross-matrix ======
export {
  computeCrossMatrix,
  DIMENSION_OPTIONS,
} from "./cross-matrix";
export type { CrossCell, CrossMatrix, DimensionKey } from "./cross-matrix";

// ====== person-report ======
export { buildPersonReport } from "./person-report";
export type { PersonReport } from "./person-report";

// ====== global-insights ======
export { generateGlobalInsights } from "./global-insights";

// ====== cost-analysis ======
export { computeCostAnalysis } from "./cost-analysis";
export type { CostAnalysisResult } from "./cost-analysis";

// ====== trend ======
export {
  toYearMonth,
  computeMonthlyMetrics,
  computeRollingMetrics,
  comparePeriods,
  compareQuarters,
  getRecentMonths,
} from "./trend";
export type {
  MonthlyMetrics,
  RollingMetrics,
  PeriodComparison,
} from "./trend";
