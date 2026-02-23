/**
 * M02 Phase 2: KB Full-Text Search API
 *
 * GET /api/kb/search — 進階全文搜尋
 *
 * 支援參數：
 * - q: 搜尋關鍵字（必填）
 * - categories: 限定分類，逗號分隔（選填）
 * - status: 狀態篩選（選填）
 * - limit: 結果數量（預設 20，最多 100）
 * - offset: 偏移（預設 0）
 */

import { NextRequest, NextResponse } from 'next/server';
import { withKBAuth } from '@/lib/supabase/middleware';
import type { KBId, KBEntryStatus } from '@/lib/supabase/types';

export async function GET(request: NextRequest) {
  return withKBAuth(request, async (req, auth) => {
    try {
      const url = new URL(req.url);
      const query = url.searchParams.get('q');
      const categoriesParam = url.searchParams.get('categories');
      const status = (url.searchParams.get('status') as KBEntryStatus | null);
      const limit = Math.min(
        parseInt(url.searchParams.get('limit') || '20', 10),
        100,
      );
      const offset = parseInt(url.searchParams.get('offset') || '0', 10);

      // 驗證必填參數
      if (!query || query.trim().length === 0) {
        return NextResponse.json(
          { error: 'Query parameter "q" is required' },
          { status: 400 },
        );
      }

      const { supabaseClient, session } = auth;

      // 解析 categories
      const categories = categoriesParam
        ? (categoriesParam.split(',') as KBId[])
        : undefined;

      // 建立全文搜尋查詢（使用生成的 search_text 欄位）
      let qb = supabaseClient
        .from('kb_entries')
        .select('*', { count: 'exact' })
        .eq('tenant_id', session.user.id)
        .ilike('search_text', `%${query}%`);

      // 添加篩選條件
      if (categories && categories.length > 0) {
        qb = qb.in('category', categories);
      }
      if (status) {
        qb = qb.eq('status', status);
      }

      // 排序、分頁
      const { data, count, error } = await qb
        .order('updated_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('[KB API] Search error:', error);
        throw error;
      }

      return NextResponse.json({
        results: data || [],
        total: count || 0,
        query,
        limit,
        offset,
      });
    } catch (error: unknown) {
      const statusCode = error instanceof Error && 'statusCode' in error ? (error.statusCode as number) : 500;
      const message = error instanceof Error ? error.message : 'Internal Server Error';

      console.error('[KB API] Search error:', message);
      return NextResponse.json(
        { error: message },
        { status: statusCode },
      );
    }
  });
}
