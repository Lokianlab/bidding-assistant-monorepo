/**
 * M10 履約管理模組常數
 */

import { MilestoneStatus } from './types';

export const MILESTONE_STATUS_LABELS: Record<MilestoneStatus, string> = {
  pending: '待啟動',
  'in-progress': '進行中',
  completed: '已完成',
  overdue: '逾期',
  'at-risk': '風險中',
};

export const STANDARD_MILESTONE_WEIGHTS = [0.3, 0.5, 0.2];

export const REPORT_PERIOD_OPTIONS = ['monthly', 'quarterly', 'semi-annual'] as const;

export type ReportPeriod = (typeof REPORT_PERIOD_OPTIONS)[number];

/**
 * 里程碑狀態轉換規則
 * 完成 → completed
 * 未開始 → pending
 * 進行中 → in-progress
 * 逾期 → overdue
 * 風險 → at-risk
 */
export const MILESTONE_STATUS_RULES = {
  PAYMENT_DELAY_DAYS: 7, // 完成後 7 天付款
  AT_RISK_THRESHOLD_DAYS: 7, // 距離截止日期 7 天內、進度 < 50% 視為風險
  AT_RISK_PROGRESS_THRESHOLD: 50, // 進度少於 50%
} as const;
