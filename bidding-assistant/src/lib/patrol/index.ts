/**
 * P0 巡標 Layer B+C：業務邏輯層 + 外部寫入層
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
export type { AcceptProgress, AcceptConfig } from './orchestrator';
export {
  orchestrateAccept,
  validateOrchestrationResult,
  getProgressFromResult,
} from './orchestrator';

// API 客戶端（瀏覽器端呼叫 API routes）
export {
  apiCreateNotionCase,
  apiUpdateNotionCase,
  apiCreateDriveFolder,
  apiSearchPcc,
  apiFetchTenderDetail,
} from './api-client';

// Notion 建檔/回寫（Layer B）
export type { NotionProperties } from './notion-writer';
export {
  normalizeDate,
  mapInputToNotionProperties,
  extractCaseUniqueId,
  buildContentBlocks,
  createNotionCase,
  updateNotionCase,
} from './notion-writer';

// Drive 建資料夾（Layer B）
export {
  formatDriveFolderName,
  DRIVE_PARENT_PATH,
  TEMPLATE_SUBFOLDERS,
  createDriveFolder,
} from './drive-writer';

// 編排 Hook（UI 層使用）
export { usePatrolOrchestrator } from './usePatrolOrchestrator';

// 型別橋接（W01 scan → P0 patrol）
export {
  scanTenderToRaw,
  scanResultToPatrolItem,
  scanResultsToPatrolItems,
  patrolCategoryToKeyword,
  keywordCategoryToPatrol,
} from './bridge';
