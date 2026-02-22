/**
 * P0 巡標 Layer B：Notion 建檔/回寫
 *
 * 接收 Layer C 轉換好的 NotionCaseCreateInput，
 * 呼叫 Notion API 建立頁面、回寫摘要和情蒐結果。
 *
 * @see docs/plans/P0-patrol-automation.md
 */

import type {
  NotionCaseCreateInput,
  NotionCaseCreateResult,
  NotionCaseUpdateInput,
  NotionCaseUpdateResult,
} from './types';
import { DEFAULT_FIELD_MAP } from '@/lib/constants/field-mapping';
import type { FieldMappingKey } from '@/lib/constants/field-mapping';

// ============================================================
// Notion API property 格式
// ============================================================

/** Notion property value types */
type NotionPropertyValue =
  | { title: [{ text: { content: string } }] }
  | { rich_text: [{ text: { content: string } }] }
  | { number: number }
  | { date: { start: string } }
  | { select: { name: string } }
  | { multi_select: { name: string }[] }
  | { status: { name: string } };

/** Notion API properties object */
export type NotionProperties = Record<string, NotionPropertyValue>;

// ============================================================
// 欄位映射：NotionCaseCreateInput → Notion API properties
// ============================================================

/**
 * 日期格式標準化（確保 Notion 能接受）
 * 接受 ISO 8601、YYYYMMDD 格式
 */
export function normalizeDate(dateStr: string): string | null {
  if (!dateStr) return null;

  // YYYYMMDD
  if (/^\d{8}$/.test(dateStr)) {
    return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
  }

  // ISO 8601（取日期部分或含時間）
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    return dateStr;
  }

  return null;
}

/**
 * NotionCaseCreateInput → Notion API properties
 *
 * P0 巡標預設值：
 * - 標案進程 = 「等標期間」（不同於 scan 的 "To-do"）
 * - 備標決策 = 「案件送二級評估」
 * - 唯一碼 = PCC-{jobNumber}
 */
export function mapInputToNotionProperties(
  input: NotionCaseCreateInput,
  fieldMap: Record<FieldMappingKey, string> = DEFAULT_FIELD_MAP,
): NotionProperties {
  const props: NotionProperties = {};

  // 標案名稱（title，必填）
  props[fieldMap.名稱] = {
    title: [{ text: { content: input.title } }],
  };

  // 案號
  if (input.jobNumber) {
    props[fieldMap.案號] = {
      rich_text: [{ text: { content: input.jobNumber } }],
    };
  }

  // 招標機關
  if (input.agency) {
    props[fieldMap.招標機關] = {
      rich_text: [{ text: { content: input.agency } }],
    };
  }

  // 預算金額
  if (input.budget !== null && input.budget !== undefined) {
    props[fieldMap.預算] = { number: input.budget };
  }

  // 公告日
  const publishDate = normalizeDate(input.publishDate);
  if (publishDate) {
    // 公告日沒有對應的 FIELD_KEY，用備標期限暫代
    // 實際上 Notion 可能有「公告日」欄位，但目前欄位對照表未列
    // 先不寫此欄位，等串接時確認欄位名稱
  }

  // 截標時間
  const deadline = normalizeDate(input.deadline);
  if (deadline) {
    props[fieldMap.截標] = { date: { start: deadline } };
  }

  // 決標方式
  if (input.awardType) {
    props[fieldMap.評審方式] = {
      select: { name: input.awardType },
    };
  }

  // 標案類型（multi_select）
  if (input.category && input.category.length > 0) {
    props[fieldMap.標案類型] = {
      multi_select: input.category.map((cat) => ({ name: cat })),
    };
  }

  // 案件唯一碼
  if (input.jobNumber) {
    props[fieldMap.唯一碼] = {
      rich_text: [{ text: { content: `PCC-${input.jobNumber}` } }],
    };
  }

  // P0 巡標預設值
  props[fieldMap.進程] = { status: { name: '等標期間' } };
  props[fieldMap.決策] = { select: { name: '案件送二級評估' } };

  return props;
}

// ============================================================
// Notion API 呼叫
// ============================================================

/** Notion API 回應的頁面物件（只取我們需要的欄位） */
interface NotionPageResponse {
  id?: string;
  url?: string;
  properties?: Record<string, {
    type?: string;
    unique_id?: { number?: number; prefix?: string };
  }>;
  message?: string;
}

/**
 * 從 Notion 回應中提取案件唯一碼
 * Notion 的 auto_increment_id（unique_id）會在建頁後自動產生
 */
export function extractCaseUniqueId(
  response: NotionPageResponse,
  fieldMap: Record<FieldMappingKey, string> = DEFAULT_FIELD_MAP,
): string | undefined {
  if (!response.properties) return undefined;

  const uniqueIdProp = response.properties[fieldMap.唯一碼];
  if (uniqueIdProp?.type === 'unique_id' && uniqueIdProp.unique_id) {
    const { prefix, number: num } = uniqueIdProp.unique_id;
    return prefix ? `${prefix}-${num}` : String(num);
  }

  // 如果沒有 unique_id 型別，回退到我們自己填的文字
  return undefined;
}

