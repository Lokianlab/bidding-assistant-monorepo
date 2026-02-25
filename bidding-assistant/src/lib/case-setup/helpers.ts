/** M01 案件建立模組 — 純函式工具 */

import type { DriveCreateFolderInput } from './types';
import { deriveCategory } from '@/lib/intelligence/helpers';

/**
 * 將西元 ISO 日期轉為民國日期格式
 *
 * @param isoDate - ISO 日期字串（如 "2026-03-15"），null 時回傳空字串
 * @returns 民國日期字串（如 "115.03.15"）
 */
export function convertToROCDate(isoDate: string | null): string {
  if (!isoDate) return '';

  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return '';

  const westernYear = date.getFullYear();
  const rocYear = westernYear - 1911;
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${rocYear}.${month}.${day}`;
}

/**
 * 產生 Drive 資料夾名稱
 *
 * 格式：({caseUniqueId})({rocDate}) {title}
 * 範例：(BID-A3F7K)(115.03.15) 某某標案名稱
 *
 * @param input - 資料夾建立參數
 * @returns 格式化的資料夾名稱
 */
export function formatDriveFolderName(input: DriveCreateFolderInput): string {
  const rocDate = convertToROCDate(input.deadline);
  const datePart = rocDate ? `(${rocDate})` : '';
  return `(${input.caseUniqueId})${datePart} ${input.title}`;
}

/**
 * 產生案件唯一識別碼
 *
 * 格式：BID-XXXXX（時間戳尾碼 + 隨機字元）
 * 用於資料夾命名和內部追蹤，不需要全域唯一（同一秒建兩案的機率極低）
 *
 * @returns 案件唯一 ID（如 "BID-A3F7K"）
 */
export function generateCaseUniqueId(): string {
  const timestamp = Date.now().toString(36).slice(-3).toUpperCase();
  const random = Math.random().toString(36).slice(2, 4).toUpperCase();
  return `BID-${timestamp}${random}`;
}

/**
 * 從預算金額推導規模標籤。
 *
 * 閾值（文化/教育類標案慣用分級）：
 * - 小案：< 50 萬
 * - 中案：50 萬 - 200 萬
 * - 大案：200 萬 - 500 萬
 * - 旗艦案：> 500 萬
 */
export function deriveBudgetScale(budget: number | null): string {
  if (budget === null) return '規模未定';
  if (budget < 500_000)   return '小案';
  if (budget < 2_000_000) return '中案';
  if (budget < 5_000_000) return '大案';
  return '旗艦案';
}

/**
 * 從案名和預算自動產生標籤陣列。
 *
 * 回傳兩個標籤：[分類標籤, 規模標籤]
 * 例：["教育訓練", "中案"]
 */
export function deriveAutoTags(title: string, budget: number | null): string[] {
  return [deriveCategory(title), deriveBudgetScale(budget)];
}
