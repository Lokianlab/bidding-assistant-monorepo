// ====== 巡標自動化：型別定義 ======

/** 關鍵字分類 */
export type KeywordCategory = "must" | "review" | "exclude" | "other";

/** 關鍵字規則 */
export interface KeywordRule {
  /** 分類 */
  category: Exclude<KeywordCategory, "other">;
  /** 比對關鍵字（支援字串，多個時任一命中即可） */
  keywords: string[];
  /** 預算上限（選填，低於此值自動歸入該類） */
  budgetMax?: number;
  /** UI 顯示標籤 */
  label: string;
}

/** 篩選結果 */
export interface Classification {
  /** 分類結果 */
  category: KeywordCategory;
  /** 命中的規則標籤 */
  matchedLabel: string;
  /** 命中的關鍵字（可能多個） */
  matchedKeywords: string[];
}

/** PCC 搜尋結果的精簡版（供巡標用） */
export interface ScanTender {
  /** 標案名稱 */
  title: string;
  /** 招標機關 */
  unit: string;
  /** 案號 */
  jobNumber: string;
  /** 預算金額（元） */
  budget: number;
  /** 截標時間（ISO date string） */
  deadline: string;
  /** 公告日（ISO date string） */
  publishDate: string;
  /** PCC 公告 URL */
  url: string;
  /** 標案類型 */
  category?: string;
}

/** 一筆掃描結果（標案 + 分類） */
export interface ScanResult {
  tender: ScanTender;
  classification: Classification;
}

/** 巡標掃描總結 */
export interface ScanSummary {
  /** 掃描時間 */
  scannedAt: string;
  /** 使用的關鍵字 */
  searchKeywords: string[];
  /** 全部結果 */
  results: ScanResult[];
  /** 各類數量 */
  counts: Record<KeywordCategory, number>;
}
