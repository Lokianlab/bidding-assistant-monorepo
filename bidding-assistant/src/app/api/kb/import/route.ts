/**
 * M02 Phase 2: KB Import API
 *
 * POST /api/kb/import — 批次匯入知識庫項目
 *
 * 請求格式：
 * {
 *   entries: [
 *     { category: "00A", data: {...} },
 *     { category: "00B", data: {...} }
 *   ],
 *   mode: "append" | "replace"
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { withKBAuth } from '@/lib/supabase/middleware';
import type { KBId } from '@/lib/supabase/types';

const MAX_BATCH_SIZE = 500;
const VALID_CATEGORIES: KBId[] = ['00A', '00B', '00C', '00D', '00E'];

export async function POST(request: NextRequest) {
  return withKBAuth(request, async (req, auth) => {
    try {
      const body = await req.json();
      const { entries, mode = 'append' } = body;

      // 驗證參數
      if (!entries || !Array.isArray(entries) || entries.length === 0) {
        return NextResponse.json(
          { error: 'Invalid request: entries array required' },
          { status: 400 }
        );
      }

      if (entries.length > MAX_BATCH_SIZE) {
        return NextResponse.json(
          { error: `Batch size cannot exceed ${MAX_BATCH_SIZE}` },
          { status: 400 }
        );
      }

      if (mode !== 'append' && mode !== 'replace') {
        return NextResponse.json(
          { error: 'Invalid mode: must be "append" or "replace"' },
          { status: 400 }
        );
      }

      const { supabaseClient, session } = auth;
      const imported: string[] = [];
      const errors: Array<{ index: number; error: string }> = [];

      // 如果是 replace 模式，先刪除舊項目
      if (mode === 'replace') {
        await supabaseClient
          .from('kb_entries')
          .delete()
          .eq('tenant_id', session.user.id);
      }

      // 匯入項目
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];

        try {
          const { category, data } = entry;

          // 驗證必填欄位
          if (!category || !data) {
            throw new Error('Missing category or data');
          }

          // 驗證 category
          if (!VALID_CATEGORIES.includes(category)) {
            throw new Error('Invalid category');
          }

          // 生成 entry_id
          const entry_id = data.id || `${category}-${Date.now()}-${i}`;

          // 插入
          const { data: result, error } = await supabaseClient
            .from('kb_entries')
            .insert({
              tenant_id: session.user.id,
              category,
              entry_id,
              data,
              status: 'active',
            })
            .select('id')
            .single();

          if (error) {
            throw error;
          }

          imported.push(result.id);
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          errors.push({
            index: i,
            error: message,
          });
        }
      }

      return NextResponse.json({
        imported: imported.length,
        errors,
        total: entries.length,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Internal Server Error';
      console.error('[KB API] Import error:', message);
      return NextResponse.json(
        { error: message },
        { status: 500 }
      );
    }
  });
}
