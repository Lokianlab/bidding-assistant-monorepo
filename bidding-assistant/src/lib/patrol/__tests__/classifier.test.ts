/**
 * Layer C 分類引擎測試
 */

import { describe, it, expect } from 'vitest';
import {
  classifyAnnouncement,
  classifyAnnouncements,
  groupByCategory,
  getClassificationStats,
  DEFAULT_CLASSIFICATION_RULES,
} from '../classifier';
import { PccAnnouncementRaw } from '../types';

const createMockAnnouncement = (overrides?: Partial<PccAnnouncementRaw>): PccAnnouncementRaw => ({
  title: '標案名稱',
  budget: 500000,
  agency: '測試機關',
  deadline: '2026-03-22T17:00:00Z',
  publishDate: '2026-02-22',
  jobNumber: 'TEST-001',
  unitId: 'unit-001',
  url: 'https://example.com/tender/001',
  ...overrides,
});

describe('classifier - 分類引擎', () => {
  describe('classifyAnnouncement - 單筆分類', () => {
    it('應該分類「食農教育」標案為 definite', () => {
      const item = createMockAnnouncement({ title: '食農教育推廣計畫' });
      const result = classifyAnnouncement(item);
      expect(result).toBe('definite');
    });

    it('應該分類「藝術」標案為 definite', () => {
      const item = createMockAnnouncement({ title: '藝術展覽策展服務' });
      const result = classifyAnnouncement(item);
      expect(result).toBe('definite');
    });

    it('應該分類「服務採購」且預算 100 萬以下為 definite', () => {
      const item = createMockAnnouncement({
        title: '行政服務採購',
        budget: 1000000,
      });
      const result = classifyAnnouncement(item);
      expect(result).toBe('definite');
    });

    it('應該分類「服務採購」但預算超過 100 萬為 others', () => {
      const item = createMockAnnouncement({
        title: '行政服務採購',
        budget: 1500000,
      });
      const result = classifyAnnouncement(item);
      expect(result).toBe('others');
    });

    it('應該分類「主燈設計」為 needs_review', () => {
      const item = createMockAnnouncement({ title: '元宵主燈設計' });
      const result = classifyAnnouncement(item);
      expect(result).toBe('needs_review');
    });

    it('應該分類「課後服務」為 skip', () => {
      const item = createMockAnnouncement({ title: '學校課後服務' });
      const result = classifyAnnouncement(item);
      expect(result).toBe('skip');
    });

    it('應該分類無匹配的標案為 others', () => {
      const item = createMockAnnouncement({ title: '工程建築案' });
      const result = classifyAnnouncement(item);
      expect(result).toBe('others');
    });

    it('應該分類大小寫不敏感', () => {
      const item = createMockAnnouncement({ title: '食農教育PLAN' });
      const result = classifyAnnouncement(item);
      expect(result).toBe('definite');
    });

    it('應該處理 null 預算', () => {
      const item = createMockAnnouncement({
        title: '藝術',
        budget: null,
      });
      const result = classifyAnnouncement(item);
      expect(result).toBe('definite');
    });

    it('應該支援自訂規則', () => {
      const item = createMockAnnouncement({ title: 'Custom Project' });
      const customRules = [
        {
          category: 'definite' as const,
          keywords: ['Custom'],
        },
      ];
      const result = classifyAnnouncement(item, customRules);
      expect(result).toBe('definite');
    });
  });

  describe('classifyAnnouncements - 批量分類', () => {
    it('應該分類多筆公告', () => {
      const items = [
        createMockAnnouncement({ title: '食農教育' }),
        createMockAnnouncement({ title: '課後服務' }),
        createMockAnnouncement({ title: '其他工程' }),
      ];

      const result = classifyAnnouncements(items);

      expect(result).toHaveLength(3);
      expect(result[0].category).toBe('definite');
      expect(result[1].category).toBe('skip');
      expect(result[2].category).toBe('others');
    });

    it('應該設定每筆為 new 狀態', () => {
      const items = [createMockAnnouncement()];
      const result = classifyAnnouncements(items);
      expect(result[0].status).toBe('new');
    });

    it('應該生成正確的 id 格式', () => {
      const items = [
        createMockAnnouncement({
          unitId: 'unit-123',
          jobNumber: 'job-456',
        }),
      ];
      const result = classifyAnnouncements(items);
      expect(result[0].id).toBe('unit-123-job-456');
    });

    it('應該處理空陣列', () => {
      const result = classifyAnnouncements([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('groupByCategory - 分組', () => {
    it('應該正確分組公告', () => {
      const items = [
        createMockAnnouncement({ title: '食農教育' }),
        createMockAnnouncement({ title: '課後服務' }),
        createMockAnnouncement({ title: '其他' }),
        createMockAnnouncement({ title: '藝術' }),
      ];

      const classified = classifyAnnouncements(items);
      const groups = groupByCategory(classified);

      expect(groups.definite).toHaveLength(2);
      expect(groups.skip).toHaveLength(1);
      expect(groups.others).toHaveLength(1);
    });

    it('應該返回所有四個分類的陣列', () => {
      const items = [createMockAnnouncement()];
      const classified = classifyAnnouncements(items);
      const groups = groupByCategory(classified);

      expect(groups).toHaveProperty('definite');
      expect(groups).toHaveProperty('needs_review');
      expect(groups).toHaveProperty('skip');
      expect(groups).toHaveProperty('others');
    });

    it('應該處理空分類的情況', () => {
      const items = [createMockAnnouncement({ title: '食農教育' })];
      const classified = classifyAnnouncements(items);
      const groups = groupByCategory(classified);

      expect(groups.skip).toHaveLength(0);
      expect(groups.needs_review).toHaveLength(0);
    });
  });

  describe('getClassificationStats - 統計', () => {
    it('應該計算正確的分類統計', () => {
      const items = [
        createMockAnnouncement({ title: '食農教育' }),
        createMockAnnouncement({ title: '食農教育' }),
        createMockAnnouncement({ title: '課後服務' }),
        createMockAnnouncement({ title: '其他' }),
      ];

      const classified = classifyAnnouncements(items);
      const stats = getClassificationStats(classified);

      expect(stats.definite).toBe(2);
      expect(stats.skip).toBe(1);
      expect(stats.others).toBe(1);
      expect(stats.needs_review).toBe(0);
    });

    it('應該處理空列表', () => {
      const stats = getClassificationStats([]);
      expect(stats.definite).toBe(0);
      expect(stats.skip).toBe(0);
      expect(stats.others).toBe(0);
      expect(stats.needs_review).toBe(0);
    });

    it('應該計算總數', () => {
      const items = [
        createMockAnnouncement({ title: '食農教育' }),
        createMockAnnouncement({ title: '課後服務' }),
        createMockAnnouncement({ title: '其他' }),
      ];

      const classified = classifyAnnouncements(items);
      const stats = getClassificationStats(classified);

      const total = stats.definite + stats.skip + stats.others + stats.needs_review;
      expect(total).toBe(3);
    });
  });

  describe('預設規則驗證', () => {
    it('應該有 definite 規則', () => {
      const definiteRule = DEFAULT_CLASSIFICATION_RULES.find((r) => r.category === 'definite');
      expect(definiteRule).toBeDefined();
      expect(definiteRule?.keywords.length).toBeGreaterThan(0);
    });

    it('應該有 needs_review 規則', () => {
      const reviewRule = DEFAULT_CLASSIFICATION_RULES.find((r) => r.category === 'needs_review');
      expect(reviewRule).toBeDefined();
      expect(reviewRule?.keywords.length).toBeGreaterThan(0);
    });

    it('應該有 skip 規則', () => {
      const skipRule = DEFAULT_CLASSIFICATION_RULES.find((r) => r.category === 'skip');
      expect(skipRule).toBeDefined();
      expect(skipRule?.keywords.length).toBeGreaterThan(0);
    });

    it('definite 規則應該有預算上限', () => {
      const definiteRule = DEFAULT_CLASSIFICATION_RULES.find((r) => r.category === 'definite');
      expect(definiteRule?.budgetMax).toBe(1000000);
    });
  });
});
