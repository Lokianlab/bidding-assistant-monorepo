// M11 結案飛輪 - 成功模式識別引擎

import type { SuccessPattern, PatternCategory } from './types';
import { CONFIDENCE_THRESHOLD, CONFIDENCE_CALCULATION_WEIGHTS, VARIANCE_TOLERANCE } from './constants';

interface PatternMetrics {
  performanceScore: number; // 0-100
  budgetVariance: number; // 百分比
  scheduleVariance: number; // 百分比
}

/**
 * 計算模式置信度
 */
export function calculatePatternConfidence(metrics: PatternMetrics): number {
  const performanceConfidence = Math.min(metrics.performanceScore / 100, 1);
  const budgetConfidence = Math.max(0, 1 - Math.abs(metrics.budgetVariance) / VARIANCE_TOLERANCE.budget);
  const scheduleConfidence = Math.max(0, 1 - Math.abs(metrics.scheduleVariance) / VARIANCE_TOLERANCE.schedule);

  return (
    performanceConfidence * CONFIDENCE_CALCULATION_WEIGHTS.performanceWeight +
    budgetConfidence * CONFIDENCE_CALCULATION_WEIGHTS.budgetWeight +
    scheduleConfidence * CONFIDENCE_CALCULATION_WEIGHTS.scheduleWeight
  );
}

/**
 * 識別成功模式
 * 核心邏輯：
 * 1. 效能優異 (score >= 85) → 流程模式
 * 2. 預算控制好 (variance <= 10%) → 資源模式
 * 3. 進度控制好 (schedule variance <= 10%) → 流程模式
 * 4. 全面超額 (score >= 90 AND 預算 AND 進度) → 風險管理模式
 */
export function identifyPatterns(metrics: PatternMetrics): SuccessPattern[] {
  const patterns: SuccessPattern[] = [];
  const baseConfidence = calculatePatternConfidence(metrics);

  // 邏輯 1：效能優異 → 流程模式
  if (metrics.performanceScore >= 85) {
    patterns.push({
      id: 'pat-process-excellence',
      name: '流程卓越',
      category: 'process',
      description: '超高效能的流程設計和執行',
      successMetrics: ['performance >= 85%'],
      applicableTo: [],
      confidence: Math.min(baseConfidence + 0.1, 1),
      evidence: [`效能評分: ${metrics.performanceScore}%`]
    });
  }

  // 邏輯 2：預算控制好 → 資源模式
  if (Math.abs(metrics.budgetVariance) <= 10) {
    patterns.push({
      id: 'pat-resource-control',
      name: '資源精準控制',
      category: 'resource',
      description: '卓越的預算管理和成本控制',
      successMetrics: ['budget variance <= 10%'],
      applicableTo: [],
      confidence: Math.min(baseConfidence + 0.05, 1),
      evidence: [`預算差異: ${metrics.budgetVariance.toFixed(1)}%`]
    });
  }

  // 邏輯 3：進度控制好 → 流程模式
  if (Math.abs(metrics.scheduleVariance) <= 10) {
    patterns.push({
      id: 'pat-schedule-control',
      name: '進度精準掌握',
      category: 'process',
      description: '精確的進度計劃和執行',
      successMetrics: ['schedule variance <= 10%'],
      applicableTo: [],
      confidence: Math.min(baseConfidence + 0.05, 1),
      evidence: [`進度差異: ${metrics.scheduleVariance.toFixed(1)}%`]
    });
  }

  // 邏輯 4：全面超額 → 風險管理模式
  if (
    metrics.performanceScore >= 90 &&
    Math.abs(metrics.budgetVariance) <= 10 &&
    Math.abs(metrics.scheduleVariance) <= 10
  ) {
    patterns.push({
      id: 'pat-comprehensive-success',
      name: '綜合成功模式',
      category: 'risk-mitigation',
      description: '全面優秀的專案管理和風險控制',
      successMetrics: [
        'performance >= 90%',
        'budget variance <= 10%',
        'schedule variance <= 10%'
      ],
      applicableTo: [],
      confidence: Math.min(baseConfidence + 0.15, 1),
      evidence: ['多維度優秀表現']
    });
  }

  // 邏輯 5：團隊協作 - 如果效能高且進度好，推斷團隊協作良好
  if (metrics.performanceScore >= 80 && Math.abs(metrics.scheduleVariance) <= 15) {
    patterns.push({
      id: 'pat-team-collaboration',
      name: '團隊協作卓越',
      category: 'team',
      description: '高效的團隊溝通和協調',
      successMetrics: ['performance >= 80%', 'schedule variance <= 15%'],
      applicableTo: [],
      confidence: Math.min(baseConfidence, 1),
      evidence: ['高效能與良好進度控制']
    });
  }

  return patterns;
}

