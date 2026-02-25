import { NextRequest, NextResponse } from 'next/server';
import { saveIntelCache } from '@/lib/supabase/intel-client';

/**
 * POST /api/intelligence/perplexity-result
 * 儲存 Perplexity 調查結果
 *
 * body: { case_id, round, result_text }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { case_id, round, result_text } = body;

    if (!case_id || round == null || !result_text) {
      return NextResponse.json(
        { error: '缺少必要欄位：case_id, round, result_text' },
        { status: 400 },
      );
    }

    // 存入快取（每一輪獨立存，用 round 區分）
    const perplexityData = {
      round: Number(round),
      prompt: '', // 提示詞在前端生成，這裡只存結果
      result: result_text,
      findings: [], // TODO: 可用 Claude 自動解析關鍵發現
      timestamp: new Date().toISOString(),
    };

    // 用 case_id + 'perplexity' 存入，data 裡用 rounds 陣列
    // 先取現有的
    const { getIntelCache } = await import('@/lib/supabase/intel-client');
    const existing = await getIntelCache(case_id, 'perplexity');
    const existingRounds = (existing?.data as { rounds?: unknown[] } | null)?.rounds ?? [];

    // 替換或新增該輪
    const rounds = [...(existingRounds as Array<{ round: number }>)];
    const existingIdx = rounds.findIndex(r => r.round === Number(round));
    if (existingIdx >= 0) {
      rounds[existingIdx] = perplexityData;
    } else {
      rounds.push(perplexityData);
    }

    await saveIntelCache({
      case_id,
      intel_type: 'perplexity',
      data: { rounds } as unknown as Record<string, unknown>,
      source: 'perplexity',
      ttl_days: 30,
    });

    return NextResponse.json({ saved: true, round: Number(round) });
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知錯誤';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
