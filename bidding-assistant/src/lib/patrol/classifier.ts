/**
 * P0 巡標 Layer C：分類引擎
 *
 * 根據關鍵字和預算條件，將公告分為四類
 * 純函式，可獨立測試
 */

import {
  PccAnnouncementRaw,
  PatrolItem,
  PatrolCategory,
  ClassificationRule,
} from './types';

/**
 * 預設分類規則
 * 格式：按優先順序檢查，第一個匹配的就是分類結果
 */
export const DEFAULT_CLASSIFICATION_RULES: ClassificationRule[] = [
  {
    category: 'definite',
    keywords: [
      '食農教育',
      '藝術',
      '服務採購',
      '影片製作',
      '行銷計畫',
      '春聯',
    ],
    budgetMax: 1_000_000, // 100萬以下
  },
  {
    category: 'needs_review',
    keywords: [
      '主燈設計',
      '燈節',
      '藝術節',
      '舞台',
      '布置',
      '晚會',
      '演唱會',
    ],
  },
  {
    category: 'skip',
    keywords: ['課後服務'],
  },
];

/**
 * 判斷公告標題是否包含關鍵字
 * 不區分大小寫，支援部分匹配
 */
function matchesKeywords(title: string, keywords: string[]): boolean {
  const lowerTitle = title.toLowerCase();
  return keywords.some((kw) => lowerTitle.includes(kw.toLowerCase()));
}

/**
 * 判斷預算是否符合條件
 */
function matchesBudget(budget: number | null, budgetMax?: number): boolean {
  if (budgetMax === undefined) return true;
  if (budget === null || budget === undefined) return true;
  return budget <= budgetMax;
}

/**
 * 對單筆公告進行分類
 */
export function classifyAnnouncement(
  raw: PccAnnouncementRaw,
  rules: ClassificationRule[] = DEFAULT_CLASSIFICATION_RULES
): PatrolCategory {
  for (const rule of rules) {
    if (
      matchesKeywords(raw.title, rule.keywords) &&
      matchesBudget(raw.budget, rule.budgetMax)
    ) {
      return rule.category;
    }
  }
  // 預設分類
  return 'others';
}

/**
 * 對多筆公告批量分類
 */
export function classifyAnnouncements(
  raw: PccAnnouncementRaw[],
  rules: ClassificationRule[] = DEFAULT_CLASSIFICATION_RULES
): PatrolItem[] {
  return raw.map((item) => ({
    id: `${item.unitId}-${item.jobNumber}`,
    ...item,
    category: classifyAnnouncement(item, rules),
    status: 'new' as const,
  }));
}

/**
 * 按分類分組
 */
export function groupByCategory(items: PatrolItem[]): Record<PatrolCategory, PatrolItem[]> {
  const groups: Record<PatrolCategory, PatrolItem[]> = {
    definite: [],
    needs_review: [],
    skip: [],
    others: [],
  };

  for (const item of items) {
    groups[item.category].push(item);
  }

  return groups;
}

/**
 * 取得分類統計
 */
export function getClassificationStats(
  items: PatrolItem[]
): Record<PatrolCategory, number> {
  const groups = groupByCategory(items);
  return {
    definite: groups.definite.length,
    needs_review: groups.needs_review.length,
    skip: groups.skip.length,
    others: groups.others.length,
  };
}
