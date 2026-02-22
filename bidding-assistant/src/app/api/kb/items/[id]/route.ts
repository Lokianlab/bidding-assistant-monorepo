/**
 * GET /api/kb/items/:id — 取得單一項目
 * PATCH /api/kb/items/:id — 更新項目
 * DELETE /api/kb/items/:id — 刪除項目
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/db/supabase-client';
import { requireAuth, canDelete } from '@/lib/api/kb-middleware';

interface RouteParams {
  params: { id: string };
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams,
) {
  try {
    const session = await requireAuth(request);
    const { id } = params;

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
  } catch (error: any) {
    const statusCode = error?.statusCode || 500;
    const message = error?.message || 'Internal Server Error';

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
    const { id } = params;

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
    const updateData: any = {
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

    return NextResponse.json(data);
  } catch (error: any) {
    const statusCode = error?.statusCode || 500;
    const message = error?.message || 'Internal Server Error';

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
    const { id } = params;

    const supabase = getSupabaseClient();

    // 取得項目以檢查權限
    const { data: item, error: checkError } = await supabase
      .from('kb_items')
      .select('created_by')
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

    return NextResponse.json(
      { message: 'Deleted' },
      { status: 204 },
    );
  } catch (error: any) {
    const statusCode = error?.statusCode || 500;
    const message = error?.message || 'Internal Server Error';

    console.error('[KB API] DELETE error:', message);
    return NextResponse.json(
      { error: message },
      { status: statusCode },
    );
  }
}
