/**
 * P0 巡標 Layer C：欄位轉換
 *
 * PCC 原始資料 → Notion 欄位規格
 * 包含日期轉換、分類對照等
 */

import { PccTenderDetail, NotionCaseCreateInput } from './types';

/**
 * PCC 標案類型 → Notion 選項對照表
 *
 * PCC 有自己的分類體系，需要對應到 Notion 備標評估文件庫的 multi_select 選項。
 * 來源：Notion 備標評估文件庫的「標案類型」欄位現有選項。
 * 未來可從 /settings/patrol 頁面設定，或從 Notion database schema 自動讀取。
 */
export const PCC_CATEGORY_MAPPING: Record<string, string | undefined> = {
  // 工程
  建築工程: 'engineering',
  土木工程: 'engineering',
  機械工程: 'engineering',

  // 服務
  服務採購: 'services',
  專業服務: 'services',
  顧問服務: 'services',

  // 藝文
  藝術展覽: 'arts',
  文化活動: 'arts',
  影像製作: 'media',

  // 用品
  用品採購: 'supplies',
  物品購置: 'supplies',

  // 其他不對應則保留原始值
};

/**
 * PCC 決標方式 → Notion 選項對照表
 *
 * 來源：Notion 備標評估文件庫的「評審方式」欄位現有選項。
 * 未來可從 /settings/patrol 頁面設定。
 */
export const AWARD_TYPE_MAPPING: Record<string, string | undefined> = {
  '最有利標': 'most_advantageous',
  '最低標': 'lowest_price',
  '定價': 'fixed_price',
  '簽辦': 'signed',
};

/**
 * 將 ISO 日期轉為民國年格式（YYYY-MM-DD → ROC YYYY.MM.DD）
 * 例：2026-02-22 → 115.02.22
 */
export function convertToROCDate(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) {
      return isoDate; // 日期格式不對，原樣返回
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    const rocYear = year - 1911; // 轉換為民國年
    return `${rocYear}.${month}.${day}`;
  } catch {
    return isoDate;
  }
}

/**
 * PCC 分類 → Notion 選項轉換
 * 若分類未在對照表中，使用原始分類值
 */
export function convertCategory(pccCategory: string | null): string | undefined {
  if (!pccCategory) return undefined;

  const mapped = PCC_CATEGORY_MAPPING[pccCategory];
  return mapped || pccCategory;
}

/**
 * PCC 決標方式 → Notion 選項轉換
 */
export function convertAwardType(pccAwardType: string | null): string | undefined {
  if (!pccAwardType) return undefined;

  const mapped = AWARD_TYPE_MAPPING[pccAwardType];
  return mapped || pccAwardType;
}

/**
 * 清理和標準化標案名稱
 * 移除常見的括號和前綴
 */
export function normalizeTitle(title: string): string {
  return title
    .replace(/^【.*?】/, '') // 移除【】括號
    .replace(/^\(.*?\)/, '') // 移除()括號
    .trim();
}

/**
 * 截短摘要文字（避免 Notion 欄位過長）
 */
export function truncateDescription(text: string | null | undefined, maxLength: number = 500): string | undefined {
  if (!text) return undefined;

  if (text.length <= maxLength) {
    return text;
  }

  return text.substring(0, maxLength) + '...';
}

/**
 * 完整轉換：PccTenderDetail → NotionCaseCreateInput
 */
export function convertToNotionInput(detail: PccTenderDetail): NotionCaseCreateInput {
  const category = detail.category ? convertCategory(detail.category) : undefined;

  return {
    title: normalizeTitle(detail.title),
    jobNumber: detail.jobNumber,
    agency: detail.agency,
    budget: detail.budget,
    publishDate: detail.publishDate, // 保留 ISO 格式，Notion 日期欄位會自動處理
    deadline: detail.deadline,
    awardType: convertAwardType(detail.awardType),
    category: category ? [category] : undefined,
    description: truncateDescription(detail.description),
  };
}

/**
 * 驗證轉換結果的完整性
 * 檢查必填欄位是否都有值
 */
export function validateNotionInput(input: NotionCaseCreateInput): {
  valid: boolean;
  missingFields: string[];
} {
  const missingFields: string[] = [];

  if (!input.title?.trim()) missingFields.push('title');
  if (!input.jobNumber?.trim()) missingFields.push('jobNumber');
  if (!input.agency?.trim()) missingFields.push('agency');
  if (!input.publishDate?.trim()) missingFields.push('publishDate');
  if (!input.deadline?.trim()) missingFields.push('deadline');

  return {
    valid: missingFields.length === 0,
    missingFields,
  };
}
