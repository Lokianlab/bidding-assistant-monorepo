/**
 * Layer C 型別橋接測試
 */

import { describe, it, expect } from 'vitest';
import {
  scanTenderToRaw,
  scanResultToPatrolItem,
  scanResultsToPatrolItems,
  patrolCategoryToKeyword,
  keywordCategoryToPatrol,
} from '../bridge';
import type { ScanTender, ScanResult } from '../../scan/types';

const createMockScanTender = (overrides?: Partial<ScanTender>): ScanTender => ({
  title: '食農教育推廣計畫',
  unit: '農業委員會',
  jobNumber: 'AGR-2026-001',
  budget: 800000,
  deadline: '2026-03-22T17:00:00Z',
  publishDate: '2026-02-22',
  url: 'https://web.pcc.gov.tw/tps/main/pms/tps/atm/atmHistoryAction.do?unitId=3.15.26&jobNumber=AGR-2026-001',
  ...overrides,
});

const createMockScanResult = (overrides?: Partial<ScanResult>): ScanResult => ({
  tender: createMockScanTender(),
  classification: {
    category: 'must',
    matchedLabel: '食農教育',
    matchedKeywords: ['食農教育'],
  },
  ...overrides,
});

describe('bridge - 型別橋接', () => {
  describe('scanTenderToRaw', () => {
    it('應該轉換 ScanTender 為 PccAnnouncementRaw', () => {
      const tender = createMockScanTender();
      const raw = scanTenderToRaw(tender);

      expect(raw.title).toBe('食農教育推廣計畫');
      expect(raw.agency).toBe('農業委員會');
      expect(raw.jobNumber).toBe('AGR-2026-001');
      expect(raw.budget).toBe(800000);
      expect(raw.deadline).toBe('2026-03-22T17:00:00Z');
      expect(raw.publishDate).toBe('2026-02-22');
      expect(raw.url).toContain('pcc.gov.tw');
    });

    it('應該將 unit 映射為 agency', () => {
      const tender = createMockScanTender({ unit: '教育部' });
      const raw = scanTenderToRaw(tender);
      expect(raw.agency).toBe('教育部');
    });

    it('應該從 URL 提取 unitId', () => {
      const tender = createMockScanTender({
        url: 'https://web.pcc.gov.tw/tps/main?unitId=3.15.26&jobNumber=001',
      });
      const raw = scanTenderToRaw(tender);
      expect(raw.unitId).toBe('3.15.26');
    });

    it('應該處理無 unitId 的 URL', () => {
      const tender = createMockScanTender({
        url: 'https://example.com/tender/001',
      });
      const raw = scanTenderToRaw(tender);
      expect(raw.unitId).toBe('');
    });

    it('應該保留 budget=0（NT$0 是有效值）', () => {
      const tender = createMockScanTender({ budget: 0 });
      const raw = scanTenderToRaw(tender);
      expect(raw.budget).toBe(0);
    });

    it('應該將 undefined budget 轉為 null', () => {
      const tender = createMockScanTender({ budget: undefined });
      const raw = scanTenderToRaw(tender);
      expect(raw.budget).toBeNull();
    });
  });

  describe('scanResultToPatrolItem', () => {
    it('應該轉換 must → definite', () => {
      const result = createMockScanResult({
        classification: {
          category: 'must',
          matchedLabel: '推薦',
          matchedKeywords: ['食農教育'],
        },
      });
      const item = scanResultToPatrolItem(result);
      expect(item.category).toBe('definite');
    });

    it('應該轉換 review → needs_review', () => {
      const result = createMockScanResult({
        classification: {
          category: 'review',
          matchedLabel: '需要看',
          matchedKeywords: ['燈節'],
        },
      });
      const item = scanResultToPatrolItem(result);
      expect(item.category).toBe('needs_review');
    });

    it('應該轉換 exclude → skip', () => {
      const result = createMockScanResult({
        classification: {
          category: 'exclude',
          matchedLabel: '排除',
          matchedKeywords: ['課後服務'],
        },
      });
      const item = scanResultToPatrolItem(result);
      expect(item.category).toBe('skip');
    });

    it('應該轉換 other → others', () => {
      const result = createMockScanResult({
        classification: {
          category: 'other',
          matchedLabel: '其他',
          matchedKeywords: [],
        },
      });
      const item = scanResultToPatrolItem(result);
      expect(item.category).toBe('others');
    });

    it('應該設定 status 為 new', () => {
      const result = createMockScanResult();
      const item = scanResultToPatrolItem(result);
      expect(item.status).toBe('new');
    });

    it('應該生成正確的 id', () => {
      const result = createMockScanResult({
        tender: createMockScanTender({
          url: 'https://web.pcc.gov.tw/tps?unitId=XYZ&jobNumber=001',
          jobNumber: 'JOB-001',
        }),
      });
      const item = scanResultToPatrolItem(result);
      expect(item.id).toBe('XYZ-JOB-001');
    });
  });

  describe('scanResultsToPatrolItems', () => {
    it('應該批量轉換', () => {
      const results = [
        createMockScanResult({
          classification: { category: 'must', matchedLabel: '', matchedKeywords: [] },
        }),
        createMockScanResult({
          classification: { category: 'exclude', matchedLabel: '', matchedKeywords: [] },
        }),
      ];
      const items = scanResultsToPatrolItems(results);

      expect(items).toHaveLength(2);
      expect(items[0].category).toBe('definite');
      expect(items[1].category).toBe('skip');
    });

    it('應該處理空陣列', () => {
      const items = scanResultsToPatrolItems([]);
      expect(items).toHaveLength(0);
    });
  });

  describe('分類對照', () => {
    it('patrolCategoryToKeyword 應該正確反向轉換', () => {
      expect(patrolCategoryToKeyword('definite')).toBe('must');
      expect(patrolCategoryToKeyword('needs_review')).toBe('review');
      expect(patrolCategoryToKeyword('skip')).toBe('exclude');
      expect(patrolCategoryToKeyword('others')).toBe('other');
    });

    it('keywordCategoryToPatrol 應該正確正向轉換', () => {
      expect(keywordCategoryToPatrol('must')).toBe('definite');
      expect(keywordCategoryToPatrol('review')).toBe('needs_review');
      expect(keywordCategoryToPatrol('exclude')).toBe('skip');
      expect(keywordCategoryToPatrol('other')).toBe('others');
    });

    it('正反轉換應該互為反函式', () => {
      const categories: Array<'definite' | 'needs_review' | 'skip' | 'others'> = [
        'definite', 'needs_review', 'skip', 'others',
      ];
      for (const cat of categories) {
        expect(keywordCategoryToPatrol(patrolCategoryToKeyword(cat))).toBe(cat);
      }
    });
  });
});
