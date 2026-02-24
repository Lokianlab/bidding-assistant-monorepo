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

// ====== 第一階段：情報部門 MVP 型別 ======

/** 情報類型 */
export type IntelType = 'agency_history' | 'competitor' | 'rfp_summary' | 'perplexity' | 'win_assessment';

/** 情報來源 */
export type IntelSource = 'pcc' | 'perplexity' | 'rfp_upload' | 'manual';

/** intelligence_cache 表 */
export interface IntelligenceCache {
  id: string;
  case_id: string;
  intel_type: IntelType;
  data: Record<string, unknown>;
  source: IntelSource | null;
  pcc_unit_id: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

/** knowledge_cards 表 */
export type CardType = 'slide' | 'document_section' | 'image' | 'table';

export interface KnowledgeCard {
  id: string;
  source_file_id: string;
  source_file_name: string;
  source_folder_path: string | null;
  page_number: number | null;
  card_type: CardType;
  title: string | null;
  summary: string;
  content_text: string | null;
  tags: string[];
  category: string | null;
  subcategory: string | null;
  file_type: string | null;
  mime_type: string | null;
  is_scannable: boolean;
  scan_error: string | null;
  drive_url: string | null;
  indexed_at: string;
  updated_at: string;
}

/** 決策類型 */
export type DecisionType = 'bid' | 'no_bid' | 'conditional';

/** decisions 表 */
export interface Decision {
  id: string;
  case_id: string;
  notion_page_id: string | null;
  decision: DecisionType;
  reason: string | null;
  win_assessment_id: string | null;
  decided_by: string;
  decided_at: string;
  notion_created: boolean;
  drive_folder_id: string | null;
  drive_folder_url: string | null;
  created_at: string;
}
