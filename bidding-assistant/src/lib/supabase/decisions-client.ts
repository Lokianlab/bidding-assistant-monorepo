/**
 * 決策記錄 Supabase CRUD
 * 對應 decisions 表
 */

import { createSupabaseServerClient } from './client';
import type { Decision, DecisionType } from './types';

interface CreateDecisionParams {
  case_id: string;
  notion_page_id?: string;
  decision: DecisionType;
  reason?: string;
  win_assessment_id?: string;
  decided_by?: string;
}

/** 建立決策記錄 */
export async function createDecision(params: CreateDecisionParams): Promise<Decision> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('decisions')
    .insert({
      case_id: params.case_id,
      notion_page_id: params.notion_page_id ?? null,
      decision: params.decision,
      reason: params.reason ?? null,
      win_assessment_id: params.win_assessment_id ?? null,
      decided_by: params.decided_by ?? 'Jin',
    })
    .select()
    .single();

  if (error) throw error;
  return data as Decision;
}

/** 取得某案件的決策歷史 */
export async function getDecisionsByCase(caseId: string): Promise<Decision[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('decisions')
    .select('*')
    .eq('case_id', caseId)
    .order('decided_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as Decision[];
}

/** 取得最近的決策（首頁用） */
export async function getRecentDecisions(limit = 50): Promise<Decision[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('decisions')
    .select('*')
    .order('decided_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as Decision[];
}

/** 更新決策的建案結果 */
export async function updateDecisionSetup(
  decisionId: string,
  setup: {
    notion_created?: boolean;
    drive_folder_id?: string;
    drive_folder_url?: string;
  },
): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from('decisions')
    .update(setup)
    .eq('id', decisionId);

  if (error) throw error;
}

/** 按決策類型統計 */
export async function getDecisionStats(): Promise<{
  bid: number;
  no_bid: number;
  conditional: number;
  total: number;
}> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('decisions')
    .select('decision');

  if (error) throw error;

  const stats = { bid: 0, no_bid: 0, conditional: 0, total: 0 };
  for (const row of data ?? []) {
    stats.total++;
    if (row.decision === 'bid') stats.bid++;
    else if (row.decision === 'no_bid') stats.no_bid++;
    else if (row.decision === 'conditional') stats.conditional++;
  }
  return stats;
}
