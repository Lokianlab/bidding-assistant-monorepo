import { NextRequest, NextResponse } from 'next/server';
import { createDecision, getDecisionsByCase, getRecentDecisions } from '@/lib/supabase/decisions-client';

/** GET /api/decisions?case_id=xxx — 取得決策記錄 */
export async function GET(request: NextRequest) {
  try {
    const caseId = request.nextUrl.searchParams.get('case_id');

    if (caseId) {
      const decisions = await getDecisionsByCase(caseId);
      return NextResponse.json({ decisions });
    }

    // 無 case_id → 回傳最近決策
    const limit = parseInt(request.nextUrl.searchParams.get('limit') ?? '50', 10);
    const decisions = await getRecentDecisions(limit);
    return NextResponse.json({ decisions });
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知錯誤';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** POST /api/decisions — 建立決策記錄 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { case_id, notion_page_id, decision, reason } = body;

    if (!case_id || !decision) {
      return NextResponse.json(
        { error: '缺少必要欄位：case_id, decision' },
        { status: 400 },
      );
    }

    if (!['bid', 'no_bid', 'conditional'].includes(decision)) {
      return NextResponse.json(
        { error: 'decision 必須是 bid / no_bid / conditional' },
        { status: 400 },
      );
    }

    const result = await createDecision({
      case_id,
      notion_page_id,
      decision,
      reason,
    });

    return NextResponse.json({ decision: result }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知錯誤';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
