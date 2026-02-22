// ====== PCC → Notion 欄位映射 ======
// 將 ScanTender 轉為 Notion API 的 properties 格式

import type { ScanTender } from "./types";
import { DEFAULT_FIELD_MAP } from "@/lib/constants/field-mapping";

/** Notion property value types */
type NotionPropertyValue =
  | { title: [{ text: { content: string } }] }
  | { rich_text: [{ text: { content: string } }] }
  | { number: number }
  | { date: { start: string } }
  | { select: { name: string } }
  | { multi_select: { name: string }[] }
  | { status: { name: string } };

/** 建案時傳給 Notion 的 properties */
export type NotionCaseProperties = Record<string, NotionPropertyValue>;

/**
 * 將日期字串（YYYYMMDD 或 ISO）轉為 ISO date
 */
function toISODate(dateStr: string): string | null {
  if (!dateStr) return null;
  // YYYYMMDD format
  if (/^\d{8}$/.test(dateStr)) {
    return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
  }
  // Already ISO or other format
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    return dateStr.slice(0, 10);
  }
  return null;
}

/**
 * 將 ScanTender 轉為 Notion page properties
 *
 * 只填有資料的欄位，其餘留空由企劃後續補齊。
 * 欄位名稱使用 DEFAULT_FIELD_MAP（與現有系統一致）。
 */
export function mapTenderToNotionProperties(
  tender: ScanTender,
  fieldMap = DEFAULT_FIELD_MAP,
): NotionCaseProperties {
  const props: NotionCaseProperties = {};

  // 標案名稱（title property，必填）
  props[fieldMap.名稱] = {
    title: [{ text: { content: tender.title } }],
  };

  // 招標機關
  if (tender.unit) {
    props[fieldMap.招標機關] = {
      rich_text: [{ text: { content: tender.unit } }],
    };
  }

  // 案號
  if (tender.jobNumber) {
    props[fieldMap.案號] = {
      rich_text: [{ text: { content: tender.jobNumber } }],
    };
  }

  // 預算金額（只填有值的）
  if (tender.budget > 0) {
    props[fieldMap.預算] = { number: tender.budget };
  }

  // 截標時間
  const deadline = toISODate(tender.deadline);
  if (deadline) {
    props[fieldMap.截標] = { date: { start: deadline } };
  }

  // 案件唯一碼（自動產生）
  if (tender.jobNumber) {
    props[fieldMap.唯一碼] = {
      rich_text: [{ text: { content: `PCC-${tender.jobNumber}` } }],
    };
  }

  // 標案類型（如果有）
  if (tender.category) {
    props[fieldMap.標案類型] = {
      multi_select: [{ name: tender.category }],
    };
  }

  // 預設值
  props[fieldMap.進程] = { status: { name: "To-do" } };
  props[fieldMap.決策] = { select: { name: "入選" } };

  return props;
}

/**
 * 建立 Notion page 的完整 request body
 */
export function buildCreatePageBody(
  databaseId: string,
  properties: NotionCaseProperties,
): {
  parent: { database_id: string };
  properties: NotionCaseProperties;
} {
  return {
    parent: { database_id: databaseId },
    properties,
  };
}
