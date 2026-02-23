/**
 * Supabase 客戶端初始化
 *
 * 用途：
 * - 知識庫（00A-00E）的資料庫連接
 * - 多租戶資料隔離
 * - Google OAuth 認證
 *
 * 使用方式：
 * ```ts
 * import { getSupabaseClient } from '@/lib/db/supabase-client';
 *
 * const supabase = getSupabaseClient();
 * // 查詢知識庫
 * const { data, error } = await supabase
 *   .from('kb_items')
 *   .select('*')
 *   .eq('tenant_id', tenantId);
 * ```
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

/**
 * 取得 Supabase 客戶端（單例模式，延遲初始化）
 */
export function getSupabaseClient(): SupabaseClient {
  if (supabaseClient) {
    return supabaseClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Missing Supabase environment variables. ' +
      'Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }

  supabaseClient = createClient(url, anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });

  return supabaseClient;
}

/**
 * 簡寫：取得 Supabase 客戶端
 * 使用 getSupabaseClient() 取代 supabase 以避免構建時錯誤
 */
export const supabase = {
  __placeholder: true,
} as unknown as SupabaseClient;

/**
 * 取得服務器端客戶端（用於 API routes）
 * 注意：只在服務器端使用，不要洩漏 SERVICE_ROLE_KEY
 */
export function getSupabaseServerClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Missing Supabase server environment variables. ' +
      'Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * 取得當前租戶 ID
 * 這是臨時實現，實際應從認證 session 推導
 */
export function getTenantId(): string {
  const tenantId = process.env.NEXT_PUBLIC_TENANT_ID;
  if (!tenantId) {
    throw new Error('NEXT_PUBLIC_TENANT_ID not set');
  }
  return tenantId;
}

/**
 * 建立租戶隔離查詢
 * 自動在所有查詢上加租戶過濾，防止租戶間資料洩漏
 *
 * 使用方式：
 * ```ts
 * const supabase = getSupabaseClient();
 * const { data, error } = await createTenantQuery(
 *   supabase,
 *   tenantId,
 *   'kb_items'
 * )
 *   .select('*')
 *   .order('created_at', { ascending: false });
 * ```
 */
export function createTenantQuery<T extends Record<string, any>>(
  supabase: SupabaseClient,
  tenantId: string,
  tableName: string
) {
  return {
    /**
     * SELECT 查詢
     */
    select: (columns: string = '*') =>
      supabase
        .from(tableName)
        .select(columns)
        .eq('tenant_id', tenantId),

    /**
     * INSERT 操作
     * 自動添加 tenant_id
     */
    insert: (data: Partial<T>) =>
      supabase
        .from(tableName)
        .insert([
          {
            ...data,
            tenant_id: tenantId,
          } as unknown as T,
        ]),

    /**
     * UPDATE 操作
     * 自動限制為該租戶的資料
     */
    update: (data: Partial<T>) =>
      supabase
        .from(tableName)
        .update(data)
        .eq('tenant_id', tenantId),

    /**
     * DELETE 操作
     * 自動限制為該租戶的資料
     */
    delete: () =>
      supabase
        .from(tableName)
        .delete()
        .eq('tenant_id', tenantId),

    /**
     * 直接存取底層 Supabase 物件
     * 用於複雜查詢或自訂邏輯
     */
    raw: () =>
      supabase
        .from(tableName)
        .select('*')
        .eq('tenant_id', tenantId),
  };
}
