/**
 * 知識庫型別定義
 */

export type KBCategory = '00A' | '00B' | '00C' | '00D' | '00E';

export interface KBItem {
  id: string;
  tenant_id: string;
  category: KBCategory;
  title: string;
  content: string;
  tags?: string[];
  parent_id?: string | null;
  created_by: string;
  created_at: string;
  updated_by?: string;
  updated_at?: string;
}

export interface KBListResponse {
  data: KBItem[];
  total: number;
  page: number;
  limit: number;
}

export interface KBListFilters {
  category?: KBCategory;
  search?: string;
  parentId?: string;
  page?: number;
  limit?: number;
}

export interface KBFormData {
  category: KBCategory;
  title: string;
  content: string;
  tags?: string[];
  parentId?: string | null;
}

export interface KBFormErrors {
  category?: string;
  title?: string;
  content?: string;
  tags?: string;
  parentId?: string;
}
