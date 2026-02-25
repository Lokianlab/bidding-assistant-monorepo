import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/case-setup
 * 一鍵建案：Notion + Drive + 鷹架 + 預填
 *
 * body: CaseSetupInput
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { case_id, title, agency, pcc_job_number, pcc_unit_id } = body;

    if (!case_id || !title || !pcc_job_number) {
      return NextResponse.json(
        { error: '缺少必要欄位：case_id, title, pcc_job_number' },
        { status: 400 },
      );
    }

    // 取得 Google access token
    const { getGoogleAccessToken } = await import('@/lib/patrol/google-auth');
    let accessToken: string;
    try {
      accessToken = await getGoogleAccessToken();
    } catch {
      // Drive 操作需要 token，但不阻塞 Notion 建案
      accessToken = '';
    }

    // 自動產生標籤（若呼叫方未帶，由此處生成）
    const { deriveAutoTags } = await import('@/lib/case-setup/helpers');
    const tags: string[] = body.tags ?? deriveAutoTags(title, body.budget ?? null);

    const { setupCase } = await import('@/lib/case-setup/orchestrator');
    const result = await setupCase(
      {
        case_id,
        title,
        agency: agency ?? '',
        budget: body.budget ?? null,
        deadline: body.deadline ?? null,
        award_method: body.award_method ?? null,
        pcc_job_number,
        pcc_unit_id: pcc_unit_id ?? '',
        tags,
      },
      accessToken,
    );

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知錯誤';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
