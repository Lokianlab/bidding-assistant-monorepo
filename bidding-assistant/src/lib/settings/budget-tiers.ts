import type { BudgetTier } from './types';

export const DEFAULT_BUDGET_TIERS: BudgetTier[] = [
  { name: '小型', maxAmount: 500_000 },
  { name: '中型', maxAmount: 2_000_000 },
  { name: '大型', maxAmount: 5_000_000 },
  { name: '旗艦', maxAmount: null },
];

/**
 * 根據預算金額和設定的級距判斷規模標籤。
 * 依 maxAmount 升序排列；null 表示「不設上限」（最後一個）。
 */
export function classifyBudget(amount: number | null, tiers: BudgetTier[]): string {
  if (amount === null || tiers.length === 0) return '—';
  const sorted = [...tiers].sort((a, b) => {
    if (a.maxAmount === null) return 1;
    if (b.maxAmount === null) return -1;
    return a.maxAmount - b.maxAmount;
  });
  const tier = sorted.find(t => t.maxAmount === null || amount <= t.maxAmount);
  return tier?.name ?? '—';
}

/** 格式化上限金額為顯示文字（UI 用） */
export function formatTierThreshold(maxAmount: number | null): string {
  if (maxAmount === null) return '不設上限';
  if (maxAmount >= 100_000_000) return `${maxAmount / 100_000_000} 億以下`;
  return `${Math.round(maxAmount / 10_000)} 萬以下`;
}
