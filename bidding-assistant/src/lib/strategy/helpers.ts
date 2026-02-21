// ====== M03 戰略分析引擎：輔助函式 ======

import { BUSINESS_KEYWORDS } from "./constants";

/**
 * 從案名中提取業務關鍵字
 * 回傳匹配的類別和具體詞彙
 */
export function extractKeywords(caseName: string): {
  categories: string[];
  terms: string[];
} {
  const categories: string[] = [];
  const terms: string[] = [];

  for (const [category, keywords] of Object.entries(BUSINESS_KEYWORDS)) {
    for (const kw of keywords) {
      if (caseName.includes(kw)) {
        if (!categories.includes(category)) categories.push(category);
        if (!terms.includes(kw)) terms.push(kw);
      }
    }
  }

  return { categories, terms };
}

/**
 * 計算兩段文字的關鍵字重疊度
 * 回傳 0-1 之間的 Jaccard 係數
 */
export function keywordOverlap(text1: string, text2: string): number {
  const allKeywords = Object.values(BUSINESS_KEYWORDS).flat();
  const set1 = new Set(allKeywords.filter((kw) => text1.includes(kw)));
  const set2 = new Set(allKeywords.filter((kw) => text2.includes(kw)));

  if (set1.size === 0 && set2.size === 0) return 0;

  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size;
}

/**
 * 將契約金額字串轉為數字（新臺幣）
 * 處理 "1,234,567"、"新臺幣1,234,567元"、"$1,234,567" 等格式
 */
export function parseContractAmount(amount: string): number | null {
  if (!amount) return null;
  const cleaned = amount.replace(/[^0-9.]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * 計算四分位數及 IQR
 * 至少需要 4 個值
 */
export function calculateIQR(
  values: number[],
): { q1: number; median: number; q3: number; iqr: number } | null {
  if (values.length < 4) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;

  const q1 = sorted[Math.floor(n * 0.25)];
  const median = sorted[Math.floor(n * 0.5)];
  const q3 = sorted[Math.floor(n * 0.75)];

  return { q1, median, q3, iqr: q3 - q1 };
}

/**
 * 將分數限制在 0-20 範圍內
 */
export function clampScore(score: number): number {
  return Math.max(0, Math.min(20, Math.round(score)));
}

/**
 * 格式化預算金額為中文顯示
 */
export function formatBudget(amount: number): string {
  if (amount >= 100_000_000) return `${(amount / 100_000_000).toFixed(1)} 億`;
  if (amount >= 10_000) return `${(amount / 10_000).toFixed(0)} 萬`;
  return `${amount.toLocaleString()} 元`;
}
