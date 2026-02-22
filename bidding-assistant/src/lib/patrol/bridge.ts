/**
 * P0 巡標 Layer C：型別橋接
 *
 * 連接 ITEJ 的 W01 scan 實作（src/lib/scan/）和 P0 巡標 Layer C（src/lib/patrol/）
 * 讓現有的搜尋結果可以直接流入 Layer C 的業務邏輯管線
 */

import type { ScanTender, ScanResult, KeywordCategory } from '../scan/types';
import type { PccAnnouncementRaw, PatrolItem, PatrolCategory } from './types';

/**
 * W01 分類 → P0 分類的對照表
 *
 * W01 (ITEJ):   must / review / exclude / other
 * P0 (types.ts): definite / needs_review / skip / others
 */
const CATEGORY_MAP: Record<KeywordCategory, PatrolCategory> = {
  must: 'definite',
  review: 'needs_review',
  exclude: 'skip',
  other: 'others',
};

/**
 * P0 分類 → W01 分類的反向對照
 */
const REVERSE_CATEGORY_MAP: Record<PatrolCategory, KeywordCategory> = {
  definite: 'must',
  needs_review: 'review',
  skip: 'exclude',
  others: 'other',
};

/**
 * ScanTender（W01）→ PccAnnouncementRaw（P0 Layer A 格式）
 *
 * W01 的 ScanTender 欄位名稱和 P0 的 PccAnnouncementRaw 稍有不同：
 * - unit → agency
 * - 缺少 unitId（從 URL 解析或用空字串）
 */
export function scanTenderToRaw(tender: ScanTender): PccAnnouncementRaw {
  return {
    title: tender.title,
    budget: tender.budget ?? null,
    agency: tender.unit,
    deadline: tender.deadline,
    publishDate: tender.publishDate,
    jobNumber: tender.jobNumber,
    unitId: extractUnitIdFromUrl(tender.url),
    url: tender.url,
  };
}

/**
 * ScanResult（W01）→ PatrolItem（P0 Layer C 格式）
 *
 * 保留 W01 keyword-engine 的分類結果，轉換為 P0 格式
 */
export function scanResultToPatrolItem(result: ScanResult): PatrolItem {
  const raw = scanTenderToRaw(result.tender);
  return {
    id: `${raw.unitId}-${raw.jobNumber}`,
    ...raw,
    category: CATEGORY_MAP[result.classification.category],
    status: 'new',
  };
}

/**
 * 批量轉換 ScanResult[] → PatrolItem[]
 */
export function scanResultsToPatrolItems(results: ScanResult[]): PatrolItem[] {
  return results.map(scanResultToPatrolItem);
}

/**
 * PatrolCategory → KeywordCategory 反向轉換
 * 用於 UI 層需要回到 W01 分類體系的場景
 */
export function patrolCategoryToKeyword(category: PatrolCategory): KeywordCategory {
  return REVERSE_CATEGORY_MAP[category];
}

/**
 * KeywordCategory → PatrolCategory 正向轉換
 */
export function keywordCategoryToPatrol(category: KeywordCategory): PatrolCategory {
  return CATEGORY_MAP[category];
}

/**
 * 從 PCC URL 中提取 unitId
 * PCC URL 格式通常是 https://web.pcc.gov.tw/tps/...?unitId=xxx&...
 */
function extractUnitIdFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const unitId = parsed.searchParams.get('unitId');
    if (unitId) return unitId;

    // 嘗試從路徑中提取
    const match = url.match(/unit[_-]?[Ii]d[=:]([^&/]+)/);
    if (match) return match[1];

    return '';
  } catch {
    return '';
  }
}