/**
 * Notion 建檔
 *
 * 呼叫 Notion API 建立頁面。
 * 沙盒 Data Source: collection://2181121c-79ef-4581-8b4e-9bb7fbb3984e
 *
 * @param input - Layer C 組裝好的建檔資料
 * @param token - Notion Integration Token
 * @param databaseId - Notion Database ID（沙盒或正式）
 */
export async function createNotionCase(
  input: NotionCaseCreateInput,
  token: string,
  databaseId: string,
  fieldMap: Record<FieldMappingKey, string> = DEFAULT_FIELD_MAP,
): Promise<NotionCaseCreateResult> {
  if (!token || !databaseId) {
    return { success: false, error: '缺少 Notion token 或 databaseId' };
  }

  if (!input.title?.trim()) {
    return { success: false, error: '標案名稱為必填' };
  }

  try {
    const properties = mapInputToNotionProperties(input, fieldMap);

    const res = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        parent: { database_id: databaseId },
        properties,
      }),
    });

    const data = (await res.json()) as NotionPageResponse;

    if (!res.ok) {
      return {
        success: false,
        error: data.message ?? `Notion API 錯誤 (${res.status})`,
      };
    }

    // 提取 caseUniqueId
    const caseUniqueId =
      extractCaseUniqueId(data, fieldMap) ?? `PCC-${input.jobNumber}`;

    return {
      success: true,
      notionPageId: data.id,
      caseUniqueId,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : '建檔錯誤',
    };
  }
}

// ============================================================
// Notion 回寫（摘要/情蒐/進度更新）
// ============================================================

/**
 * Notion 頁面更新
 *
 * 用途：
 * 1. 回寫工作項目摘要到 properties
 * 2. 回寫情蒐結果到頁面內容（page content / blocks）
 * 3. 更新備標進度標記
 *
 * @param input - 更新資料
 * @param token - Notion Integration Token
 */
export async function updateNotionCase(
  input: NotionCaseUpdateInput,
  token: string,
  fieldMap: Record<FieldMappingKey, string> = DEFAULT_FIELD_MAP,
): Promise<NotionCaseUpdateResult> {
  if (!token) {
    return { success: false, error: '缺少 Notion token' };
  }

  if (!input.notionPageId) {
    return { success: false, error: '缺少 Notion 頁面 ID' };
  }

  try {
    // 更新 properties（摘要寫進備標進度欄位）
    const hasPropertyUpdates = input.summary || input.progressFlags;

    if (hasPropertyUpdates) {
      const properties: Record<string, NotionPropertyValue> = {};

      // 進度標記
      if (input.progressFlags && input.progressFlags.length > 0) {
        properties[fieldMap.進度] = {
          rich_text: [{ text: { content: input.progressFlags.join('、') } }],
        };
      }

      const res = await fetch(
        `https://api.notion.com/v1/pages/${input.notionPageId}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ properties }),
        },
      );

      if (!res.ok) {
        const data = (await res.json()) as { message?: string };
        return {
          success: false,
          error: data.message ?? `Notion 更新失敗 (${res.status})`,
        };
      }
    }

    // 回寫情蒐結果到頁面內容（append blocks）
    if (input.intelligenceReport || input.summary) {
      const children = buildContentBlocks(input.summary, input.intelligenceReport);

      if (children.length > 0) {
        const res = await fetch(
          `https://api.notion.com/v1/blocks/${input.notionPageId}/children`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${token}`,
              'Notion-Version': '2022-06-28',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ children }),
          },
        );

        if (!res.ok) {
          const data = (await res.json()) as { message?: string };
          return {
            success: false,
            error: data.message ?? `Notion 內容寫入失敗 (${res.status})`,
          };
        }
      }
    }

    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : '更新錯誤',
    };
  }
}

// ============================================================
// 內容 Block 組裝（摘要 + 情蒐 → Notion blocks）
// ============================================================

/** Notion block type (simplified) */
interface NotionBlock {
  object: 'block';
  type: string;
  [key: string]: unknown;
}

/**
 * 組裝摘要和情蒐報告為 Notion blocks
 */
export function buildContentBlocks(
  summary?: string,
  intelligenceReport?: string,
): NotionBlock[] {
  const blocks: NotionBlock[] = [];

  if (summary) {
    blocks.push({
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [{ type: 'text', text: { content: '工作項目摘要' } }],
      },
    });
    blocks.push({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [{ type: 'text', text: { content: summary } }],
      },
    });
  }

  if (intelligenceReport) {
    blocks.push({
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [{ type: 'text', text: { content: '情蒐報告' } }],
      },
    });
    blocks.push({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [{ type: 'text', text: { content: intelligenceReport } }],
      },
    });
  }

  return blocks;
}
