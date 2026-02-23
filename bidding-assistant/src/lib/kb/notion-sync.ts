/**
 * P1e Notion ↔ Supabase 知識庫同步引擎
 *
 * 設計原則：
 * - 純邏輯層：不初始化客戶端，所有依賴通過參數傳入
 * - 避免 build-time 環境變數依賴
 * - API 路由 / Cron 負責初始化和傳遞客戶端
 *
 * 依賴：P1c (KB API) 完成，P1a (Supabase schema) 完成
 */

import type { Client as NotionClient } from '@notionhq/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

/**
 * KB 項目型別（來自 P1c）
 */
export interface KBItem {
  id: string;
  tenant_id: string;
  title: string;
  category: '00A' | '00B' | '00C' | '00D' | '00E';
  tags: string[];
  content: string;
  created_by: string;
  created_at: Date;
  updated_at: Date;
  sync_status?: 'pending' | 'done' | 'failed' | 'deleted';
}

/**
 * 同步日誌型別
 */
export interface SyncLog {
  id: string;
  item_id: string | null;
  operation: 'create' | 'update' | 'delete' | 'import';
  status: 'success' | 'error';
  error_msg?: string;
  created_at: Date;
}

/**
 * 記錄同步操作到 Supabase sync_logs 表
 */
export async function recordSyncLog(
  supabase: SupabaseClient,
  operation: SyncLog['operation'],
  itemId: string | null,
  status: 'success' | 'error',
  errorMsg?: string,
  tenantId?: string
): Promise<void> {
  try {
    await supabase.from('sync_logs').insert({
      item_id: itemId,
      tenant_id: tenantId || 'unknown',
      operation,
      status,
      error_msg: errorMsg,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('sync', `記錄同步日誌失敗: ${errorMsg}`);
  }
}

/**
 * 從 Notion 頁面提取標題
 */
function extractTitleFromNotionPage(page: any): string {
  const titleProperty = page.properties['名稱'];
  if (titleProperty?.title?.[0]?.text?.content) {
    return titleProperty.title[0].text.content;
  }
  return '';
}

/**
 * 查詢 Notion 頁面 ID（根據標題）
 */
async function findNotionPageByTitle(
  notion: NotionClient,
  notionKBDbId: string,
  title: string
): Promise<string | null> {
  try {
    // @ts-ignore — databases.query 在 SDK 型別定義中遺失，但實際存在
    const response = await notion.databases.query({
      database_id: notionKBDbId,
      filter: {
        property: '名稱',
        title: {
          equals: title,
        },
      },
    });

    if (response.results.length > 0) {
      return response.results[0].id;
    }
    return null;
  } catch (error) {
    logger.error('sync', `查詢 Notion 頁面失敗 (${title}): ${error}`);
    return null;
  }
}

/**
 * 準備 Notion 格式資料
 */
function prepareNotionData(item: KBItem) {
  return {
    properties: {
      '名稱': {
        title: [{ text: { content: item.title } }],
      },
      '分類': {
        select: { name: item.category },
      },
      '標籤': {
        rich_text: [{ text: { content: item.tags?.join(', ') || '' } }],
      },
      '內容': {
        rich_text: [{ text: { content: item.content || '' } }],
      },
      '修改時間': {
        date: {
          start: new Date(item.updated_at).toISOString().split('T')[0],
        },
      },
      '同步狀態': {
        select: { name: 'done' },
      },
    },
  };
}

/**
 * 同步 Supabase → Notion
 */
export async function syncItemToNotion(
  notion: NotionClient,
  supabase: SupabaseClient,
  notionKBDbId: string,
  item: KBItem,
  operation: 'create' | 'update' | 'delete'
): Promise<void> {
  try {
    const notionData = prepareNotionData(item);

    if (operation === 'create') {
      await notion.pages.create({
        parent: { database_id: notionKBDbId },
        properties: notionData.properties,
      });
      await recordSyncLog(supabase, operation, item.id, 'success', undefined, item.tenant_id);
      logger.info('sync', `新增項目到 Notion: ${item.title}`);
    } else if (operation === 'update') {
      const pageId = await findNotionPageByTitle(notion, notionKBDbId, item.title);
      if (!pageId) {
        throw new Error(`Notion 頁面未找到: ${item.title}`);
      }

      await notion.pages.update({
        page_id: pageId,
        properties: notionData.properties,
      });
      await recordSyncLog(supabase, operation, item.id, 'success', undefined, item.tenant_id);
      logger.info('sync', `更新 Notion 頁面: ${item.title}`);
    } else if (operation === 'delete') {
      const pageId = await findNotionPageByTitle(notion, notionKBDbId, item.title);
      if (pageId) {
        await notion.pages.update({
          page_id: pageId,
          properties: {
            '同步狀態': { select: { name: 'deleted' } },
          },
        });
        await recordSyncLog(supabase, operation, item.id, 'success', undefined, item.tenant_id);
        logger.info('sync', `標記 Notion 頁面為已刪除: ${item.title}`);
      }
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    await recordSyncLog(supabase, operation, item.id, 'error', errorMsg, item.tenant_id);
    logger.error('sync', `同步失敗 (${operation} ${item.id}): ${errorMsg}`);
    throw error;
  }
}

/**
 * 將 Notion 頁面轉換為 KBItem
 */
function notionPageToKBItem(page: any, tenantId: string): Partial<KBItem> {
  const title = extractTitleFromNotionPage(page);
  const categoryProp = page.properties['分類'];
  const tagsProp = page.properties['標籤'];
  const contentProp = page.properties['內容'];

  return {
    tenant_id: tenantId,
    title,
    category: categoryProp?.select?.name || '00A',
    tags: tagsProp?.rich_text?.[0]?.text?.content?.split(', ') || [],
    content: contentProp?.rich_text?.[0]?.text?.content || '',
    sync_status: 'done',
    created_at: new Date(page.created_time),
    updated_at: new Date(page.last_edited_time),
  };
}

/**
 * 同步 Notion → Supabase（單向讀）
 */
export async function syncNotionToSupabase(
  notion: NotionClient,
  supabase: SupabaseClient,
  notionKBDbId: string,
  tenantId: string
): Promise<void> {
  try {
    // 1. 掃描 Notion 表
    // @ts-ignore — databases.query 在 SDK 型別定義中遺失，但實際存在
    const pages = await notion.databases.query({
      database_id: notionKBDbId,
      filter: {
        property: '同步狀態',
        select: {
          does_not_equal: 'deleted',
        },
      },
    });

    logger.info('sync', `掃描 Notion: ${pages.results.length} 個項目`);

    // 2. 逐頁檢查並同步
    for (const page of pages.results) {
      const title = extractTitleFromNotionPage(page);
      if (!title) continue;

      const { data: existingItem } = await supabase
        .from('kb_items')
        .select('id, updated_at')
        .eq('tenant_id', tenantId)
        .eq('title', title)
        .single();

      const notionUpdatedAt = new Date(page.last_edited_time);

      // 3. 新項目或 Notion 較新 → 匯入
      if (
        !existingItem ||
        notionUpdatedAt > new Date(existingItem.updated_at)
      ) {
        const item = notionPageToKBItem(page, tenantId);

        if (!existingItem) {
          // 新增
          await supabase.from('kb_items').insert({
            ...item,
            created_at: new Date(page.created_time).toISOString(),
            updated_at: new Date(page.last_edited_time).toISOString(),
          });
          await recordSyncLog(supabase, 'import', null, 'success', undefined, tenantId);
          logger.info('sync', `匯入新項目: ${title}`);
        } else {
          // 更新
          await supabase
            .from('kb_items')
            .update({
              ...item,
              updated_at: new Date(page.last_edited_time).toISOString(),
            })
            .eq('id', existingItem.id);
          await recordSyncLog(supabase, 'import', existingItem.id, 'success', undefined, tenantId);
          logger.info('sync', `更新項目: ${title}`);
        }
      }
    }

    logger.info('sync', `Notion → Supabase 同步完成`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    await recordSyncLog(supabase, 'import', null, 'error', errorMsg, tenantId);
    logger.error('sync', `Notion 同步失敗: ${errorMsg}`);
    throw error;
  }
}

/**
 * 健康檢查（驗證 Notion API 連線）
 */
export async function verifyNotionConnection(
  notion: NotionClient,
  notionKBDbId: string
): Promise<boolean> {
  try {
    await notion.databases.retrieve({ database_id: notionKBDbId });
    logger.info('sync', 'Notion API 連線正常');
    return true;
  } catch (error) {
    logger.error('sync', `Notion API 連線失敗: ${error}`);
    return false;
  }
}
