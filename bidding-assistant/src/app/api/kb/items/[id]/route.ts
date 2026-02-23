/**
 * M02 Phase 2: KB Item Detail API Routes
 *
 * GET    /api/kb/items/[id] — 取得單個項目
 * PUT    /api/kb/items/[id] — 更新項目
 * DELETE /api/kb/items/[id] — 刪除項目
 * PATCH  /api/kb/items/[id] — 更新狀態
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/db/supabase-client';
import { withKBAuth } from '@/lib/supabase/middleware';
import { requireAuth, canDelete } from '@/lib/api/kb-middleware';
import { syncItemToNotion, type KBItem } from '@/lib/kb/notion-sync';
import { Client as NotionClient } from '@notionhq/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams,
) {
  try {
    const session = await requireAuth(request);
    const { id } = await params;

    const supabase = getSupabaseClient();

    // 取得主項目
    const { data: item, error: itemError } = await supabase
      .from('kb_items')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', session.tenantId)
      .single();

    if (itemError) {
      if (itemError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Not found' },
          { status: 404 },
        );
      }
      throw itemError;
    }

    // 取得子項目（如果有）
    const { data: children, error: childrenError } = await supabase
      .from('kb_items')
      .select('id,title,category')
      .eq('parent_id', id)
      .eq('tenant_id', session.tenantId);

    if (childrenError) {
      console.error('[KB API] Error fetching children:', childrenError);
    }

    return NextResponse.json({
      ...item,
      children: children || [],
    });
  } catch (error: unknown) {
    const statusCode = error instanceof Error && 'statusCode' in error ? (error.statusCode as number) : 500;
    const message = error instanceof Error ? error.message : 'Internal Server Error';

    console.error('[KB API] GET single error:', message);
    return NextResponse.json(
      { error: message },
      { status: statusCode },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams,
) {
  try {
    const session = await requireAuth(request);
    const { id } = await params;

    const body = await request.json();
    const { title, content, tags } = body;

    const supabase = getSupabaseClient();

    // 確認項目存在且屬於該租戶
    const { data: item, error: checkError } = await supabase
      .from('kb_items')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', session.tenantId)
      .single();

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Not found' },
          { status: 404 },
        );
      }
      throw checkError;
    }

    // 更新項目
    interface UpdateData {
      updated_at: string;
      updated_by: string;
      title?: string;
      content?: string;
      tags?: string[];
    }

    const updateData: UpdateData = {
      updated_at: new Date().toISOString(),
      updated_by: session.userId,
    };

    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (tags !== undefined) updateData.tags = tags;

    const { data, error } = await supabase
      .from('kb_items')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', session.tenantId)
      .select()
      .single();

    if (error) {
      console.error('[KB API] PATCH error:', error);
      throw error;
    }

    // 非同步同步到 Notion（fire-and-forget）
    syncToNotionAsync(data, supabase, session.tenantId, 'update').catch((err) => {
      logger.error('sync', `KB 項目 ${data.id} 同步 Notion 失敗: ${err.message}`);
    });

    return NextResponse.json(data);
  } catch (error: unknown) {
    const statusCode = error instanceof Error && 'statusCode' in error ? (error.statusCode as number) : 500;
    const message = error instanceof Error ? error.message : 'Internal Server Error';

    console.error('[KB API] PATCH error:', message);
    return NextResponse.json(
      { error: message },
      { status: statusCode },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams,
) {
  try {
    const session = await requireAuth(request);
    const { id } = await params;

    const supabase = getSupabaseClient();

    // 取得項目以檢查權限（需要完整資料用於 Notion 同步）
    const { data: item, error: checkError } = await supabase
      .from('kb_items')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', session.tenantId)
      .single();

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Not found' },
          { status: 404 },
        );
      }
      throw checkError;
    }

    // 檢查權限（建立者或 admin）
    if (!canDelete(session, item.created_by)) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 },
      );
    }

    // 刪除項目
    const { error } = await supabase
      .from('kb_items')
      .delete()
      .eq('id', id)
      .eq('tenant_id', session.tenantId);

    if (error) {
      console.error('[KB API] DELETE error:', error);
      throw error;
    }

    // 非同步同步到 Notion（fire-and-forget）
    syncToNotionAsync(item, supabase, session.tenantId, 'delete').catch((err) => {
      logger.error('sync', `KB 項目 ${item.id} 刪除同步 Notion 失敗: ${err.message}`);
    });

    return NextResponse.json(
      { message: 'Deleted' },
      { status: 204 },
    );
  } catch (error: unknown) {
    const statusCode = error instanceof Error && 'statusCode' in error ? (error.statusCode as number) : 500;
    const message = error instanceof Error ? error.message : 'Internal Server Error';

    console.error('[KB API] DELETE error:', message);
    return NextResponse.json(
      { error: message },
      { status: statusCode },
    );
  }
}

/**
 * 異步同步到 Notion（PATCH/DELETE 後調用）
 * 不等待完成，立即返回
 */
async function syncToNotionAsync(
  item: KBItem,
  supabase: SupabaseClient,
  tenantId: string,
  operation: 'update' | 'delete',
) {
  // 檢查環境變數
  const notionToken = process.env.NOTION_TOKEN;
  const notionKBDbId = process.env.NOTION_KB_DB_ID;

  if (!notionToken || !notionKBDbId) {
    logger.debug('sync', 'Notion 未配置，跳過同步');
    return;
  }

  try {
    const notion = new NotionClient({ auth: notionToken });
    await syncItemToNotion(notion, supabase, notionKBDbId, item, operation);
    logger.info('sync', `KB 項目 ${operation} 同步 Notion 成功: ${item.title}`);
  } catch (error) {
    // 錯誤已在 syncItemToNotion 中記錄，此處不再拋出
    throw error;
  }
}
