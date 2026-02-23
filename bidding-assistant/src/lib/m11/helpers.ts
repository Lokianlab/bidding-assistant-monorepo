// M11 結案飛輪 - 輔助函式

import type { SuccessPattern, CloseoutReport, KBBackflowEntry, FinancialSummary } from './types';
import { KB_CATEGORY_MAPPING, PATTERN_SUCCESS_INDICATORS } from './constants';

/**
 * 生成結案報告標題
 */
export function generateClosureTitle(caseData: { name: string }): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  return `${caseData.name} - 結案報告 ${dateStr}`;
}

/**
 * 格式化財務摘要
 */
export function formatFinancialSummary(budget: number, actual: number): FinancialSummary {
  const variance = actual - budget;
  const variancePercent = budget !== 0 ? (variance / budget) * 100 : 0;

  return {
    budget,
    actual,
    variance,
    variancePercent,
    varianceStatus: variance < 0 ? 'under-budget' : variance > 0 ? 'over-budget' : 'on-track'
  };
}

/**
 * 根據差異百分比計算狀態
 */
export function calculateVarianceStatus(variancePercent: number): 'excellent' | 'good' | 'fair' | 'poor' {
  const absVariance = Math.abs(variancePercent);
  if (absVariance <= 5) return 'excellent';
  if (absVariance <= 15) return 'good';
  if (absVariance <= 25) return 'fair';
  return 'poor';
}

/**
 * 將得分（0-100）轉換為置信度（0-1）
 */
export function scoreToConfidenceLevel(score: number): number {
  const normalized = Math.max(0, Math.min(score, 100)) / 100;
  return Math.min(normalized, 1);
}

/**
 * 從成功模式提取目標知識庫分類
 */
export function flattenCategories(patterns: SuccessPattern[]): string[] {
  const categories = new Set<string>();

  patterns.forEach(pattern => {
    const targets = KB_CATEGORY_MAPPING[pattern.category] || [];
    targets.forEach(cat => categories.add(cat));
  });

  return Array.from(categories);
}

/**
 * 構建知識庫回流資料
 */
export function buildKBEntry(closeoutData: CloseoutReport): KBBackflowEntry {
  return {
    sourceCase: closeoutData.caseId,
    patterns: closeoutData.successPatterns,
    lessonsLearned: closeoutData.sections.challenges,
    targetCategories: flattenCategories(closeoutData.successPatterns),
    timestamp: new Date()
  };
}

/**
 * 判斷案件是否達到優異程度
 */
export function isExcellent(qualityScore: number, budgetVariancePercent: number): boolean {
  const threshold = PATTERN_SUCCESS_INDICATORS.excellenceThreshold;
  return qualityScore >= threshold.quality && Math.abs(budgetVariancePercent) <= threshold.budgetVariance;
}

/**
 * 判斷案件是否達到良好程度
 */
export function isGood(qualityScore: number, budgetVariancePercent: number): boolean {
  const threshold = PATTERN_SUCCESS_INDICATORS.goodThreshold;
  return qualityScore >= threshold.quality && Math.abs(budgetVariancePercent) <= threshold.budgetVariance;
}

/**
 * 驗證 CloseoutReport 資料完整性
 */
export function validateCloseoutReport(report: Partial<CloseoutReport>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!report.caseId) errors.push('缺少案件ID');
  if (!report.title) errors.push('缺少報告標題');
  if (!report.sections?.summary) errors.push('缺少摘要');
  if (!report.sections?.achievements || report.sections.achievements.length === 0) {
    errors.push('缺少成就');
  }
  if (report.sections?.qualityScore === undefined || report.sections.qualityScore < 0 || report.sections.qualityScore > 100) {
    errors.push('品質評分無效 (應為 0-100)');
  }
  if (!report.sections?.financialSummary) errors.push('缺少財務摘要');

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 計算整體成功評分（0-100）
 */
export function calculateOverallScore(
  qualityScore: number,
  budgetVariancePercent: number,
  scheduleVariancePercent: number,
  patternCount: number
): number {
  const qualityComponent = qualityScore * 0.5; // 50% 品質
  const budgetComponent = Math.max(0, 100 - Math.abs(budgetVariancePercent) * 2) * 0.3; // 30% 預算
  const scheduleComponent = Math.max(0, 100 - Math.abs(scheduleVariancePercent) * 2) * 0.2; // 20% 進度

  let total = qualityComponent + budgetComponent + scheduleComponent;

  // 如果有多個成功模式，加分
  if (patternCount >= 3) {
    total = Math.min(100, total + 5);
  }

  return Math.round(total);
}
