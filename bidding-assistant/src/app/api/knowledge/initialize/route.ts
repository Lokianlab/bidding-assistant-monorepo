import { NextResponse } from 'next/server';

/**
 * POST /api/knowledge/initialize
 * 啟動知識庫初始化（長時間背景任務）
 */
export async function POST() {
  try {
    // 動態載入避免啟動時就載入所有依賴
    const { initializeKnowledgeBase } = await import('@/lib/knowledge/initializer');

    // 非同步啟動，不等完成
    // 用全域變數追蹤進度
    const progressKey = '__kb_init_progress__';
    (globalThis as Record<string, unknown>)[progressKey] = {
      total_files: 0,
      processed_files: 0,
      total_cards: 0,
      errors: [],
      status: 'scanning',
      started_at: new Date().toISOString(),
    };

    // 背景執行
    initializeKnowledgeBase((progress) => {
      (globalThis as Record<string, unknown>)[progressKey] = progress;
    }).catch((err) => {
      const current = (globalThis as Record<string, unknown>)[progressKey] as Record<string, unknown>;
      if (current) {
        current.status = 'error';
        current.errors = [...((current.errors as string[]) ?? []), err instanceof Error ? err.message : '未知錯誤'];
      }
    });

    return NextResponse.json({ started: true, message: '初始化已啟動，請查詢進度' });
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知錯誤';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/knowledge/initialize
 * 查詢初始化進度
 */
export async function GET() {
  const progressKey = '__kb_init_progress__';
  const progress = (globalThis as Record<string, unknown>)[progressKey];

  if (!progress) {
    return NextResponse.json({ status: 'idle', message: '未啟動' });
  }

  return NextResponse.json(progress);
}
