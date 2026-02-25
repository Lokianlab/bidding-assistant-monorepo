import { NextRequest, NextResponse } from 'next/server';
import { getRecentDecisions } from '@/lib/supabase/decisions-client';

/** 首頁每日簡報資料 */
export interface CaseSummary {
  case_id: string;
  notion_page_id: string | null;
  title: string;
  agency: string;
  budget: number | null;
  deadline: string | null;
  days_left: number | null;
  decision: 'bid' | 'no_bid' | 'conditional' | 'pending';
  award_method: string | null;
  created_at: string;
}

interface DashboardResponse {
  pending: CaseSummary[];
  active: CaseSummary[];
  recent: CaseSummary[];
}

/** GET /api/dashboard — 首頁三區塊資料 */
export async function GET(_request: NextRequest) {
  try {
    // 從 Notion 取案件清單 + 從 Supabase 取決策記錄
    const decisions = await getRecentDecisions(200);

    // 建立決策索引（case_id → decision）
    const decisionMap = new Map<string, string>();
    for (const d of decisions) {
      // 只取最新的決策
      if (!decisionMap.has(d.case_id)) {
        decisionMap.set(d.case_id, d.decision);
      }
    }

    // TODO: 整合 Notion 案件清單
    // 現階段先回傳基於 decisions 表的資料
    const pending: CaseSummary[] = [];
    const active: CaseSummary[] = [];
    const recent: CaseSummary[] = [];

    for (const d of decisions) {
      // 避免重複（一個案件只出現一次）
      const summary: CaseSummary = {
        case_id: d.case_id,
        notion_page_id: d.notion_page_id,
        title: d.case_id, // TODO: 從 Notion 取標題
        agency: '',        // TODO: 從 Notion 取機關
        budget: null,
        deadline: null,
        days_left: null,
        decision: d.decision as CaseSummary['decision'],
        award_method: null,
        created_at: d.created_at,
      };

      switch (d.decision) {
        case 'bid':
          active.push(summary);
          break;
        case 'no_bid':
          recent.push(summary);
          break;
        case 'conditional':
          pending.push(summary);
          break;
      }
    }

    const response: DashboardResponse = { pending, active, recent };
    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知錯誤';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
