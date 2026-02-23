// M11 helpers 測試

import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateClosureTitle,
  formatFinancialSummary,
  calculateVarianceStatus,
  scoreToConfidenceLevel,
  flattenCategories,
  buildKBEntry,
  isExcellent,
  isGood,
  validateCloseoutReport,
  calculateOverallScore
} from '../helpers';
import type { SuccessPattern, CloseoutReport } from '../types';

describe('M11 Helpers', () => {
  describe('generateClosureTitle', () => {
    it('應生成包含案件名稱和日期的標題', () => {
      const result = generateClosureTitle({ name: '測試案件' });
      expect(result).toContain('測試案件');
      expect(result).toContain('結案報告');
      expect(result).toMatch(/\d{4}-\d{2}-\d{2}/);
    });

    it('應處理特殊字元', () => {
      const result = generateClosureTitle({ name: '【特別】案件 & 標案' });
      expect(result).toContain('【特別】案件 & 標案');
    });
  });

  describe('formatFinancialSummary', () => {
    it('應計算正常預算（實際 < 預算）', () => {
      const result = formatFinancialSummary(100000, 90000);
      expect(result.budget).toBe(100000);
      expect(result.actual).toBe(90000);
      expect(result.variance).toBe(-10000);
      expect(result.variancePercent).toBe(-10);
      expect(result.varianceStatus).toBe('under-budget');
    });

    it('應計算超支預算（實際 > 預算）', () => {
      const result = formatFinancialSummary(100000, 120000);
      expect(result.variance).toBe(20000);
      expect(result.variancePercent).toBe(20);
      expect(result.varianceStatus).toBe('over-budget');
    });

    it('應計算在預算範圍內', () => {
      const result = formatFinancialSummary(100000, 100000);
      expect(result.variance).toBe(0);
      expect(result.varianceStatus).toBe('on-track');
    });

    it('應處理零預算', () => {
      const result = formatFinancialSummary(0, 50000);
      expect(result.variancePercent).toBe(0);
    });
  });

  describe('calculateVarianceStatus', () => {
    it('應判定 <= 5% 為 excellent', () => {
      expect(calculateVarianceStatus(3)).toBe('excellent');
      expect(calculateVarianceStatus(-4)).toBe('excellent');
      expect(calculateVarianceStatus(5)).toBe('excellent');
    });

    it('應判定 6-15% 為 good', () => {
      expect(calculateVarianceStatus(10)).toBe('good');
      expect(calculateVarianceStatus(-12)).toBe('good');
    });

    it('應判定 16-25% 為 fair', () => {
      expect(calculateVarianceStatus(20)).toBe('fair');
      expect(calculateVarianceStatus(-25)).toBe('fair');
    });

    it('應判定 > 25% 為 poor', () => {
      expect(calculateVarianceStatus(30)).toBe('poor');
      expect(calculateVarianceStatus(-100)).toBe('poor');
    });
  });

  describe('scoreToConfidenceLevel', () => {
    it('應將 0 分轉換為 0', () => {
      expect(scoreToConfidenceLevel(0)).toBe(0);
    });

    it('應將 100 分轉換為 1', () => {
      expect(scoreToConfidenceLevel(100)).toBe(1);
    });

    it('應將 50 分轉換為 0.5', () => {
      expect(scoreToConfidenceLevel(50)).toBe(0.5);
    });

    it('應限制在 0-1 範圍', () => {
      expect(scoreToConfidenceLevel(-50)).toBe(0);
      expect(scoreToConfidenceLevel(150)).toBe(1);
    });
  });

  describe('flattenCategories', () => {
    it('應從模式提取知識庫分類', () => {
      const patterns: SuccessPattern[] = [
        {
          id: 'p1',
          name: '流程卓越',
          category: 'process',
          description: '測試',
          successMetrics: [],
          applicableTo: [],
          confidence: 0.9,
          evidence: []
        },
        {
          id: 'p2',
          name: '資源控制',
          category: 'resource',
          description: '測試',
          successMetrics: [],
          applicableTo: [],
          confidence: 0.85,
          evidence: []
        }
      ];

      const result = flattenCategories(patterns);
      expect(result).toContain('M00A');
      expect(result).toContain('M00B');
      expect(result).toContain('M00D');
    });

    it('應去重分類', () => {
      const patterns: SuccessPattern[] = [
        {
          id: 'p1',
          name: '流程卓越',
          category: 'process',
          description: '測試',
          successMetrics: [],
          applicableTo: [],
          confidence: 0.9,
          evidence: []
        },
        {
          id: 'p2',
          name: '進度控制',
          category: 'process',
          description: '測試',
          successMetrics: [],
          applicableTo: [],
          confidence: 0.85,
          evidence: []
        }
      ];

      const result = flattenCategories(patterns);
      const countM00A = result.filter(c => c === 'M00A').length;
      expect(countM00A).toBeLessThanOrEqual(2);
    });

    it('應處理空陣列', () => {
      const result = flattenCategories([]);
      expect(result).toEqual([]);
    });
  });

  describe('buildKBEntry', () => {
    it('應構建正確的知識庫回流資料', () => {
      const closeout: CloseoutReport = {
        id: 'closeout-1',
        caseId: 'case-123',
        title: '測試案件結案',
        sections: {
          summary: '總結',
          achievements: ['成就1'],
          challenges: ['挑戰1'],
          financialSummary: {
            budget: 100000,
            actual: 90000,
            variance: -10000,
            varianceStatus: 'under-budget'
          },
          qualityScore: 95
        },
        successPatterns: [],
        createdAt: new Date()
      };

      const result = buildKBEntry(closeout);
      expect(result.sourceCase).toBe('case-123');
      expect(result.lessonsLearned).toContain('挑戰1');
      expect(result.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('isExcellent', () => {
    it('應判定優異案件', () => {
      expect(isExcellent(95, 5)).toBe(true);
      expect(isExcellent(90, 10)).toBe(true);
    });

    it('應拒絕不符條件的案件', () => {
      expect(isExcellent(85, 5)).toBe(false);
      expect(isExcellent(95, 15)).toBe(false);
    });
  });

  describe('isGood', () => {
    it('應判定良好案件', () => {
      expect(isGood(80, 15)).toBe(true);
      expect(isGood(70, 20)).toBe(true);
    });

    it('應拒絕不符條件的案件', () => {
      expect(isGood(65, 15)).toBe(false);
      expect(isGood(80, 25)).toBe(false);
    });
  });

  describe('validateCloseoutReport', () => {
    it('應通過完整的報告驗證', () => {
      const report: Partial<CloseoutReport> = {
        caseId: 'case-123',
        title: '結案報告',
        sections: {
          summary: '總結',
          achievements: ['成就'],
          challenges: [],
          financialSummary: {
            budget: 100000,
            actual: 90000,
            variance: -10000,
            varianceStatus: 'under-budget'
          },
          qualityScore: 80
        }
      };

      const result = validateCloseoutReport(report);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('應拒絕缺少必要欄位的報告', () => {
      const report: Partial<CloseoutReport> = {
        caseId: 'case-123',
        sections: {
          summary: '',
          achievements: [],
          challenges: [],
          financialSummary: {
            budget: 100000,
            actual: 90000,
            variance: -10000,
            varianceStatus: 'under-budget'
          },
          qualityScore: 50
        }
      };

      const result = validateCloseoutReport(report);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('calculateOverallScore', () => {
    it('應計算完美案件的分數', () => {
      const score = calculateOverallScore(100, 0, 0, 3);
      expect(score).toBe(100);
    });

    it('應計算良好案件的分數', () => {
      const score = calculateOverallScore(80, 10, 5, 2);
      expect(score).toBeGreaterThan(60);
      expect(score).toBeLessThan(100);
    });

    it('應考慮模式數量', () => {
      const score1 = calculateOverallScore(80, 10, 5, 2);
      const score2 = calculateOverallScore(80, 10, 5, 4);
      expect(score2).toBeGreaterThan(score1);
    });
  });
});
