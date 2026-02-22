/**
 * Layer C 排除記憶測試
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  initializeExclusionStore,
  addExclusion,
  removeExclusion,
  isExcluded,
  filterExcluded,
  getExcludedItems,
  clearExclusions,
  getExclusionStats,
  ExclusionStore,
} from '../exclusion';
import { PatrolItem } from '../types';

const createMockPatrolItem = (overrides?: Partial<PatrolItem>): PatrolItem => ({
  id: 'unit-001-job-001',
  title: '標案名稱',
  budget: 500000,
  agency: '測試機關',
  deadline: '2026-03-22T17:00:00Z',
  publishDate: '2026-02-22',
  jobNumber: 'job-001',
  unitId: 'unit-001',
  url: 'https://example.com/tender/001',
  category: 'definite',
  status: 'new',
  ...overrides,
});

describe('exclusion - 排除記憶管理', () => {
  let store: ExclusionStore;

  beforeEach(() => {
    store = initializeExclusionStore();
  });

  describe('initializeExclusionStore', () => {
    it('應該初始化空的排除儲存', () => {
      expect(store.excludedIds.size).toBe(0);
      expect(Object.keys(store.excludedAt)).toHaveLength(0);
    });
  });

  describe('addExclusion / removeExclusion', () => {
    it('應該新增排除項', () => {
      addExclusion(store, 'test-id');
      expect(store.excludedIds.has('test-id')).toBe(true);
    });

    it('應該記錄排除時間', () => {
      addExclusion(store, 'test-id');
      expect(store.excludedAt['test-id']).toBeDefined();
      expect(typeof store.excludedAt['test-id']).toBe('number');
    });

    it('應該移除排除項', () => {
      addExclusion(store, 'test-id');
      removeExclusion(store, 'test-id');
      expect(store.excludedIds.has('test-id')).toBe(false);
    });

    it('移除不存在的 id 不應出錯', () => {
      expect(() => removeExclusion(store, 'non-existent')).not.toThrow();
    });

    it('應該支援重複新增同一 id', () => {
      addExclusion(store, 'test-id');
      addExclusion(store, 'test-id');
      expect(store.excludedIds.size).toBe(1);
    });
  });

  describe('isExcluded', () => {
    it('應該回傳 true 對已排除的項目', () => {
      addExclusion(store, 'test-id');
      expect(isExcluded(store, 'test-id')).toBe(true);
    });

    it('應該回傳 false 對未排除的項目', () => {
      expect(isExcluded(store, 'test-id')).toBe(false);
    });
  });

  describe('filterExcluded', () => {
    it('應該過濾掉已排除的公告', () => {
      const items = [
        createMockPatrolItem({ id: 'a' }),
        createMockPatrolItem({ id: 'b' }),
        createMockPatrolItem({ id: 'c' }),
      ];

      addExclusion(store, 'b');
      const result = filterExcluded(items, store);

      expect(result).toHaveLength(2);
      expect(result.map((i) => i.id)).toEqual(['a', 'c']);
    });

    it('應該保留所有未排除的公告', () => {
      const items = [
        createMockPatrolItem({ id: 'a' }),
        createMockPatrolItem({ id: 'b' }),
      ];

      const result = filterExcluded(items, store);
      expect(result).toHaveLength(2);
    });

    it('應該處理空列表', () => {
      const result = filterExcluded([], store);
      expect(result).toHaveLength(0);
    });

    it('應該處理全部排除的情況', () => {
      const items = [
        createMockPatrolItem({ id: 'a' }),
        createMockPatrolItem({ id: 'b' }),
      ];

      addExclusion(store, 'a');
      addExclusion(store, 'b');
      const result = filterExcluded(items, store);
      expect(result).toHaveLength(0);
    });
  });

  describe('getExcludedItems', () => {
    it('應該取得已排除的公告', () => {
      const items = [
        createMockPatrolItem({ id: 'a' }),
        createMockPatrolItem({ id: 'b' }),
        createMockPatrolItem({ id: 'c' }),
      ];

      addExclusion(store, 'b');
      const result = getExcludedItems(items, store);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('b');
    });

    it('應該回傳空陣列當無排除項', () => {
      const items = [createMockPatrolItem({ id: 'a' })];
      const result = getExcludedItems(items, store);
      expect(result).toHaveLength(0);
    });
  });

  describe('clearExclusions', () => {
    it('應該清空所有排除項', () => {
      addExclusion(store, 'a');
      addExclusion(store, 'b');
      addExclusion(store, 'c');

      clearExclusions(store);

      expect(store.excludedIds.size).toBe(0);
      expect(Object.keys(store.excludedAt)).toHaveLength(0);
    });
  });

  describe('getExclusionStats', () => {
    it('應該計算排除統計', () => {
      addExclusion(store, 'a');
      addExclusion(store, 'b');

      const stats = getExclusionStats(store);

      expect(stats.totalExcluded).toBe(2);
      expect(stats.oldestExclusionTime).toBeDefined();
      expect(stats.newestExclusionTime).toBeDefined();
    });

    it('應該處理空排除列表', () => {
      const stats = getExclusionStats(store);

      expect(stats.totalExcluded).toBe(0);
      expect(stats.oldestExclusionTime).toBeNull();
      expect(stats.newestExclusionTime).toBeNull();
    });

    it('最舊時間應該 <= 最新時間', () => {
      addExclusion(store, 'a');
      addExclusion(store, 'b');

      const stats = getExclusionStats(store);

      expect(stats.oldestExclusionTime!).toBeLessThanOrEqual(stats.newestExclusionTime!);
    });
  });
});
