// ====== M03 戰略分析引擎：模組匯出 ======

// 型別
export type {
  DimensionKey,
  FitVerdict,
  Confidence,
  DimensionScore,
  FitScore,
  FitWeights,
  VerdictThresholds,
  AgencyIntel,
  IntelligenceInputs,
  KBMatchEntry,
  KBMatchResult,
  StrategySettings,
} from "./types";

// 常數
export {
  DEFAULT_FIT_WEIGHTS,
  DEFAULT_VERDICT_THRESHOLDS,
  DEFAULT_STRATEGY_SETTINGS,
  DIMENSION_LABELS,
  BUSINESS_TYPE_VOCABULARY,
  DIMENSION_MAX_SCORE,
} from "./constants";

// 輔助函式
export {
  extractKeywords,
  textMatch,
  normalizeWeights,
  computeVerdict,
  median,
  iqr,
  clampScore,
  parseAmount,
} from "./helpers";

// 適配度評分
export {
  scoreDomain,
  scoreAgency,
  scoreCompetition,
  scoreScale,
  scoreTeam,
  computeFitScore,
} from "./fit-scoring";
export type { FitScoringInput } from "./fit-scoring";

// 知識庫匹配
export { matchKB } from "./kb-matcher";
