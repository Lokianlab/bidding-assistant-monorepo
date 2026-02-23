/**
 * P1e Cron 任務：Notion → Supabase 同步
 *
 * 執行時機：定時任務（每小時）
 * 認證：CRON_SECRET 環境變數
 * 功能：掃描 Notion 並匯入新項目/更新現有項目
 *
 * 部署指南：
 * - 透過 Vercel Crons、AWS Lambda、或 Supabase Edge Functions 觸發
 * - 必須傳入 header: {'x-cron-secret': CRON_SECRET}
 * - 預期執行時間：< 30 秒（新增項目 < 100 個）
 */

import { syncNotionToSupabase } from '@/lib/kb/notion-sync';
import { logger } from '@/lib/logger';
import { getSupabaseServerClient } from '@/lib/db/supabase-client';
import { Client } from '@notionhq/client';

const CRON_SECRET = process.env.CRON_SECRET;
const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_KB_DB_ID = process.env.NOTION_KB_DB_ID;

/**
 * GET /api/cron/sync-notion
 *
 * 查詢參數（選用）：
 * - tenant_id: 指定租戶 ID（不指定時掃描所有租戶）
 *
 * 回應：
 * 200: { success: true, synced: { created: 5, updated: 3 }, duration: 2.3 }
 * 401: { error: 'Unauthorized' }
 * 500: { error: '具體錯誤訊息' }
 */
export async function GET(req: Request) {
  const startTime = Date.now();

  // 1. 認證
  const secret = req.headers.get('x-cron-secret');
  if (secret !== CRON_SECRET) {
    logger.error('cron', '未授權的 Cron 呼叫');
    return Response.json({ error: '未授權' }, { status: 401 });
  }

  try {
    // 2. 環境變數驗證
    if (!NOTION_TOKEN || !NOTION_KB_DB_ID) {
      throw new Error('缺少 NOTION_TOKEN 或 NOTION_KB_DB_ID');
    }

    // 3. 初始化客戶端
    const notion = new Client({ auth: NOTION_TOKEN });
    const supabase = getSupabaseServerClient();

    // 4. 查詢租戶清單
    const url = new URL(req.url);
    const targetTenantId = url.searchParams.get('tenant_id');

    let tenantsQuery = supabase.from('tenants').select('id');
    if (targetTenantId) {
      tenantsQuery = tenantsQuery.eq('id', targetTenantId);
    }

    const { data: tenants, error: tenantsError } = await tenantsQuery;

    if (tenantsError) {
      throw new Error(`查詢租戶失敗: ${tenantsError.message}`);
    }

    if (!tenants || tenants.length === 0) {
      logger.info(
        'cron',
        `無可同步租戶${targetTenantId ? `(${targetTenantId})` : ''}`
      );
      return Response.json(
        { success: true, synced: { created: 0, updated: 0 }, duration: 0 },
        { status: 200 }
      );
    }

    // 4. 逐租戶同步
    const results = {
      created: 0,
      updated: 0,
      failed: 0,
    };

    for (const tenant of tenants) {
      try {
        await syncNotionToSupabase(notion, supabase, NOTION_KB_DB_ID, tenant.id);
        logger.info('cron', `租戶 ${tenant.id} 同步成功`);
      } catch (error) {
        logger.error('cron', `租戶 ${tenant.id} 同步失敗: ${error}`);
        results.failed++;
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    logger.info(
      'cron',
      `Notion 同步完成: ${results.created} 新增, ${results.updated} 更新, ${results.failed} 失敗 (${duration}s)`
    );

    return Response.json(
      { success: true, synced: results, duration },
      { status: 200 }
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error('cron', `Notion 同步失敗: ${errorMsg}`);

    return Response.json({ error: errorMsg }, { status: 500 });
  }
}

/**
 * 選用：POST 端點用於手動觸發（開發時測試）
 */
export async function POST(req: Request) {
  // 驗證 Admin 角色或 CRON_SECRET
  const secret = req.headers.get('x-cron-secret');
  if (secret !== CRON_SECRET) {
    return Response.json({ error: '未授權' }, { status: 401 });
  }

  return GET(req);
}
