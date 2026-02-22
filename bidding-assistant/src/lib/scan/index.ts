// ====== 巡標自動化模組匯出 ======

export { classifyTender, classifyTenders, countByCategory, sortByPriority } from "./keyword-engine";
export { DEFAULT_KEYWORD_RULES, DEFAULT_SEARCH_KEYWORDS } from "./constants";
export {
  addExclusion,
  removeExclusion,
  isExcluded,
  filterExcluded,
  clearExclusions,
  getExcludedJobNumbers,
} from "./exclusion";
export type {
  KeywordCategory,
  KeywordRule,
  Classification,
  ScanTender,
  ScanResult,
  ScanSummary,
} from "./types";
