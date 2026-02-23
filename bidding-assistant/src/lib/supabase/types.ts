/**
 * Supabase 数据库类型定义
 * 与 KB schema 对应
 */

export type KBId = "00A" | "00B" | "00C" | "00D" | "00E";
export type KBEntryStatus = "active" | "draft" | "archived";

/**
 * KB 主表的类型定义
 * 存储所有知识库条目（团队、实绩、时程、SOP、检讨）
 */
export interface KBEntry {
  id: string; // UUID
  tenant_id: string; // 多租户隔离
  category: KBId; // 00A-00E
  entry_id: string; // 人类可读 ID（M-001, P-2025-001 等）
  status: KBEntryStatus;
  data: Record<string, any>; // JSONB，存储各类别的完整欄位
  search_text?: string; // 全文搜尋用，由数据库生成
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

/**
 * KB 元数据表
 * 存储各租户的 KB 设定与统计
 */
export interface KBMetadata {
  tenant_id: string;
  version: number;
  last_synced: string | null; // ISO timestamp
  settings: Record<string, any>; // 自訂選項等
  created_at: string;
  updated_at: string;
}

/**
 * KB 附件表
 * 存储原始文件（Word/PDF/Excel）的索引
 */
export interface KBAttachment {
  id: string; // UUID
  tenant_id: string;
  entry_id: string | null; // 可为空，如果条目被删除
  filename: string;
  storage_path: string; // Supabase Storage path: {tenant_id}/{category}/{filename}
  mime_type: string;
  size_bytes: number;
  created_at: string;
}

/**
 * API 请求/响应类型
 */
export interface KBCreateRequest {
  category: KBId;
  data: Record<string, any>;
}

export interface KBUpdateRequest {
  category: KBId;
  entry_id: string;
  data: Record<string, any>;
}

export interface KBSearchRequest {
  query: string;
  categories?: KBId[];
  status?: KBEntryStatus;
  limit?: number;
  offset?: number;
}

export interface KBSearchResponse {
  results: KBEntry[];
  total: number;
}

export type KBStatsResponse = {
  [key in KBId]: {
    total: number;
    active: number;
    draft: number;
    archived: number;
  };
};

export interface KBImportRequest {
  entries: Array<{
    category: KBId;
    data: Record<string, any>;
  }>;
  mode: "append" | "replace";
}

export interface KBImportResponse {
  imported: number;
  errors: Array<{
    index: number;
    error: string;
  }>;
}

export interface KBExportRequest {
  format: "json" | "markdown";
  categories?: KBId[];
  status?: KBEntryStatus;
}
