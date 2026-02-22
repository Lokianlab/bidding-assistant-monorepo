/**
 * P0 巡標 Layer C：分類引擎
 *
 * 根據關鍵字和預算條件，將公告分為四類
 * 純函式，可獨立測試
 *
 * 分類規則衍生自 scan/constants 的 DEFAULT_KEYWORD_RULES（SSOT）
 */

import {
  PccAnnouncementRaw,
  PatrolItem,
  PatrolCategory,
  ClassificationRule,
} from './types';
import { DEFAULT_KEYWORD_RULES } from '@/lib/scan/constants';
import { keywordCategoryToPatrol } from './bridge';

/**
 * 從 W01 scan 的 KeywordRule[] 轉換為 P0 patrol 的 ClassificationRule[]
 *
 * W01 每條規則有 label（一個分類 label 可能多條規則），
 * patrol 按 category 合併關鍵字為一條規則
 */
function deriveClassificationRules(): ClassificationRule[] {
  const categoryMap = new Map<PatrolCategory, { keywords: string[]; budgetMax?: number }>();

  for (const rule of DEFAULT_KEYWORD_RULES) {
    const patrolCategory = keywordCategoryToPatrol(rule.category);
    const existing = categoryMap.get(patrolCategory);

    if (existing) {
      existing.keywords.push(...rule.keywords);
      if (rule.budgetMax !== undefined) {
        existing.budgetMax = rule.budgetMax;
      }
    } else {
      categoryMap.set(patrolCategory, {
        keywords: [...rule.keywords],
        budgetMax: rule.budgetMax,
      });
    }
  }

  return Array.from(categoryMap.entries()).map(([category, { keywords, budgetMax }]) => ({
    category,
    keywords,
    budgetMax,
  }));
}

/**
 * 預設分類規則（衍生自 scan/constants DEFAULT_KEYWORD_RULES）
 * 來源：Jin 0222 定義的四類關鍵字
 */
export const DEFAULT_CLASSIFICATION_RULES: ClassificationRule[] = deriveClassificationRules();

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
