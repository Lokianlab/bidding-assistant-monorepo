/**
 * M02 Phase 2c: GET /api/kb/items/:id — 單筆查詢
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
 * GET /api/kb/items/:id
 * 單筆查詢 — 返回指定 ID 的知識庫項目
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 驗證認證並初始化 Supabase
    const { error: authError, userId, supabase } = getAuthenticatedSupabase(request);
    if (authError) return authError;

    const { id: itemId } = await params;

    if (!itemId) {
      return NextResponse.json(
        { error: 'Missing item ID' },
        { status: 400 }
      );
    }

    // 查詢單筆項目
    const { data, error } = await supabase!
      .from('kb_entries')
      .select('id, category, entry_id, data, status')
      .eq('tenant_id', userId)
      .eq('id', itemId)
      .single();

    if (error) {
      // PGRST116 = no rows found
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Item not found' },
          { status: 404 }
        );
      }

      console.error('[KB API] GET /:id error:', error);
      return NextResponse.json(
        { error: error.message || 'Database error' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      id: data.id,
      category: data.category,
      entryId: data.entry_id,
      data: data.data,
      status: data.status,
    });
  } catch (error: any) {
    console.error('[KB API] GET /:id error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
