import { NextResponse } from 'next/server';

/**
 * POST /api/knowledge/update
 * 觸發增量更新（只處理新增/修改的檔案）
 */
export async function POST() {
  try {
    const { incrementalUpdate } = await import('@/lib/knowledge/updater');
    const result = await incrementalUpdate();
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知錯誤';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
