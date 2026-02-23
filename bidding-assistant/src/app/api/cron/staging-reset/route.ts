/**
 * Cron Job: Staging 環境重置
 *
 * 功能：定期重置 staging Supabase 資料庫為初始狀態
 * 觸發：每日午夜 (00:00 UTC)
 * 用途：確保 staging 環境乾淨，便於 QA 驗收
 *
 * 整合方式：
 * - 手動觸發：curl http://localhost:3000/api/cron/staging-reset?token=...
 * - 自動排程：Vercel Cron Job（.vercel.json） 或 GitHub Actions
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/db/supabase-client';

/**
 * 驗證 Cron 密鑰（防止未授權重置）
 */
function validateCronSecret(token: string | null | undefined): boolean {
  const expectedToken = process.env.CRON_SECRET || '';
  if (!expectedToken) {
    console.warn('[Cron] CRON_SECRET 未設定，跳過驗證');
    return false;
  }
  return token === expectedToken;
}

/**
 * 重置 staging 資料庫
 */
interface ResetResult {
  success: boolean;
  message: string;
  stats?: Record<string, number | string>;
}

async function resetStagingDatabase(): Promise<ResetResult> {
  try {
    const supabase = getSupabaseServerClient();
    const stats: Record<string, number | string> = {};

    // ── 重置策略 ──
    // 1. 清除所有應用資料（保留 schema）
    // 2. 重新插入初始樣本資料
    // 3. 記錄統計資訊

    // 清除知識庫項目
    const { data: items, error: itemsError } = await supabase
      .from('kb_items')
      .delete()
      .neq('tenant_id', null)  // 刪除所有非 null tenant
      .select('count');

    if (itemsError) {
      console.error('[Cron] 刪除 kb_items 失敗:', itemsError);
      return {
        success: false,
        message: `刪除 kb_items 失敗: ${itemsError.message}`,
      };
    }

    stats.kb_items_deleted = items?.length || 0;

    // ── 重新插入樣本資料 ──
    const sampleKbItems = [
      {
        id: 'sample-00a-1',
        tenant_id: 'staging-tenant',
        category: '00A',
        title: '樣本知識庫 A1',
        content: '這是樣本知識庫 00A 類別的項目',
        parent_id: null,
        tags: ['sample', '00A'],
        created_by: 'system',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        updated_by: 'system',
      },
      {
        id: 'sample-00b-1',
        tenant_id: 'staging-tenant',
        category: '00B',
        title: '樣本知識庫 B1',
        content: '這是樣本知識庫 00B 類別的項目',
        parent_id: null,
        tags: ['sample', '00B'],
        created_by: 'system',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        updated_by: 'system',
      },
    ];

    const { error: insertError } = await supabase
      .from('kb_items')
      .insert(sampleKbItems);

    if (insertError) {
      console.error('[Cron] 插入樣本資料失敗:', insertError);
      return {
        success: false,
        message: `插入樣本資料失敗: ${insertError.message}`,
      };
    }

    stats.kb_items_created = sampleKbItems.length;

    // ── 記錄重置日誌 ──
    const logEntry = {
      timestamp: new Date().toISOString(),
      event: 'staging_reset',
      status: 'success',
      stats,
      triggered_by: 'cron',
    };

    console.log('[Cron] Staging 重置成功:', logEntry);

    return {
      success: true,
      message: 'Staging 環境重置完成',
      stats,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Cron] Staging 重置失敗:', message);
    return {
      success: false,
      message: `重置失敗: ${message}`,
    };
  }
}

/**
 * GET /api/cron/staging-reset
 * 觸發 staging 重置
 *
 * 查詢參數：
 * - token: Cron 驗證密鑰（環境變數 CRON_SECRET）
 *
 * 範例：
 * curl "http://localhost:3000/api/cron/staging-reset?token=your-secret-key"
 */
export async function GET(request: NextRequest) {
  try {
    // 檢查環境：只在 staging 環境執行
    const appEnv = process.env.NEXT_PUBLIC_APP_ENV;
    if (appEnv !== 'staging' && process.env.NODE_ENV !== 'test') {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'This endpoint is only available in staging environment',
        },
        { status: 403 },
      );
    }

    // 驗證 Cron 密鑰
    const url = new URL(request.url);
    const token = url.searchParams.get('token');

    if (!validateCronSecret(token)) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'Invalid or missing CRON_SECRET',
        },
        { status: 401 },
      );
    }

    // 執行重置
    const result = await resetStagingDatabase();

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      stats: result.stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Cron] 請求處理失敗:', message);
    return NextResponse.json(
      { error: 'Internal Server Error', message },
      { status: 500 },
    );
  }
}

/**
 * POST /api/cron/staging-reset
 * 同上（支持 POST 方法）
 */
export async function POST(request: NextRequest) {
  return GET(request);
}
