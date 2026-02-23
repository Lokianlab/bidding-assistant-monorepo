/**
 * M11 結案飛輪 - 生成摘要
 *
 * POST /api/cases/close/generate-summary
 * 調用 AI API 生成案件結案摘要
 */

import { NextRequest, NextResponse } from 'next/server';
import type { CaseSummary } from '@/lib/case-closing/types';

/**
 * 輔助函式：從 Notion 獲取案件資訊
 * （這裡暫用 mock 資訊，實際應從 Supabase/Notion 取得）
 */
async function getCaseInfo(caseId: string) {
  // TODO: 從 Supabase 查詢 cases 表獲取案件詳情
  // 暫時返回 mock 資訊
  return {
    caseId,
    caseName: `標案 #${caseId.slice(-4)}`,
    bidStatus: 'awarded',
    value: 1000000,
    duration: '3 months',
    challenges: '需求變更、資源限制',
    outcomes: '按時交付，客戶滿意',
  };
}

/**
 * Mock AI 摘要生成（實際可調用 Claude API）
 */
async function generateAISummary(caseInfo: any): Promise<{
  what_we_did: string;
  what_we_learned: string;
  next_time_notes: string;
  suggested_tags: string[];
}> {
  // TODO: 實際可調用 Claude API 或其他 LLM
  // 目前使用 mock 實裝
  const prompt = `
案件名稱: ${caseInfo.caseName}
狀態: ${caseInfo.bidStatus}
案件金額: ${caseInfo.value}
持續時間: ${caseInfo.duration}
遇到的挑戰: ${caseInfo.challenges}
交付成果: ${caseInfo.outcomes}

請提供三段結案摘要：
1. 我們完成了什麼 (whatWeDid)
2. 我們學到了什麼 (whatWeLearned)
3. 下次要注意的事項 (nextTimeNotes)

並提議 3-5 個相關標籤。
  `.trim();

  // 這裡可以調用真實的 LLM API，例如：
  // const response = await fetch('https://api.openai.com/v1/chat/completions', {...})
  // 或 Anthropic Claude API

  // 現在返回 mock 摘要
  return {
    what_we_did: `完成了 ${caseInfo.caseName} 的全部交付。克服了 ${caseInfo.challenges} 等挑戰，確保 ${caseInfo.outcomes}。`,
    what_we_learned: '需求變更管理的重要性。早期與客戶確立清晰的變更流程能有效降低延期風險。資源規劃需要提前 2-3 周預留緩衝時間。',
    next_time_notes: '1. 在需求簽署前進行更詳細的可行性評估\n2. 建立專案開始前的風險識別會議\n3. 每週固定與客戶的進度同步會議\n4. 提前規劃資源分配和備用方案',
    suggested_tags: ['客戶溝通', '需求管理', '時程管理', '資源規劃'],
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { case_id } = body;

    // 驗證輸入
    if (!case_id) {
      return NextResponse.json(
        { error: '缺少必要參數：case_id' },
        { status: 400 }
      );
    }

    // 獲取案件資訊
    const caseInfo = await getCaseInfo(case_id);

    // 生成 AI 摘要
    const summary = await generateAISummary(caseInfo);

    // 驗證摘要完整性
    if (
      !summary.what_we_did?.trim() ||
      !summary.what_we_learned?.trim() ||
      !summary.next_time_notes?.trim()
    ) {
      return NextResponse.json(
        { error: '生成的摘要內容不完整' },
        { status: 400 }
      );
    }

    return NextResponse.json(summary, { status: 200 });
  } catch (error: any) {
    console.error('[M11] generate-summary error:', error);
    return NextResponse.json(
      { error: error.message || '摘要生成失敗' },
      { status: 500 }
    );
  }
}
