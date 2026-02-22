/**
 * GET /api/kb/search — 進階全文搜尋
 *
 * 支援參數：
 * - q: 搜尋關鍵字（必填）
 * - category: 限定分類（選填）
 * - limit: 結果數量（預設 20，最多 100）
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/db/supabase-client';
import { requireAuth } from '@/lib/api/kb-middleware';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);

    const url = new URL(request.url);
    const query = url.searchParams.get('q');
    const category = url.searchParams.get('category');
    const limit = Math.min(
      parseInt(url.searchParams.get('limit') || '20', 10),
      100,
    );

    // 驗證必填參數
    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Query parameter "q" is required' },
        { status: 400 },
      );
    }

    const supabase = getSupabaseClient();

    // 使用 ilike 進行模糊搜尋（可擴展為全文搜尋）
    let qb = supabase
      .from('kb_items')
      .select('*')
      .eq('tenant_id', session.tenantId)
      .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
      .limit(limit)
      .order('created_at', { ascending: false });

    if (category) {
      qb = qb.eq('category', category);
    }

    const { data, error } = await qb;

    if (error) {
      console.error('[KB API] Search error:', error);
      throw error;
    }

    return NextResponse.json({
      results: data || [],
      query,
      count: (data || []).length,
    });
  } catch (error: any) {
    const statusCode = error?.statusCode || 500;
    const message = error?.message || 'Internal Server Error';

    console.error('[KB API] Search error:', message);
    return NextResponse.json(
      { error: message },
      { status: statusCode },
    );
  }
}
