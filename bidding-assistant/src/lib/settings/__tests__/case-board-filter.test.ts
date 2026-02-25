import { describe, it, expect } from 'vitest';
import {
  buildNotionFilter,
  DEFAULT_CASE_BOARD_FILTER,
} from '../case-board-filter';
import type { CaseBoardFilterSettings } from '../types';

describe('buildNotionFilter', () => {
  it('空 conditions 回傳 {}', () => {
    const s: CaseBoardFilterSettings = { logic: 'and', conditions: [] };
    expect(buildNotionFilter(s)).toEqual({});
  });

  it('單一 checkbox 條件（確定協作 = true）', () => {
    const s: CaseBoardFilterSettings = {
      logic: 'and',
      conditions: [{ id: '1', property: '確定協作', operator: 'equals', value: true }],
    };
    expect(buildNotionFilter(s)).toEqual({
      property: '確定協作',
      checkbox: { equals: true },
    });
  });

  it('單一 status 條件（進程 → 標案進程）', () => {
    const s: CaseBoardFilterSettings = {
      logic: 'and',
      conditions: [{ id: '1', property: '進程', operator: 'equals', value: '備標中' }],
    };
    expect(buildNotionFilter(s)).toEqual({
      property: '標案進程',
      status: { equals: '備標中' },
    });
  });

  it('單一 date 條件（截標 → 截標時間）', () => {
    const s: CaseBoardFilterSettings = {
      logic: 'and',
      conditions: [{ id: '1', property: '截標', operator: 'before', value: '2026-12-31' }],
    };
    expect(buildNotionFilter(s)).toEqual({
      property: '截標時間',
      date: { before: '2026-12-31' },
    });
  });

  it('number 條件（預算 → 預算金額）', () => {
    const s: CaseBoardFilterSettings = {
      logic: 'and',
      conditions: [{ id: '1', property: '預算', operator: 'greater_than', value: 1_000_000 }],
    };
    expect(buildNotionFilter(s)).toEqual({
      property: '預算金額',
      number: { greater_than: 1_000_000 },
    });
  });

  it('is_empty 不帶 value，自動填 true', () => {
    const s: CaseBoardFilterSettings = {
      logic: 'and',
      conditions: [{ id: '1', property: '截標', operator: 'is_empty' }],
    };
    expect(buildNotionFilter(s)).toEqual({
      property: '截標時間',
      date: { is_empty: true },
    });
  });

  it('多條件 AND → 包在 and 陣列', () => {
    const s: CaseBoardFilterSettings = {
      logic: 'and',
      conditions: [
        { id: '1', property: '確定協作', operator: 'equals', value: true },
        { id: '2', property: '進程', operator: 'equals', value: '備標中' },
      ],
    };
    const result = buildNotionFilter(s) as { and: unknown[] };
    expect(result.and).toHaveLength(2);
  });

  it('多條件 OR → 包在 or 陣列', () => {
    const s: CaseBoardFilterSettings = {
      logic: 'or',
      conditions: [
        { id: '1', property: '確定協作', operator: 'equals', value: true },
        { id: '2', property: '進程', operator: 'equals', value: '備標中' },
      ],
    };
    const result = buildNotionFilter(s) as { or: unknown[] };
    expect(result.or).toHaveLength(2);
  });

  it('未知 property 被略過', () => {
    const s: CaseBoardFilterSettings = {
      logic: 'and',
      conditions: [{ id: '1', property: '不存在的欄位', operator: 'equals', value: 'foo' }],
    };
    expect(buildNotionFilter(s)).toEqual({});
  });

  it('DEFAULT_CASE_BOARD_FILTER 產生 確定協作 = true', () => {
    expect(buildNotionFilter(DEFAULT_CASE_BOARD_FILTER)).toEqual({
      property: '確定協作',
      checkbox: { equals: true },
    });
  });

  it('rich_text contains', () => {
    const s: CaseBoardFilterSettings = {
      logic: 'and',
      conditions: [{ id: '1', property: '名稱', operator: 'contains', value: '展覽' }],
    };
    expect(buildNotionFilter(s)).toEqual({
      property: '標案名稱',
      rich_text: { contains: '展覽' },
    });
  });

  it('multi_select contains', () => {
    const s: CaseBoardFilterSettings = {
      logic: 'and',
      conditions: [{ id: '1', property: '標案類型', operator: 'contains', value: '展覽策展' }],
    };
    expect(buildNotionFilter(s)).toEqual({
      property: '標案類型',
      multi_select: { contains: '展覽策展' },
    });
  });
});
