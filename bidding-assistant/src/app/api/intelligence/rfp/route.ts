import { NextRequest, NextResponse } from 'next/server';
import { saveIntelCache } from '@/lib/supabase/intel-client';

/**
 * POST /api/intelligence/rfp
 * RFP 上傳解析
 *
 * 接收 multipart/form-data：file + case_id
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const caseId = formData.get('case_id') as string | null;

    if (!file || !caseId) {
      return NextResponse.json(
        { error: '缺少必要欄位：file, case_id' },
        { status: 400 },
      );
    }

    // 讀取檔案內容
    const buffer = Buffer.from(await file.arrayBuffer());

    // 動態載入文字提取（知識庫模組）
    let extractedText = '';
    try {
      const { extractFromBuffer } = await import('@/lib/knowledge/text-extractor');
      const pages = await extractFromBuffer(buffer, file.type, file.name);
      extractedText = pages
        .filter(p => p.is_scannable && p.text)
        .map(p => p.text)
        .join('\n\n');
    } catch {
      // 如果提取失敗，嘗試直接當文字讀
      extractedText = buffer.toString('utf-8').substring(0, 50000);
    }

    if (!extractedText.trim()) {
      return NextResponse.json({
        error: '無法從檔案中提取文字。可能是掃描型 PDF。',
        rfp_summary: null,
      });
    }

    // 嘗試用 Claude CLI 解析
    let rfpSummary;
    try {
      const { parseRFPText } = await import('@/lib/intelligence/rfp-parser');
      rfpSummary = await parseRFPText(extractedText);
    } catch {
      // Claude CLI 不可用，回傳原始文字
      rfpSummary = {
        title: file.name.replace(/\.[^.]+$/, ''),
        budget: 0,
        deadline: '',
        award_method: 'unknown',
        scoring_items: [],
        key_requirements: [],
        hidden_needs: [],
        qualification_requirements: [],
        raw_text: extractedText.substring(0, 5000),
      };
    }

    // 存入快取
    await saveIntelCache({
      case_id: caseId,
      intel_type: 'rfp_summary',
      data: rfpSummary as unknown as Record<string, unknown>,
      source: 'rfp_upload',
      ttl_days: 365,
    });

    return NextResponse.json({ rfp_summary: rfpSummary });
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知錯誤';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
