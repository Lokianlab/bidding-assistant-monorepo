/** M01 案件建立模組 — Notion 建案 */

import type { CreatePageParameters } from '@notionhq/client/build/src/api-endpoints';
import { getNotionClient, getDatabaseId } from '@/lib/notion/client';
import { DEFAULT_CASE_STATUS, PREFILL_FIELDS } from './constants';
import type { CaseSetupInput } from './types';

/** Notion database page properties type */
type NotionProperties = CreatePageParameters['properties'];

/**
 * 在 Notion 資料庫建立案件頁面
 *
 * 建立一筆新的 Notion database page，包含案件基本屬性。
 *
 * @param input - 案件建立輸入
 * @returns Notion page ID
 */
export async function createNotionCase(input: CaseSetupInput): Promise<string> {
  const notion = getNotionClient();
  const databaseId = getDatabaseId();

  const properties: NotionProperties = {
    '案件名稱': {
      title: [{ text: { content: input.title } }],
    },
    '機關': {
      rich_text: [{ text: { content: input.agency } }],
    },
    'PCC案號': {
      rich_text: [{ text: { content: input.pcc_job_number } }],
    },
    '案件狀態': {
      select: { name: DEFAULT_CASE_STATUS },
    },
  };

  // 有預算才設定
  if (input.budget !== null) {
    properties['預算'] = { number: input.budget };
  }

  // 有截標日期才設定
  if (input.deadline) {
    properties['截標日期'] = { date: { start: input.deadline } };
  }

  // 有決標方式才設定
  if (input.award_method) {
    properties['決標方式'] = { select: { name: input.award_method } };
  }

  // 寫入自動標籤（需 Notion DB 有 multi_select 類型的「標籤」欄位）
  if (input.tags && input.tags.length > 0) {
    properties['標籤'] = {
      multi_select: input.tags.map((name) => ({ name })),
    };
  }

  const response = await notion.pages.create({
    parent: { database_id: databaseId },
    properties,
  });

  return response.id;
}

/**
 * 在 Notion 頁面附加「快速資料（可複製）」區塊
 *
 * 建立一個 heading + bulleted list 區塊，列出案件各欄位資料，
 * 方便使用者快速複製貼上到其他文件。
 *
 * @param notionPageId - Notion page ID
 * @param data - 案件資料
 */
export async function addQuickDataBlock(
  notionPageId: string,
  data: CaseSetupInput,
): Promise<void> {
  const notion = getNotionClient();

  // 用 Record 做欄位值查找，避免 as any
  const fieldValues: Record<string, string> = {
    title: data.title,
    agency: data.agency,
    budget: data.budget !== null ? `${data.budget.toLocaleString()} 元` : '未設定',
    deadline: data.deadline ?? '未設定',
    award_method: data.award_method ?? '未設定',
    pcc_job_number: data.pcc_job_number,
    pcc_unit_id: data.pcc_unit_id,
  };

  const bulletItems = PREFILL_FIELDS.map((field) => ({
    object: 'block' as const,
    type: 'bulleted_list_item' as const,
    bulleted_list_item: {
      rich_text: [
        {
          type: 'text' as const,
          text: { content: `${field.label}：${fieldValues[field.key] ?? ''}` },
        },
      ],
    },
  }));

  await notion.blocks.children.append({
    block_id: notionPageId,
    children: [
      {
        object: 'block' as const,
        type: 'heading_2' as const,
        heading_2: {
          rich_text: [
            {
              type: 'text' as const,
              text: { content: '快速資料（可複製）' },
            },
          ],
        },
      },
      ...bulletItems,
    ],
  });
}
