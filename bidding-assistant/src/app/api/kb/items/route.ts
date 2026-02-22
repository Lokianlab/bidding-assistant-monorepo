/**
 * GET /api/kb/items — 列表查詢
 * POST /api/kb/items — 建立新項目
 *
 * 支援參數：
 * - category: 00A|00B|00C|00D|00E
 * - search: 搜尋標題
 * - parent_id: 上級項目 ID
 * - page: 分頁（預設 1）
 * - limit: 每頁筆數（預設 20，最多 100）
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/db/supabase-client';
import { requireAuth } from '@/lib/api/kb-middleware';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);

    const url = new URL(request.url);
    const category = url.searchParams.get('category');
    const search = url.searchParams.get('search');
    const parentId = url.searchParams.get('parent_id');
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = Math.min(
      parseInt(url.searchParams.get('limit') || '20', 10),
      100,
    );

    // 驗證 category
    const validCategories = ['00A', '00B', '00C', '00D', '00E'];
    if (category && !validCategories.includes(category)) {
      return NextResponse.json(
        { error: 'Invalid category' },
        { status: 400 },
      );
    }

    const supabase = getSupabaseClient();
    let query = supabase
      .from('kb_items')
      .select('*', { count: 'exact' })
      .eq('tenant_id', session.tenantId)
      .order('created_at', { ascending: false });

    // 套用篩選
    if (category) {
      query = query.eq('category', category);
    }
    if (search) {
      query = query.ilike('title', `%${search}%`);
    }
    if (parentId) {
      query = query.eq('parent_id', parentId);
    }

    // 分頁
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('[KB API] GET list error:', error);
      throw error;
    }

    return NextResponse.json({
      data: data || [],
      total: count || 0,
      page,
      limit,
    });
  } catch (error: any) {
    const statusCode = error?.statusCode || 500;
    const message = error?.message || 'Internal Server Error';

    console.error('[KB API] GET error:', message);
    return NextResponse.json(
      { error: message },
      { status: statusCode },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request);

    const body = await request.json();
    const { category, title, content, parent_id, tags } = body;

    // 驗證必填欄位
    if (!category || !title) {
      return NextResponse.json(
        { error: 'Missing required fields: category, title' },
        { status: 400 },
      );
    }

    const validCategories = ['00A', '00B', '00C', '00D', '00E'];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: 'Invalid category' },
        { status: 400 },
      );
    }

    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('kb_items')
      .insert({
        tenant_id: session.tenantId,
        category,
        title,
        content: content || '',
        parent_id: parent_id || null,
        tags: tags || [],
        created_by: session.userId,
      })
      .select()
      .single();

    if (error) {
      console.error('[KB API] POST error:', error);
      throw error;
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    const statusCode = error?.statusCode || 500;
    const message = error?.message || 'Internal Server Error';

    console.error('[KB API] POST error:', message);
    return NextResponse.json(
      { error: message },
      { status: statusCode },
    );
  }
}
