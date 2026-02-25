import { NextResponse } from 'next/server';
import { getIndexStatus } from '@/lib/supabase/cards-client';

/**
 * GET /api/knowledge/status
 * 知識庫索引狀態
 */
export async function GET() {
  try {
    const status = await getIndexStatus();
    return NextResponse.json(status);
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知錯誤';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
