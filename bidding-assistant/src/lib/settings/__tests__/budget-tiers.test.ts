import { describe, it, expect } from 'vitest';
import { classifyBudget, DEFAULT_BUDGET_TIERS, formatTierThreshold } from '../budget-tiers';
import type { BudgetTier } from '../types';

const TIERS = DEFAULT_BUDGET_TIERS;

// ---------------------------------------------------------------------------
// classifyBudget
// ---------------------------------------------------------------------------
describe('classifyBudget', () => {
  it('null 金額回傳 —', () => {
    expect(classifyBudget(null, TIERS)).toBe('—');
  });

  it('空 tiers 回傳 —', () => {
    expect(classifyBudget(500_000, [])).toBe('—');
  });

  it('0 → 小型', () => {
    expect(classifyBudget(0, TIERS)).toBe('小型');
  });

  it('499999 → 小型', () => {
    expect(classifyBudget(499_999, TIERS)).toBe('小型');
  });

  it('500000 → 小型（上邊界）', () => {
    expect(classifyBudget(500_000, TIERS)).toBe('小型');
  });

  it('500001 → 中型', () => {
    expect(classifyBudget(500_001, TIERS)).toBe('中型');
  });

  it('2000000 → 中型（上邊界）', () => {
    expect(classifyBudget(2_000_000, TIERS)).toBe('中型');
  });

  it('2000001 → 大型', () => {
    expect(classifyBudget(2_000_001, TIERS)).toBe('大型');
  });

  it('5000000 → 大型（上邊界）', () => {
    expect(classifyBudget(5_000_000, TIERS)).toBe('大型');
  });

  it('5000001 → 旗艦', () => {
    expect(classifyBudget(5_000_001, TIERS)).toBe('旗艦');
  });

  it('超大金額 → 旗艦', () => {
    expect(classifyBudget(100_000_000, TIERS)).toBe('旗艦');
  });

  it('使用自訂兩個級距', () => {
    const custom: BudgetTier[] = [
      { name: 'A', maxAmount: 1_000_000 },
      { name: 'B', maxAmount: null },
    ];
    expect(classifyBudget(500_000, custom)).toBe('A');
    expect(classifyBudget(2_000_000, custom)).toBe('B');
  });

  it('級距順序不影響結果（unsorted input）', () => {
    const shuffled: BudgetTier[] = [
      { name: '旗艦', maxAmount: null },
      { name: '小型', maxAmount: 500_000 },
      { name: '大型', maxAmount: 5_000_000 },
      { name: '中型', maxAmount: 2_000_000 },
    ];
    expect(classifyBudget(300_000, shuffled)).toBe('小型');
    expect(classifyBudget(1_500_000, shuffled)).toBe('中型');
    expect(classifyBudget(3_000_000, shuffled)).toBe('大型');
    expect(classifyBudget(10_000_000, shuffled)).toBe('旗艦');
  });

  it('單一 null 級距覆蓋所有金額', () => {
    const single: BudgetTier[] = [{ name: '全部', maxAmount: null }];
    expect(classifyBudget(0, single)).toBe('全部');
    expect(classifyBudget(999_999_999, single)).toBe('全部');
  });
});

// ---------------------------------------------------------------------------
// formatTierThreshold
// ---------------------------------------------------------------------------
describe('formatTierThreshold', () => {
  it('null → 不設上限', () => {
    expect(formatTierThreshold(null)).toBe('不設上限');
  });

  it('500000 → 50 萬以下', () => {
    expect(formatTierThreshold(500_000)).toBe('50 萬以下');
  });

  it('2000000 → 200 萬以下', () => {
    expect(formatTierThreshold(2_000_000)).toBe('200 萬以下');
  });

  it('100000000 → 1 億以下', () => {
    expect(formatTierThreshold(100_000_000)).toBe('1 億以下');
  });
});