/**
 * 按置信度篩選模式
 */
export function filterByConfidence(
  patterns: SuccessPattern[],
  threshold: number = CONFIDENCE_THRESHOLD
): SuccessPattern[] {
  return patterns.filter(p => p.confidence >= threshold);
}

/**
 * 按分類篩選模式
 */
export function filterByCategory(
  patterns: SuccessPattern[],
  category: PatternCategory
): SuccessPattern[] {
  return patterns.filter(p => p.category === category);
}

/**
 * 取得模式分類
 */
export function categorizePattern(pattern: SuccessPattern): PatternCategory {
  return pattern.category;
}

/**
 * 排序模式（按置信度降序）
 */
export function sortByConfidence(patterns: SuccessPattern[]): SuccessPattern[] {
  return [...patterns].sort((a, b) => b.confidence - a.confidence);
}

/**
 * 計算模式多樣性分數（0-1）
 * 用於評估是否涵蓋多個管理面向
 */
export function calculatePatternDiversity(patterns: SuccessPattern[]): number {
  const categories = new Set(patterns.map(p => p.category));
  return categories.size / 4; // 4 是總分類數
}

/**
 * 驗證模式資料完整性
 */
export function validatePattern(pattern: Partial<SuccessPattern>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!pattern.id) errors.push('缺少模式ID');
  if (!pattern.name) errors.push('缺少模式名稱');
  if (!pattern.category) errors.push('缺少分類');
  if (!pattern.description) errors.push('缺少描述');
  if (!pattern.successMetrics || pattern.successMetrics.length === 0) {
    errors.push('缺少成功指標');
  }
  if (pattern.confidence === undefined || pattern.confidence < 0 || pattern.confidence > 1) {
    errors.push('置信度無效 (應為 0-1)');
  }
  if (!pattern.evidence || pattern.evidence.length === 0) {
    errors.push('缺少證據');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 建立模式建議文本（用於報告）
 */
export function generatePatternSuggestion(pattern: SuccessPattern): string {
  const confidencePercent = Math.round(pattern.confidence * 100);
  return `【${pattern.name}】(${confidencePercent}% 置信度)\n${pattern.description}`;
}

/**
 * 根據多個案件的模式資料提煉共通成功因素
 */
export function extractCommonPatterns(allPatterns: SuccessPattern[][]): SuccessPattern[] {
  const patternMap = new Map<string, { pattern: SuccessPattern; count: number }>();

  allPatterns.forEach(patterns => {
    patterns.forEach(pattern => {
      const existing = patternMap.get(pattern.id);
      if (existing) {
        existing.count++;
        // 提高重複出現的模式的置信度
        existing.pattern.confidence = Math.min(existing.pattern.confidence + 0.05, 1);
      } else {
        patternMap.set(pattern.id, { pattern: { ...pattern }, count: 1 });
      }
    });
  });

  return Array.from(patternMap.values())
    .map(item => item.pattern)
    .sort((a, b) => b.confidence - a.confidence);
}
