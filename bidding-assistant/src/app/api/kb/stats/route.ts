/**
 * M02 Phase 2a: KB API - Statistics Endpoint
 *
 * GET /api/kb/stats — 統計各類別項目數量
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { KBId } from '@/lib/knowledge-base/types';

const VALID_CATEGORIES: KBId[] = ['00A', '00B', '00C', '00D', '00E'];

/**
 * GET /api/kb/stats
 * 統計各類別的項目數量（依 status 分類）
 */
export async function GET(request: NextRequest) {
  try {
    // 驗證認證
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      );
    }

    // 初始化 Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Database configuration missing' },
        { status: 500 },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    // 查詢統計資料
    const stats: Record<KBId, { total: number; active: number; draft: number; archived: number }> = {
      '00A': { total: 0, active: 0, draft: 0, archived: 0 },
      '00B': { total: 0, active: 0, draft: 0, archived: 0 },
      '00C': { total: 0, active: 0, draft: 0, archived: 0 },
      '00D': { total: 0, active: 0, draft: 0, archived: 0 },
      '00E': { total: 0, active: 0, draft: 0, archived: 0 },
    };

    // 逐類別統計
    for (const category of VALID_CATEGORIES) {
      const { data, error } = await supabase
        .from('kb_entries')
        .select('status', { count: 'exact' })
        .eq('tenant_id', userId)
        .eq('category', category);

      if (error) {
        console.error(`[KB API] Stats error for ${category}:`, error);
        continue;
      }

      stats[category].total = data?.length || 0;
      stats[category].active = data?.filter((d: any) => d.status === 'active').length || 0;
      stats[category].draft = data?.filter((d: any) => d.status === 'draft').length || 0;
      stats[category].archived = data?.filter((d: any) => d.status === 'archived').length || 0;
    }

    return NextResponse.json(stats);
  } catch (error: any) {
    console.error('[KB API] Stats error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 },
    );
  }
}
