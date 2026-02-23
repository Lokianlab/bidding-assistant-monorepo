/**
 * M02 Phase 2a: KB API Routes
 *
 * GET /api/kb/items — 列表查詢
 * POST /api/kb/items — 建立新項目
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { KBId, KBEntry } from '@/lib/knowledge-base/types';

const VALID_CATEGORIES: KBId[] = ['00A', '00B', '00C', '00D', '00E'];

/**
 * 輔助函式：驗證認證並初始化 Supabase 客戶端
 */
function getAuthenticatedSupabase(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      userId: null,
      supabase: null,
    };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return {
      error: NextResponse.json(
        { error: 'Database configuration missing' },
        { status: 500 }
      ),
      userId: null,
      supabase: null,
    };
  }

  return {
    error: null,
    userId,
    supabase: createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    }),
  };
}

/**
 * POST /api/kb/items
 * 建立新知識庫項目
 */
export async function POST(request: NextRequest) {
  try {
    // 驗證認證並初始化 Supabase
    const { error: authError, userId, supabase } = getAuthenticatedSupabase(request);
    if (authError) return authError;

    const body = await request.json();
    const { category, data } = body;

    // 驗證必填欄位
    if (!category || !data) {
      return NextResponse.json(
        { error: 'Missing required fields: category, data' },
        { status: 400 },
      );
    }

    // 驗證 category
    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: 'Invalid category' },
        { status: 400 },
      );
    }

    // 寫入 kb_entries 表
    const { data: result, error } = await supabase!
      .from('kb_entries')
      .insert({
        tenant_id: userId,  // 多租戶隔離：tenant_id = auth.uid()
        category,
        entry_id: data.id,  // 從 data 中提取 entry_id
        data,               // 完整 JSON 資料
        status: 'active',   // 預設狀態
      })
      .select('id, category, entry_id')
      .single();

    if (error) {
      console.error('[KB API] POST error:', error);
      return NextResponse.json(
        { error: error.message || 'Database error' },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        id: result.id,
        entryId: result.entry_id,
        category: result.category,
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error('[KB API] POST error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 },
    );
  }
}

/**
 * GET /api/kb/items
 * 列表查詢 — 支持 category, status, limit, offset 篩選和分頁
 */
export async function GET(request: NextRequest) {
  try {
    // 驗證認證並初始化 Supabase
    const { error: authError, userId, supabase } = getAuthenticatedSupabase(request);
    if (authError) return authError;

    // 解析查詢參數
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 500);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);

    // 構建查詢
    let query = supabase!
      .from('kb_entries')
      .select('id, category, entry_id, data, status', { count: 'exact' })
      .eq('tenant_id', userId);

    // 應用篩選
    if (category) {
      query = query.eq('category', category);
    }
    if (status) {
      query = query.eq('status', status);
    }

    // 應用分頁
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('[KB API] GET error:', error);
      return NextResponse.json(
        { error: error.message || 'Database error' },
        { status: 400 },
      );
    }

    return NextResponse.json({
      items: (data || []).map((entry: any) => ({
        id: entry.id,
        category: entry.category,
        entryId: entry.entry_id,
        data: entry.data,
        status: entry.status,
      })),
      total: count || 0,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error('[KB API] GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 },
    );
  }
}
