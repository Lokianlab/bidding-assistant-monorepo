import { NextRequest, NextResponse } from 'next/server';
import { saveIntelCache, getIntelCache } from '@/lib/supabase/intel-client';

/**
 * POST /api/intelligence/fetch
 * 觸發 PCC 情報拉取，結果存入 intelligence_cache
 *
 * body: { case_id, pcc_unit_id, pcc_unit_name }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { case_id, pcc_unit_id, pcc_unit_name } = body;

    if (!case_id || !pcc_unit_id) {
      return NextResponse.json(
        { error: '缺少必要欄位：case_id, pcc_unit_id' },
        { status: 400 },
      );
    }

    // 先檢查快取
    const cached = await getIntelCache(case_id, 'agency_history');
    if (cached) {
      return NextResponse.json({
        agency_history: cached.data,
        from_cache: true,
      });
    }

    // 動態載入避免循環依賴
    const { fetchAgencyHistory, fetchCompetitorAnalysis } = await import(
      '@/lib/intelligence/pcc-intel'
    );

    // 拉取機關歷史
    const agencyHistory = await fetchAgencyHistory(pcc_unit_id, pcc_unit_name ?? '');

    // 存入快取
    await saveIntelCache({
      case_id,
      intel_type: 'agency_history',
      data: agencyHistory as unknown as Record<string, unknown>,
      source: 'pcc',
      pcc_unit_id,
      ttl_days: 7,
    });

    // 拉取競爭者分析
    const competitors = await fetchCompetitorAnalysis(agencyHistory);

    await saveIntelCache({
      case_id,
      intel_type: 'competitor',
      data: competitors as unknown as Record<string, unknown>,
      source: 'pcc',
      pcc_unit_id,
      ttl_days: 7,
    });

    return NextResponse.json({
      agency_history: agencyHistory,
      competitors,
      from_cache: false,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知錯誤';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/intelligence/fetch?case_id=xxx
 * 取得案件的所有情報
 */
export async function GET(request: NextRequest) {
  try {
    const caseId = request.nextUrl.searchParams.get('case_id');
    if (!caseId) {
      return NextResponse.json({ error: '缺少 case_id' }, { status: 400 });
    }

    const { getAllIntelForCase } = await import('@/lib/supabase/intel-client');
    const intel = await getAllIntelForCase(caseId);

    // 整理成結構化回應
    const result: Record<string, unknown> = {};
    for (const item of intel) {
      result[item.intel_type] = item.data;
    }

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知錯誤';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
