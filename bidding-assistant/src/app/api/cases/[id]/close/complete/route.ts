/**
 * M11 結案飛輪 - 完成結案
 *
 * POST /api/cases/[id]/close/complete
 * 標記案件為已結案並歸檔相關資訊
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

/**
 * 輔助函式：驗證認證並初始化 Supabase 客戶端
 */
function getAuthenticatedSupabase(request: NextRequest) {
  const userId = request.headers.get('x-user-id') || request.headers.get('x-tenant-id');
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

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: caseId } = await context.params;

    // 驗證認證
    const { error: authError, userId, supabase } = getAuthenticatedSupabase(request);
    if (authError) return authError;

    // 更新 case_learnings 表中的 completed_at
    const { error: completionError } = await supabase!
      .from('case_learnings')
      .update({
        completed_at: new Date().toISOString(),
      })
      .eq('case_id', caseId)
      .eq('tenant_id', userId);

    if (completionError) {
      logger.error('system', '結案完成失敗', completionError.message);
      return NextResponse.json(
        { error: completionError.message || '結案完成失敗' },
        { status: 400 }
      );
    }

    // TODO: 如果專案有 cases 表，也應在此更新狀態為 'closed'
    // const { error: caseError } = await supabase!
    //   .from('cases')
    //   .update({ status: 'closed', closed_at: new Date().toISOString() })
    //   .eq('id', caseId)
    //   .eq('tenant_id', userId);

    logger.info(
      'system',
      '案件結案成功',
      JSON.stringify({ caseId })
    );

    return NextResponse.json(
      { message: '案件已結案' },
      { status: 200 }
    );
  } catch (error: any) {
    logger.error('system', '結案完成失敗', error.message);
    console.error('[M11] complete error:', error);
    return NextResponse.json(
      { error: error.message || '結案完成失敗' },
      { status: 500 }
    );
  }
}
