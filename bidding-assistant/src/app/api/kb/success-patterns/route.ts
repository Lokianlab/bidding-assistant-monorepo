/**
 * M11 結案飛輪 - 查詢成功模式
 *
 * GET /api/kb/success-patterns
 * 分析 case_learnings 中的高頻標籤和成功模式
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { identifySuccessPatterns } from '@/lib/case-closing/helpers';
import { logger } from '@/lib/logger';
import type { CaseLearning, SuccessPattern } from '@/lib/case-closing/types';

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

export async function GET(request: NextRequest) {
  try {
    // 驗證認證
    const { error: authError, userId, supabase } = getAuthenticatedSupabase(request);
    if (authError) return authError;

    // 解析查詢參數
    const { searchParams } = new URL(request.url);
    const minFrequency = Math.max(parseInt(searchParams.get('min_frequency') || '3'), 2);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

    // 查詢所有 case_learnings
    const { data: learnings, error: learningsError } = await supabase!
      .from('case_learnings')
      .select('*')
      .eq('tenant_id', userId)
      .order('created_at', { ascending: false });

    if (learningsError) {
      logger.error('system', '查詢 case_learnings 失敗', learningsError.message);
      return NextResponse.json(
        { error: learningsError.message || '查詢失敗' },
        { status: 400 }
      );
    }

    // 使用 helper 函式識別成功模式
    const patterns = identifySuccessPatterns(
      (learnings || []) as unknown as CaseLearning[],
      minFrequency
    );

    // 應用 limit
    const paginatedPatterns = patterns.slice(0, limit);

    logger.info(
      'system',
      '成功模式查詢完成',
      JSON.stringify({ minFrequency, patternCount: paginatedPatterns.length })
    );

    return NextResponse.json(
      {
        patterns: paginatedPatterns,
        total: patterns.length,
        minFrequency,
        limit,
      },
      { status: 200 }
    );
  } catch (error: any) {
    logger.error('system', '成功模式查詢失敗', error.message);
    console.error('[M11] success-patterns error:', error);
    return NextResponse.json(
      { error: error.message || '查詢失敗' },
      { status: 500 }
    );
  }
}
