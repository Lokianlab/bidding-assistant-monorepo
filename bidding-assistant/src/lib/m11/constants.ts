// M11 結案飛輪 - 常數定義

import type { PatternCategory } from './types';

export const PATTERN_CATEGORIES: Record<PatternCategory, string> = {
  'process': '流程最佳實踐',
  'team': '團隊協作',
  'resource': '資源配置',
  'risk-mitigation': '風險管理'
};

export const CONFIDENCE_THRESHOLD = 0.85; // 規格要求

export const KB_CATEGORY_MAPPING: Record<PatternCategory, string[]> = {
  'process': ['M00A', 'M00B'],
  'team': ['M00C'],
  'resource': ['M00D'],
  'risk-mitigation': ['M00E']
};

export const PATTERN_SUCCESS_INDICATORS = {
  // quality score >= 90, budget variance <= 10%
  excellenceThreshold: { quality: 90, budgetVariance: 10 },
  // quality >= 70, budget variance <= 20%
  goodThreshold: { quality: 70, budgetVariance: 20 }
};

// 置信度計算參數
export const CONFIDENCE_CALCULATION_WEIGHTS = {
  performanceWeight: 0.5,
  budgetWeight: 0.25,
  scheduleWeight: 0.25
};

// 預算/進度差異容限（用於計算置信度）
export const VARIANCE_TOLERANCE = {
  budget: 50, // 用於計算置信度的分母
  schedule: 50 // 用於計算置信度的分母
};
