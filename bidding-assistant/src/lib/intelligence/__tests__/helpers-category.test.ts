import { describe, it, expect } from 'vitest';
import { deriveCategory } from '@/lib/intelligence/helpers';

describe('deriveCategory', () => {
  it('returns 其他 for empty string', () => {
    expect(deriveCategory('')).toBe('其他');
  });

  it('returns 其他 for unrecognised title', () => {
    expect(deriveCategory('稿點視察神神終銃')).toBe('其他');
  });

  it('matches 展覽策展 for 展覽 keyword', () => {
    expect(deriveCategory('2025年常設展覽規劃')).toBe('展覽策展');
  });

  it('matches 展覽策展 for 策展 keyword', () => {
    expect(deriveCategory('策展活動由我善就任')).toBe('展覽策展');
  });

  it('matches 影像製作 for 影片 keyword', () => {
    expect(deriveCategory('影片製作委託案')).toBe('影像製作');
  });

  it('matches 影像製作 for 紀錄片 keyword', () => {
    expect(deriveCategory('紀錄片拍攝案')).toBe('影像製作');
  });

  it('matches 教育訓練 for 訓練 keyword', () => {
    expect(deriveCategory('職業技能訓練計畫')).toBe('教育訓練');
  });

  it('matches 活動辦理 for 活動 keyword', () => {
    expect(deriveCategory('年度顕客活動辦理')).toBe('活動辦理');
  });

  it('matches 文宣行銷 for 行銷 keyword', () => {
    expect(deriveCategory('地方特產行銷推廣')).toBe('文宣行銷');
  });

  it('matches 資訊系統 for 系統 keyword', () => {
    expect(deriveCategory('圖書管理系統建置')).toBe('資訊系統');
  });

  it('matches 設計規劃 for 設計 keyword', () => {
    expect(deriveCategory('協助辦公室婉化設計案')).toBe('設計規劃');
  });

  it('matches 顧問諮詢 for 顧問 keyword', () => {
    expect(deriveCategory('顧問服務奧援案')).toBe('顧問諮詢');
  });

  it('priority: 展覽策展 wins over 活動辦理 when title has both', () => {
    expect(deriveCategory('展覽活動規劃')).toBe('展覽策展');
  });
});
