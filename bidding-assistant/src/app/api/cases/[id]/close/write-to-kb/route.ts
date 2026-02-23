/**
 * M11 結案飛輪 - 寫入知識庫
 *
 * POST /api/cases/[id]/close/write-to-kb
 * 將結案摘要和評分寫入知識庫
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import type { CaseLearning } from '@/lib/case-closing/types';

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

    const body = await request.json();
    const { title, content, tags, metadata } = body;

    // 驗證必填欄位
    if (!title || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: title, content' },
        { status: 400 }
      );
    }

    // 將結案摘要寫入 KB
    const { data: kbResult, error: kbError } = await supabase!
      .from('kb_items')
      .insert({
        tenant_id: userId,
        title,
        content,
        category: 'case_closing',
        tags: tags || [],
        metadata: metadata || {},
        source_type: 'case_closing',
        related_case_id: caseId,
        sync_status: 'synced',
      })
      .select('id')
      .single();

    if (kbError) {
      logger.error('system', 'KB 寫入失敗', kbError.message);
      return NextResponse.json(
        { error: kbError.message || 'KB 寫入失敗' },
        { status: 400 }
      );
    }

    const kbItemId = kbResult.id;

    // 同步寫入 case_learnings 表
    const { error: learningError } = await supabase!
      .from('case_learnings')
      .insert({
        tenant_id: userId,
        case_id: caseId,
        title,
        whatWeDid: content.split('\n\n')[0] || '',
        whatWeLearned: content.split('\n\n')[1] || '',
        nextTimeNotes: content.split('\n\n')[2] || '',
        tags: tags || [],
        strategyScore: metadata?.strategyScore || 5,
        executionScore: metadata?.executionScore || 5,
        satisfactionScore: metadata?.satisfactionScore || 5,
        kb_item_id: kbItemId,
      })
      .select('id')
      .single();

    if (learningError) {
      logger.error('system', 'Case Learning 寫入失敗', learningError.message);
      // 不返回錯誤，因為 KB 已成功寫入
    }

    logger.info(
      'system',
      '結案摘要已寫入知識庫',
      JSON.stringify({ caseId, kbItemId })
    );

    return NextResponse.json(
      { kb_item_id: kbItemId },
      { status: 201 }
    );
  } catch (error: any) {
    logger.error('system', '知識庫寫入失敗', error.message);
    console.error('[M11] write-to-kb error:', error);
    return NextResponse.json(
      { error: error.message || '知識庫寫入失敗' },
      { status: 500 }
    );
  }
}
