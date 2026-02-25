/**
 * 情報快取 Supabase CRUD
 * 對應 intelligence_cache 表
 */

import { createSupabaseServerClient } from './client';
import type { IntelligenceCache, IntelType, IntelSource } from './types';

interface SaveIntelParams {
  case_id: string;
  intel_type: IntelType;
  data: Record<string, unknown>;
  source: IntelSource;
  pcc_unit_id?: string;
  /** 快取有效天數（PCC 7 天、Perplexity 30 天） */
  ttl_days?: number;
}

/** 儲存情報快取（upsert by case_id + intel_type） */
export async function saveIntelCache(params: SaveIntelParams): Promise<IntelligenceCache | null> {
  const supabase = createSupabaseServerClient();
  const expires_at = params.ttl_days
    ? new Date(Date.now() + params.ttl_days * 24 * 60 * 60 * 1000).toISOString()
    : null;

  const { data, error } = await supabase
    .from('intelligence_cache')
    .upsert(
      {
        case_id: params.case_id,
        intel_type: params.intel_type,
        data: params.data,
        source: params.source,
        pcc_unit_id: params.pcc_unit_id ?? null,
        expires_at,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'case_id,intel_type', ignoreDuplicates: false }
    )
    .select()
    .single();

  if (error) {
    // upsert 沒有 unique constraint 時 fallback 到 insert
    const { data: inserted, error: insertErr } = await supabase
      .from('intelligence_cache')
      .insert({
        case_id: params.case_id,
        intel_type: params.intel_type,
        data: params.data,
        source: params.source,
        pcc_unit_id: params.pcc_unit_id ?? null,
        expires_at,
      })
      .select()
      .single();
    if (insertErr) throw insertErr;
    return inserted as IntelligenceCache;
  }

  return data as IntelligenceCache;
}

/** 取得特定案件的特定情報類型 */
export async function getIntelCache(
  caseId: string,
  intelType: IntelType,
): Promise<IntelligenceCache | null> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('intelligence_cache')
    .select('*')
    .eq('case_id', caseId)
    .eq('intel_type', intelType)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  // 檢查是否過期
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return null; // 過期視為無快取
  }

  return data as IntelligenceCache;
}

/** 取得某案件的所有情報 */
export async function getAllIntelForCase(caseId: string): Promise<IntelligenceCache[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('intelligence_cache')
    .select('*')
    .eq('case_id', caseId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as IntelligenceCache[];
}

/** 依機關代碼查詢歷史情報（跨案件） */
export async function getIntelByUnit(unitId: string): Promise<IntelligenceCache[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('intelligence_cache')
    .select('*')
    .eq('pcc_unit_id', unitId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as IntelligenceCache[];
}

/** 清除過期快取 */
export async function purgeExpiredIntel(): Promise<number> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('intelligence_cache')
    .delete()
    .lt('expires_at', new Date().toISOString())
    .select('id');

  if (error) throw error;
  return data?.length ?? 0;
}
