/**
 * M10 履約管理模組匯出彙整
 */

// 型別
export type {
  MilestoneStatus,
  Milestone,
  Contract,
  ContractProgress,
  ProgressReport,
  ReportSection,
} from './types';

// 常數
export {
  MILESTONE_STATUS_LABELS,
  STANDARD_MILESTONE_WEIGHTS,
  REPORT_PERIOD_OPTIONS,
  MILESTONE_STATUS_RULES,
} from './constants';

// 輔助函式
export {
  generateStandardMilestones,
  calculateOverallProgress,
  determineMilestoneStatus,
  calculatePaymentSchedule,
  generateProgressSummary,
} from './helpers';

// Hook
export {
  useM10ContractManagement,
} from './useM10ContractManagement';
export type { UseM10ContractManagementResult } from './useM10ContractManagement';
