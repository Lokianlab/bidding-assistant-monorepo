/**
 * 知識卡片 Supabase CRUD + 搜尋
 * 對應 knowledge_cards 表
 */

import { createSupabaseServerClient } from './client';
import type { KnowledgeCard } from './types';

type CardInsert = Omit<KnowledgeCard, 'id' | 'indexed_at' | 'updated_at'>;

/** 批次插入卡片（upsert by source_file_id + page_number） */
export async function saveCards(
  cards: CardInsert[],
): Promise<{ saved: number; errors: number }> {
  const supabase = createSupabaseServerClient();
  let saved = 0;
  let errors = 0;

  // 每批 50 張
  for (let i = 0; i < cards.length; i += 50) {
    const batch = cards.slice(i, i + 50);
    const { error } = await supabase
      .from('knowledge_cards')
      .upsert(batch, { onConflict: 'source_file_id,page_number' });

    if (error) {
      errors += batch.length;
    } else {
      saved += batch.length;
    }
  }

  return { saved, errors };
}

/** 全文搜尋卡片 */
export async function searchCards(
  query: string,
  filters?: { category?: string; subcategory?: string; file_type?: string },
  limit = 50,
  offset = 0,
): Promise<{ results: KnowledgeCard[]; total: number }> {
  const supabase = createSupabaseServerClient();
  let q = supabase.from('knowledge_cards').select('*', { count: 'exact' });

  if (query) {
    q = q.textSearch('content_text', query, { type: 'websearch', config: 'simple' });
  }
  if (filters?.category) {
    q = q.eq('category', filters.category);
  }
  if (filters?.subcategory) {
    q = q.eq('subcategory', filters.subcategory);
  }
  if (filters?.file_type) {
    q = q.eq('file_type', filters.file_type);
  }

  const { data, count, error } = await q
    .order('indexed_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return { results: (data ?? []) as KnowledgeCard[], total: count ?? 0 };
}

/** 取得分類統計（樹狀結構用） */
export async function getCategoryStats(): Promise<
  { category: string; subcategory: string | null; count: number }[]
> {
  const supabase = createSupabaseServerClient();
  // Supabase 不直接支援 GROUP BY，用 RPC 或手動聚合
  const { data, error } = await supabase
    .from('knowledge_cards')
    .select('category, subcategory');

  if (error) throw error;

  const stats = new Map<string, number>();
  for (const row of data ?? []) {
    const key = `${row.category}|${row.subcategory ?? ''}`;
    stats.set(key, (stats.get(key) ?? 0) + 1);
  }

  return Array.from(stats.entries()).map(([key, count]) => {
    const [category, subcategory] = key.split('|');
    return { category, subcategory: subcategory || null, count };
  });
}

/** 取得已索引的檔案清單（增量更新比對用） */
export async function getIndexedFiles(): Promise<
  { source_file_id: string; indexed_at: string }[]
> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('knowledge_cards')
    .select('source_file_id, indexed_at')
    .order('source_file_id');

  if (error) throw error;

  // 去重（一個檔案多張卡片，取最新 indexed_at）
  const map = new Map<string, string>();
  for (const row of data ?? []) {
    const existing = map.get(row.source_file_id);
    if (!existing || row.indexed_at > existing) {
      map.set(row.source_file_id, row.indexed_at);
    }
  }

  return Array.from(map.entries()).map(([source_file_id, indexed_at]) => ({
    source_file_id,
    indexed_at,
  }));
}

/** 取得索引狀態 */
export async function getIndexStatus(): Promise<{
  total_cards: number;
  total_files: number;
  last_indexed: string | null;
  scan_errors: number;
}> {
  const supabase = createSupabaseServerClient();

  const [cardsRes, filesRes, errorsRes] = await Promise.all([
    supabase.from('knowledge_cards').select('id', { count: 'exact', head: true }),
    supabase.from('knowledge_cards').select('source_file_id').then(({ data }) => {
      return new Set((data ?? []).map(d => d.source_file_id)).size;
    }),
    supabase.from('knowledge_cards').select('id', { count: 'exact', head: true }).eq('is_scannable', false),
  ]);

  const lastRes = await supabase
    .from('knowledge_cards')
    .select('indexed_at')
    .order('indexed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    total_cards: cardsRes.count ?? 0,
    total_files: filesRes as unknown as number,
    last_indexed: lastRes.data?.indexed_at ?? null,
    scan_errors: errorsRes.count ?? 0,
  };
}

/** 刪除某檔案的所有卡片（重新索引用） */
export async function deleteCardsByFile(sourceFileId: string): Promise<number> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('knowledge_cards')
    .delete()
    .eq('source_file_id', sourceFileId)
    .select('id');

  if (error) throw error;
  return data?.length ?? 0;
}
