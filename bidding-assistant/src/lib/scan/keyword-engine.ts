// ====== 巡標自動化：關鍵字篩選引擎 ======
// 純函式：根據關鍵字規則將標案分為四類

import type { KeywordRule, KeywordCategory, Classification, ScanTender, ScanResult } from "./types";
import { DEFAULT_KEYWORD_RULES } from "./constants";

/**
 * 檢查標題是否命中某條規則的任一關鍵字
 */
function matchRule(title: string, budget: number, rule: KeywordRule): string[] {
  const matched: string[] = [];

  // 關鍵字比對（標題包含任一關鍵字）
  for (const kw of rule.keywords) {
    if (title.includes(kw)) {
      matched.push(kw);
    }
  }

  // 預算條件（如果有設定且關鍵字為空，純用預算判斷）
  if (rule.budgetMax !== undefined && budget > 0 && budget <= rule.budgetMax) {
    if (rule.keywords.length === 0 || matched.length > 0) {
      // 純預算規則（keywords 為空）或同時滿足關鍵字+預算
      if (matched.length === 0) {
        matched.push(`預算 ≤ ${(rule.budgetMax / 10000).toFixed(0)}萬`);
      }
    }
  }

  // 純預算規則：keywords 空但有 budgetMax
  if (rule.keywords.length === 0 && rule.budgetMax !== undefined) {
    if (budget > 0 && budget <= rule.budgetMax) {
      return [`預算 ≤ ${(rule.budgetMax / 10000).toFixed(0)}萬`];
    }
    return [];
  }

  return matched;
}

/**
 * 計算規則中實際命中標題的最長關鍵字長度
 * 純預算規則（keywords 為空）回傳 0，不參與精確度比較
 */
function maxKeywordLength(title: string, rule: KeywordRule): number {
  let max = 0;
  for (const kw of rule.keywords) {
    if (title.includes(kw) && kw.length > max) {
      max = kw.length;
    }
  }
  return max;
}

/**
 * 分類單筆標案
 *
 * 篩選優先序：排除 → (must+review 中最精確的關鍵字勝出) → 其他
 * 「精確」= 命中的關鍵字越長越精確（「藝術節」3字 > 「藝術」2字）
 * 同長度時 must 優先於 review
 */
export function classifyTender(
  title: string,
  budget: number,
  rules: KeywordRule[] = DEFAULT_KEYWORD_RULES,
): Classification {
  const excludeRules = rules.filter((r) => r.category === "exclude");
  const mustRules = rules.filter((r) => r.category === "must");
  const reviewRules = rules.filter((r) => r.category === "review");

  // 1. 排除永遠最優先（安全優先）
  for (const rule of excludeRules) {
    const matched = matchRule(title, budget, rule);
    if (matched.length > 0) {
      return {
        category: "exclude",
        matchedLabel: rule.label,
        matchedKeywords: matched,
      };
    }
  }

  // 2. 收集所有 must + review 命中
  interface Candidate {
    category: "must" | "review";
    label: string;
    keywords: string[];
    specificity: number;
  }
  const candidates: Candidate[] = [];

  for (const rule of mustRules) {
    const matched = matchRule(title, budget, rule);
    if (matched.length > 0) {
      candidates.push({
        category: "must",
        label: rule.label,
        keywords: matched,
        specificity: maxKeywordLength(title, rule),
      });
    }
  }
  for (const rule of reviewRules) {
    const matched = matchRule(title, budget, rule);
    if (matched.length > 0) {
      candidates.push({
        category: "review",
        label: rule.label,
        keywords: matched,
        specificity: maxKeywordLength(title, rule),
      });
    }
  }

  if (candidates.length === 0) {
    return {
      category: "other",
      matchedLabel: "不符合已知類別",
      matchedKeywords: [],
    };
  }

  // 3. 最長關鍵字優先（更精確的規則勝出），同長度 must 優先
  const categoryOrder: Record<string, number> = { must: 0, review: 1 };
  candidates.sort((a, b) => {
    if (b.specificity !== a.specificity) return b.specificity - a.specificity;
    return categoryOrder[a.category] - categoryOrder[b.category];
  });

  const best = candidates[0];
  return {
    category: best.category,
    matchedLabel: best.label,
    matchedKeywords: best.keywords,
  };
}

/**
 * 批次分類多筆標案
 */
export function classifyTenders(
  tenders: ScanTender[],
  rules: KeywordRule[] = DEFAULT_KEYWORD_RULES,
): ScanResult[] {
  return tenders.map((tender) => ({
    tender,
    classification: classifyTender(tender.title, tender.budget, rules),
  }));
}

/**
 * 統計各類數量
 */
export function countByCategory(results: ScanResult[]): Record<KeywordCategory, number> {
  const counts: Record<KeywordCategory, number> = {
    must: 0,
    review: 0,
    exclude: 0,
    other: 0,
  };
  for (const r of results) {
    counts[r.classification.category]++;
  }
  return counts;
}

/**
 * 按優先序排序：must → review → other → exclude
 */
export function sortByPriority(results: ScanResult[]): ScanResult[] {
  const order: Record<KeywordCategory, number> = {
    must: 0,
    review: 1,
    other: 2,
    exclude: 3,
  };
  return [...results].sort(
    (a, b) => order[a.classification.category] - order[b.classification.category],
  );
}
