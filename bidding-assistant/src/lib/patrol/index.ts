/**
 * P0 巡標 Layer C：業務邏輯層
 *
 * 模組入口。匯出所有公開 API。
 * @see docs/plans/P0-patrol-automation.md
 */

// 型別定義
export type {
  PccAnnouncementRaw,
  PccTenderDetail,
  PatrolCategory,
  PatrolStatus,
  PatrolItem,
  ClassificationRule,
  NotionCaseCreateInput,
  NotionCaseCreateResult,
  NotionCaseUpdateInput,
  NotionCaseUpdateResult,
  DriveCreateFolderInput,
  DriveCreateFolderResult,
  AcceptResult,
  PatrolSearchStatus,
} from './types';

// 分類引擎
export {
  classifyAnnouncement,
  classifyAnnouncements,
  groupByCategory,
  getClassificationStats,
  DEFAULT_CLASSIFICATION_RULES,
} from './classifier';

// 欄位轉換
export {
  convertToROCDate,
  convertCategory,
  convertAwardType,
  normalizeTitle,
  truncateDescription,
  convertToNotionInput,
  validateNotionInput,
} from './converter';

// 排除記憶
export type { ExclusionStore } from './exclusion';
export {
  initializeExclusionStore,
  loadExclusionStore,
  saveExclusionStore,
  addExclusion,
  removeExclusion,
  isExcluded,
  filterExcluded,
  getExcludedItems,
  clearExclusions,
  getExclusionStats,
} from './exclusion';

// 編排流程
export type { AcceptProgress } from './orchestrator';
export {
  orchestrateAccept,
  validateOrchestrationResult,
  getProgressFromResult,
} from './orchestrator';

// 型別橋接（W01 scan → P0 patrol）
export {
  scanTenderToRaw,
  scanResultToPatrolItem,
  scanResultsToPatrolItems,
  patrolCategoryToKeyword,
  keywordCategoryToPatrol,
} from './bridge';
