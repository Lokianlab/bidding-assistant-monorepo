// ====== M03 戰略分析引擎：匯出 ======

export {
  scoreDomain,
  scoreAgency,
  scoreCompetition,
  scoreScale,
  scoreTeam,
  detectRedFlags,
  determineVerdict,
  generateReasons,
  calculateFitScore,
} from "./fit-scoring";

export { matchKB } from "./kb-matcher";

export {
  extractKeywords,
  keywordOverlap,
  parseContractAmount,
  calculateIQR,
  clampScore,
  formatBudget,
} from "./helpers";

export {
  DEFAULT_FIT_WEIGHTS,
  FIT_THRESHOLDS,
  DEFAULT_STRATEGY_SETTINGS,
  BUSINESS_KEYWORDS,
  PI_KEYWORDS,
  RED_FLAG_RULES,
  COMPETITION_THRESHOLDS,
} from "./constants";

export type {
  ConfidenceLevel,
  FitVerdict,
  DimensionScore,
  FitScore,
  KBMatchResult,
  IntelligenceInputs,
  FitScoreInput,
  FitWeights,
  StrategySettings,
} from "./types";
