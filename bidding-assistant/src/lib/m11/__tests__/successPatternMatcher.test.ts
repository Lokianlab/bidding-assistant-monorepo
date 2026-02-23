// M11 successPatternMatcher 測試

import { describe, it, expect } from 'vitest';
import {
  calculatePatternConfidence,
  identifyPatterns,
  filterByConfidence,
  filterByCategory,
  categorizePattern,
  sortByConfidence,
  calculatePatternDiversity,
  validatePattern,
  generatePatternSuggestion,
  extractCommonPatterns
} from '../successPatternMatcher';
import type { SuccessPattern } from '../types';
import { CONFIDENCE_THRESHOLD } from '../constants';

describe('M11 Success Pattern Matcher', () => {
  describe('calculatePatternConfidence', () => {
    it('應計算完美指標的置信度接近 1', () => {
      const confidence = calculatePatternConfidence({
        performanceScore: 100,
        budgetVariance: 0,
        scheduleVariance: 0
      });
      expect(confidence).toBeGreaterThan(0.95);
    });

    it('應計算差指標的置信度接近 0', () => {
      const confidence = calculatePatternConfidence({
        performanceScore: 0,
        budgetVariance: 100,
        scheduleVariance: 100
      });
      expect(confidence).toBeLessThan(0.1);
    });

    it('應在中等指標下返回 0.5-0.7 的置信度', () => {
      const confidence = calculatePatternConfidence({
        performanceScore: 50,
        budgetVariance: 25,
        scheduleVariance: 20
      });
      expect(confidence).toBeGreaterThan(0.3);
      expect(confidence).toBeLessThan(0.8);
    });

    it('應對性能評分給予更高權重', () => {
      const highPerf = calculatePatternConfidence({
        performanceScore: 90,
        budgetVariance: 30,
        scheduleVariance: 30
      });
      const lowPerf = calculatePatternConfidence({
        performanceScore: 30,
        budgetVariance: 30,
        scheduleVariance: 30
      });
      expect(highPerf).toBeGreaterThan(lowPerf);
    });

    it('應限制置信度在 0-1 範圍', () => {
      const result = calculatePatternConfidence({
        performanceScore: 200,
        budgetVariance: -200,
        scheduleVariance: -200
      });
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(1);
    });
  });

  describe('identifyPatterns', () => {
    it('應識別流程卓越模式（效能 >= 85%）', () => {
      const patterns = identifyPatterns({
        performanceScore: 90,
        budgetVariance: 20,
        scheduleVariance: 20
      });

      const processExcellence = patterns.find(p => p.id === 'pat-process-excellence');
      expect(processExcellence).toBeDefined();
      expect(processExcellence?.category).toBe('process');
    });

    it('應識別資源控制模式（預算差異 <= 10%）', () => {
      const patterns = identifyPatterns({
        performanceScore: 70,
        budgetVariance: 8,
        scheduleVariance: 20
      });

      const resourceControl = patterns.find(p => p.id === 'pat-resource-control');
      expect(resourceControl).toBeDefined();
      expect(resourceControl?.category).toBe('resource');
    });

    it('應識別進度控制模式（進度差異 <= 10%）', () => {
      const patterns = identifyPatterns({
        performanceScore: 70,
        budgetVariance: 20,
        scheduleVariance: 5
      });

      const scheduleControl = patterns.find(p => p.id === 'pat-schedule-control');
      expect(scheduleControl).toBeDefined();
      expect(scheduleControl?.category).toBe('process');
    });

    it('應識別綜合成功模式（全面優秀）', () => {
      const patterns = identifyPatterns({
        performanceScore: 95,
        budgetVariance: 5,
        scheduleVariance: 5
      });

      const comprehensive = patterns.find(p => p.id === 'pat-comprehensive-success');
      expect(comprehensive).toBeDefined();
      expect(comprehensive?.confidence).toBeGreaterThan(0.9);
    });

    it('應識別團隊協作模式（效能 >= 80% AND 進度 <= 15%）', () => {
      const patterns = identifyPatterns({
        performanceScore: 85,
        budgetVariance: 25,
        scheduleVariance: 10
      });

      const teamCollab = patterns.find(p => p.id === 'pat-team-collaboration');
      expect(teamCollab).toBeDefined();
      expect(teamCollab?.category).toBe('team');
    });

    it('應在低效能下返回空陣列', () => {
      const patterns = identifyPatterns({
        performanceScore: 40,
        budgetVariance: 50,
        scheduleVariance: 50
      });

      expect(patterns.length).toBe(0);
    });

    it('應在多個條件滿足時識別多個模式', () => {
      const patterns = identifyPatterns({
        performanceScore: 92,
        budgetVariance: 8,
        scheduleVariance: 7
      });

      expect(patterns.length).toBeGreaterThan(1);
    });

    it('應設置合理的置信度', () => {
      const patterns = identifyPatterns({
        performanceScore: 88,
        budgetVariance: 12,
        scheduleVariance: 15
      });

      patterns.forEach(pattern => {
        expect(pattern.confidence).toBeGreaterThan(0);
        expect(pattern.confidence).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('filterByConfidence', () => {
    it('應按預設閾值篩選模式', () => {
      const patterns: SuccessPattern[] = [
        {
          id: 'p1',
          name: '高置信',
          category: 'process',
          description: '測試',
          successMetrics: [],
          applicableTo: [],
          confidence: 0.95,
          evidence: []
        },
        {
          id: 'p2',
          name: '低置信',
          category: 'resource',
          description: '測試',
          successMetrics: [],
          applicableTo: [],
          confidence: 0.7,
          evidence: []
        }
      ];

      const result = filterByConfidence(patterns);
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('p1');
    });

    it('應按自訂閾值篩選', () => {
      const patterns: SuccessPattern[] = [
        {
          id: 'p1',
          name: '測試1',
          category: 'process',
          description: '測試',
          successMetrics: [],
          applicableTo: [],
          confidence: 0.8,
          evidence: []
        },
        {
          id: 'p2',
          name: '測試2',
          category: 'resource',
          description: '測試',
          successMetrics: [],
          applicableTo: [],
          confidence: 0.6,
          evidence: []
        }
      ];

      const result = filterByConfidence(patterns, 0.7);
      expect(result.length).toBe(1);
    });

    it('應返回空陣列如果沒有符合的模式', () => {
      const patterns: SuccessPattern[] = [
        {
          id: 'p1',
          name: '測試',
          category: 'process',
          description: '測試',
          successMetrics: [],
          applicableTo: [],
          confidence: 0.5,
          evidence: []
        }
      ];

      const result = filterByConfidence(patterns, 0.8);
      expect(result).toEqual([]);
    });
  });

  describe('filterByCategory', () => {
    it('應篩選特定分類的模式', () => {
      const patterns: SuccessPattern[] = [
        {
          id: 'p1',
          name: '流程1',
          category: 'process',
          description: '測試',
          successMetrics: [],
          applicableTo: [],
          confidence: 0.9,
          evidence: []
        },
        {
          id: 'p2',
          name: '資源1',
          category: 'resource',
          description: '測試',
          successMetrics: [],
          applicableTo: [],
          confidence: 0.9,
          evidence: []
        }
      ];

      const result = filterByCategory(patterns, 'process');
      expect(result.length).toBe(1);
      expect(result[0].category).toBe('process');
    });
  });

  describe('categorizePattern', () => {
    it('應返回模式的分類', () => {
      const pattern: SuccessPattern = {
        id: 'p1',
        name: '測試',
        category: 'resource',
        description: '測試',
        successMetrics: [],
        applicableTo: [],
        confidence: 0.9,
        evidence: []
      };

      expect(categorizePattern(pattern)).toBe('resource');
    });
  });

  describe('sortByConfidence', () => {
    it('應按置信度降序排序', () => {
      const patterns: SuccessPattern[] = [
        {
          id: 'p1',
          name: '測試1',
          category: 'process',
          description: '測試',
          successMetrics: [],
          applicableTo: [],
          confidence: 0.7,
          evidence: []
        },
        {
          id: 'p2',
          name: '測試2',
          category: 'resource',
          description: '測試',
          successMetrics: [],
          applicableTo: [],
          confidence: 0.95,
          evidence: []
        },
        {
          id: 'p3',
          name: '測試3',
          category: 'team',
          description: '測試',
          successMetrics: [],
          applicableTo: [],
          confidence: 0.85,
          evidence: []
        }
      ];

      const result = sortByConfidence(patterns);
      expect(result[0].confidence).toBe(0.95);
      expect(result[1].confidence).toBe(0.85);
      expect(result[2].confidence).toBe(0.7);
    });

    it('應不修改原陣列', () => {
      const patterns: SuccessPattern[] = [
        {
          id: 'p1',
          name: '測試',
          category: 'process',
          description: '測試',
          successMetrics: [],
          applicableTo: [],
          confidence: 0.5,
          evidence: []
        }
      ];

      const original = [...patterns];
      sortByConfidence(patterns);
      expect(patterns).toEqual(original);
    });
  });

  describe('calculatePatternDiversity', () => {
    it('應計算涵蓋所有分類的多樣性為 1', () => {
      const patterns: SuccessPattern[] = [
        { id: 'p1', name: '1', category: 'process', description: '', successMetrics: [], applicableTo: [], confidence: 0.9, evidence: [] },
        { id: 'p2', name: '2', category: 'team', description: '', successMetrics: [], applicableTo: [], confidence: 0.9, evidence: [] },
        { id: 'p3', name: '3', category: 'resource', description: '', successMetrics: [], applicableTo: [], confidence: 0.9, evidence: [] },
        { id: 'p4', name: '4', category: 'risk-mitigation', description: '', successMetrics: [], applicableTo: [], confidence: 0.9, evidence: [] }
      ];

      const diversity = calculatePatternDiversity(patterns);
      expect(diversity).toBe(1);
    });

    it('應計算只涵蓋一個分類的多樣性為 0.25', () => {
      const patterns: SuccessPattern[] = [
        { id: 'p1', name: '1', category: 'process', description: '', successMetrics: [], applicableTo: [], confidence: 0.9, evidence: [] },
        { id: 'p2', name: '2', category: 'process', description: '', successMetrics: [], applicableTo: [], confidence: 0.9, evidence: [] }
      ];

      const diversity = calculatePatternDiversity(patterns);
      expect(diversity).toBe(0.25);
    });
  });

  describe('validatePattern', () => {
    it('應通過有效模式的驗證', () => {
      const pattern: SuccessPattern = {
        id: 'p1',
        name: '測試',
        category: 'process',
        description: '測試描述',
        successMetrics: ['指標1'],
        applicableTo: [],
        confidence: 0.9,
        evidence: ['證據1']
      };

      const result = validatePattern(pattern);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('應拒絕缺少欄位的模式', () => {
      const pattern: Partial<SuccessPattern> = {
        id: 'p1',
        category: 'process'
      };

      const result = validatePattern(pattern);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('應驗證置信度範圍', () => {
      const pattern: Partial<SuccessPattern> = {
        id: 'p1',
        name: '測試',
        category: 'process',
        description: '測試',
        successMetrics: ['指標'],
        evidence: ['證據'],
        confidence: 1.5
      };

      const result = validatePattern(pattern);
      expect(result.valid).toBe(false);
    });
  });

  describe('generatePatternSuggestion', () => {
    it('應生成格式化的模式建議', () => {
      const pattern: SuccessPattern = {
        id: 'p1',
        name: '流程卓越',
        category: 'process',
        description: '超高效能的流程設計',
        successMetrics: [],
        applicableTo: [],
        confidence: 0.95,
        evidence: []
      };

      const suggestion = generatePatternSuggestion(pattern);
      expect(suggestion).toContain('流程卓越');
      expect(suggestion).toContain('95%');
      expect(suggestion).toContain('超高效能');
    });
  });

  describe('extractCommonPatterns', () => {
    it('應從多個案件的模式中提煉共通模式', () => {
      const pattern1: SuccessPattern = {
        id: 'p1',
        name: '測試',
        category: 'process',
        description: '測試',
        successMetrics: [],
        applicableTo: [],
        confidence: 0.8,
        evidence: []
      };

      const allPatterns = [
        [pattern1],
        [pattern1], // 重複
        [
          {
            ...pattern1,
            id: 'p2',
            confidence: 0.7
          }
        ]
      ];

      const result = extractCommonPatterns(allPatterns);
      const p1 = result.find(p => p.id === 'p1');
      expect(p1?.confidence).toBeGreaterThan(0.8);
    });

    it('應按置信度排序結果', () => {
      const allPatterns = [
        [
          {
            id: 'p1',
            name: '1',
            category: 'process' as const,
            description: '',
            successMetrics: [],
            applicableTo: [],
            confidence: 0.5,
            evidence: []
          }
        ],
        [
          {
            id: 'p2',
            name: '2',
            category: 'resource' as const,
            description: '',
            successMetrics: [],
            applicableTo: [],
            confidence: 0.9,
            evidence: []
          }
        ]
      ];

      const result = extractCommonPatterns(allPatterns);
      expect(result[0].confidence).toBeGreaterThan(result[1].confidence);
    });
  });
});
