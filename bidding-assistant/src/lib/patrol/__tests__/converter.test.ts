/**
 * Layer C 欄位轉換測試
 */

import { describe, it, expect } from 'vitest';
import {
  convertToROCDate,
  convertCategory,
  convertAwardType,
  normalizeTitle,
  truncateDescription,
  convertToNotionInput,
  validateNotionInput,
} from '../converter';
import { PccTenderDetail } from '../types';

const createMockTenderDetail = (overrides?: Partial<PccTenderDetail>): PccTenderDetail => ({
  title: '標案名稱',
  budget: 500000,
  agency: '測試機關',
  deadline: '2026-03-22T17:00:00Z',
  publishDate: '2026-02-22',
  jobNumber: 'TEST-001',
  unitId: 'unit-001',
  url: 'https://example.com/tender/001',
  awardType: '最有利標',
  category: '服務採購',
  contractPeriod: '6個月',
  description: '本案採購內容說明...',
  ...overrides,
});

describe('converter - 欄位轉換', () => {
  describe('convertToROCDate - 民國年轉換', () => {
    it('應該將西元年轉為民國年', () => {
      const result = convertToROCDate('2026-02-22');
      expect(result).toBe('115.02.22');
    });

    it('應該處理 1 月', () => {
      const result = convertToROCDate('2026-01-15');
      expect(result).toBe('115.01.15');
    });

    it('應該處理 12 月', () => {
      const result = convertToROCDate('2026-12-31');
      expect(result).toBe('115.12.31');
    });

    it('應該處理 2025 年（民國 114 年）', () => {
      const result = convertToROCDate('2025-06-15');
      expect(result).toBe('114.06.15');
    });

    it('應該處理無效日期，返回原值', () => {
      const result = convertToROCDate('invalid-date');
      expect(result).toBe('invalid-date');
    });

    it('應該補零到兩位數', () => {
      const result = convertToROCDate('2026-01-01');
      expect(result).toBe('115.01.01');
    });
  });

  describe('convertCategory - 分類轉換', () => {
    it('應該轉換「服務採購」為 services', () => {
      const result = convertCategory('服務採購');
      expect(result).toBe('services');
    });

    it('應該轉換「藝術展覽」為 arts', () => {
      const result = convertCategory('藝術展覽');
      expect(result).toBe('arts');
    });

    it('應該轉換「影像製作」為 media', () => {
      const result = convertCategory('影像製作');
      expect(result).toBe('media');
    });

    it('應該處理未對應的分類，返回原值', () => {
      const result = convertCategory('未知分類');
      expect(result).toBe('未知分類');
    });

    it('應該處理 null 分類', () => {
      const result = convertCategory(null);
      expect(result).toBeUndefined();
    });

    it('應該處理空字串', () => {
      const result = convertCategory('');
      expect(result).toBeUndefined();
    });
  });

  describe('convertAwardType - 決標方式轉換', () => {
    it('應該轉換「最有利標」為 most_advantageous', () => {
      const result = convertAwardType('最有利標');
      expect(result).toBe('most_advantageous');
    });

    it('應該轉換「最低標」為 lowest_price', () => {
      const result = convertAwardType('最低標');
      expect(result).toBe('lowest_price');
    });

    it('應該轉換「定價」為 fixed_price', () => {
      const result = convertAwardType('定價');
      expect(result).toBe('fixed_price');
    });

    it('應該處理 null 值', () => {
      const result = convertAwardType(null);
      expect(result).toBeUndefined();
    });

    it('應該處理未對應的決標方式，返回原值', () => {
      const result = convertAwardType('其他方式');
      expect(result).toBe('其他方式');
    });
  });

  describe('normalizeTitle - 標案名稱清理', () => {
    it('應該移除【】括號', () => {
      const result = normalizeTitle('【文化局】標案名稱');
      expect(result).toBe('標案名稱');
    });

    it('應該移除()括號', () => {
      const result = normalizeTitle('(教育部)文化計畫');
      expect(result).toBe('文化計畫');
    });

    it('應該移除前置空白', () => {
      const result = normalizeTitle('  標案名稱');
      expect(result).toBe('標案名稱');
    });

    it('應該移除尾部空白', () => {
      const result = normalizeTitle('標案名稱  ');
      expect(result).toBe('標案名稱');
    });

    it('應該保留中間的括號', () => {
      const result = normalizeTitle('文化計畫（2026 年版）');
      expect(result).toBe('文化計畫（2026 年版）');
    });

    it('應該處理正常標案名稱', () => {
      const result = normalizeTitle('普通標案名稱');
      expect(result).toBe('普通標案名稱');
    });
  });

  describe('truncateDescription - 摘要截短', () => {
    it('應該截短超長描述', () => {
      const long = 'A'.repeat(600);
      const result = truncateDescription(long, 500);
      expect(result?.length).toBe(503); // 500 + "..."
      expect(result?.endsWith('...')).toBe(true);
    });

    it('應該保留短描述', () => {
      const short = 'A'.repeat(100);
      const result = truncateDescription(short, 500);
      expect(result).toBe(short);
    });

    it('應該處理 null 值', () => {
      const result = truncateDescription(null);
      expect(result).toBeUndefined();
    });

    it('應該處理 undefined 值', () => {
      const result = truncateDescription(undefined);
      expect(result).toBeUndefined();
    });

    it('應該使用預設 maxLength', () => {
      const long = 'A'.repeat(600);
      const result = truncateDescription(long);
      expect(result?.endsWith('...')).toBe(true);
    });

    it('應該支援自訂 maxLength', () => {
      const text = 'A'.repeat(100);
      const result = truncateDescription(text, 50);
      expect(result).toBe('A'.repeat(50) + '...');
    });
  });

  describe('convertToNotionInput - 完整轉換', () => {
    it('應該轉換所有必填欄位', () => {
      const detail = createMockTenderDetail();
      const result = convertToNotionInput(detail);

      expect(result.title).toBe('標案名稱');
      expect(result.jobNumber).toBe('TEST-001');
      expect(result.agency).toBe('測試機關');
      expect(result.budget).toBe(500000);
      expect(result.publishDate).toBe('2026-02-22');
      expect(result.deadline).toBe('2026-03-22T17:00:00Z');
    });

    it('應該轉換決標方式', () => {
      const detail = createMockTenderDetail();
      const result = convertToNotionInput(detail);

      expect(result.awardType).toBe('most_advantageous');
    });

    it('應該轉換分類', () => {
      const detail = createMockTenderDetail();
      const result = convertToNotionInput(detail);

      expect(result.category).toEqual(['services']);
    });

    it('應該截短描述', () => {
      const longDesc = 'A'.repeat(600);
      const detail = createMockTenderDetail({ description: longDesc });
      const result = convertToNotionInput(detail);

      expect(result.description?.length).toBeLessThan(600);
    });

    it('應該處理無決標方式', () => {
      const detail = createMockTenderDetail({ awardType: null });
      const result = convertToNotionInput(detail);

      expect(result.awardType).toBeUndefined();
    });

    it('應該清理標案名稱', () => {
      const detail = createMockTenderDetail({ title: '【機關】  標案名稱  ' });
      const result = convertToNotionInput(detail);

      expect(result.title).toBe('標案名稱');
    });
  });

  describe('validateNotionInput - 驗證', () => {
    it('應該驗證有效輸入', () => {
      const detail = createMockTenderDetail();
      const input = convertToNotionInput(detail);
      const result = validateNotionInput(input);

      expect(result.valid).toBe(true);
      expect(result.missingFields).toHaveLength(0);
    });

    it('應該偵測缺失的 title', () => {
      const input = {
        title: '',
        jobNumber: 'TEST',
        agency: 'AGENCY',
        budget: null,
        publishDate: '2026-02-22',
        deadline: '2026-03-22T17:00:00Z',
      };
      const result = validateNotionInput(input);

      expect(result.valid).toBe(false);
      expect(result.missingFields).toContain('title');
    });

    it('應該偵測缺失的多個欄位', () => {
      const input = {
        title: '',
        jobNumber: '',
        agency: 'AGENCY',
        budget: null,
        publishDate: '2026-02-22',
        deadline: '2026-03-22T17:00:00Z',
      };
      const result = validateNotionInput(input);

      expect(result.valid).toBe(false);
      expect(result.missingFields).toContain('title');
      expect(result.missingFields).toContain('jobNumber');
    });

    it('應該允許 null budget', () => {
      const input = {
        title: '標案',
        jobNumber: 'TEST',
        agency: 'AGENCY',
        budget: null,
        publishDate: '2026-02-22',
        deadline: '2026-03-22T17:00:00Z',
      };
      const result = validateNotionInput(input);

      expect(result.missingFields).not.toContain('budget');
    });

    it('空白字串應視為缺少（trim 後為空）', () => {
      const input = {
        title: '   ',
        jobNumber: '\t\n',
        agency: '有效機關',
        budget: null,
        publishDate: '2026-02-22',
        deadline: '2026-03-22T17:00:00Z',
      };
      const result = validateNotionInput(input);

      expect(result.valid).toBe(false);
      expect(result.missingFields).toContain('title');
      expect(result.missingFields).toContain('jobNumber');
      expect(result.missingFields).not.toContain('agency');
    });
  });
});
