/**
 * M07 外包資源庫 - 型別定義
 * 合作夥伴管理系統的介面與常數
 */

/**
 * 合作夥伴記錄（主要實體）
 */
export interface Partner {
  id: string;
  tenant_id: string;

  // 基本資訊
  name: string;
  category: string[];
  contact_name?: string;
  phone?: string;
  email?: string;
  url?: string;

  // 評分與合作歷史
  rating: number; // 1-5
  notes?: string;
  cooperation_count: number;
  last_used?: string; // ISO 8601

  // 標籤與狀態
  tags: string[];
  status: 'active' | 'archived';

  // 時間戳
  created_at: string;
  updated_at: string;
}

/**
 * 建立/編輯時的輸入資料（不含 id, tenant_id, 時間戳）
 */
export interface PartnerInput {
  name: string;
  category: string[];
  contact_name?: string;
  phone?: string;
  email?: string;
  url?: string;
  rating?: number;
  notes?: string;
  tags?: string[];
}

/**
 * API 回應格式
 */
export interface PartnerResponse {
  success: boolean;
  data?: Partner | Partner[];
  error?: string;
  message?: string;
}

/**
 * 搜尋/篩選參數
 */
export interface PartnerSearchParams {
  search?: string; // 搜尋名稱、聯絡人
  category?: string | string[]; // 專業類別篩選
  status?: 'active' | 'archived' | 'all';
  min_rating?: number;
  tags?: string[];
  sort?: 'name' | 'rating' | 'last_used' | 'created_at';
  order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

/**
 * 使用追蹤（標記已洽詢時的更新）
 */
export interface PartnerUsageUpdate {
  cooperation_count_increment: number; // 通常 +1
  last_used: string; // 新的 last_used 日期
}

/**
 * 驗證結果
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * 專業類別（預設值，可由用戶自訂）
 */
export const DEFAULT_CATEGORIES = [
  '建築設計',
  '工程評估',
  '造價評估',
  '技術顧問',
  '法律顧問',
  '財務顧問',
  '環境評估',
  '市場研究',
  '子承商',
  '供應商',
] as const;

/**
 * 評分標籤（用於 UI）
 */
export const RATING_LABELS: Record<number, string> = {
  1: '不推薦',
  2: '待評估',
  3: '一般',
  4: '推薦',
  5: '高度推薦',
};

/**
 * 狀態標籤
 */
export const STATUS_LABELS: Record<string, string> = {
  active: '活躍',
  archived: '已歸檔',
};

/**
 * 常用標籤
 */
export const COMMON_TAGS = [
  '推薦',
  '新合作',
  '定期合作',
  '需評估',
  '暫不合作',
] as const;

