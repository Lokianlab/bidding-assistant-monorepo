/**
 * P0 行政巡標自動化 — 共用型別定義
 *
 * 此檔為四層（A/B/C/D）的共用介面規格。
 * 所有施工機器只讀不改。需要修改請在快照裡提出，JDNE 統一更新。
 *
 * @see docs/plans/P0-patrol-automation.md
 */

// ============================================================
// Layer A → Layer C：PCC 原始資料
// ============================================================

/** PCC 搜尋結果（單筆公告，未分類） */
export interface PccAnnouncementRaw {
  title: string;           // 標案名稱（原始）
  budget: number | null;   // 預算金額（NT$）
  agency: string;          // 招標機關
  deadline: string;        // 截標時間（ISO 8601）
  publishDate: string;     // 公告日（ISO 8601）
  jobNumber: string;       // 案號
  unitId: string;          // 機關 ID（PCC 內部用）
  url: string;             // PCC 公告 URL
}

/** PCC 完整公告詳情（Layer A 提供給 Layer B/C） */
export interface PccTenderDetail extends PccAnnouncementRaw {
  awardType: string | null;      // 決標方式
  category: string | null;       // 標案類型（PCC 原始分類）
  contractPeriod: string | null; // 履約期限
  description: string | null;    // 工作說明 / 採購說明
}

// ============================================================
// Layer C：分類與業務邏輯
// ============================================================

/** 巡標分類結果 */
export type PatrolCategory =
  | 'definite'      // 絕對可以
  | 'needs_review'  // 需要讀細節
  | 'skip'          // 先不要
  | 'others';       // 留給別人

/** 巡標人操作狀態 */
export type PatrolStatus = 'new' | 'accepted' | 'rejected';

/** 分類後的公告（Layer C 輸出，Layer D 消費） */
export interface PatrolItem {
  id: string;                    // 內部唯一 ID（格式：{unitId}-{jobNumber}）
  title: string;                 // 標案名稱
  budget: number | null;         // 預算金額（NT$）
  agency: string;                // 招標機關
  deadline: string;              // 截標時間（ISO 8601）
  publishDate: string;           // 公告日（ISO 8601）
  jobNumber: string;             // 案號
  unitId: string;                // 機關 ID
  url: string;                   // PCC 公告 URL
  category: PatrolCategory;      // 分類結果
  status: PatrolStatus;          // 巡標人操作狀態
}

/** 分類規則（可從設定頁面編輯） */
export interface ClassificationRule {
  category: PatrolCategory;
  keywords: string[];            // 標題關鍵字（比對用）
  budgetMax?: number;            // 預算上限（如 1_000_000 = 100萬）
}

// ============================================================
// Layer C → Layer B：寫入請求
// ============================================================

/** Notion 建檔輸入（Layer C 組裝，Layer B 寫入） */
export interface NotionCaseCreateInput {
  title: string;              // 標案名稱
  jobNumber: string;          // 案號
  agency: string;             // 招標機關
  budget: number | null;      // 預算金額
  publishDate: string;        // 公告日
  deadline: string;           // 截標時間
  awardType?: string;         // 決標方式
  category?: string[];        // 標案類型（已轉換為 Notion 選項值）
  description?: string;       // 工作說明
}

/** Notion 建檔結果 */
export interface NotionCaseCreateResult {
  success: boolean;
  notionPageId?: string;      // Notion 頁面 ID
  caseUniqueId?: string;      // 案件唯一碼（Notion auto_increment_id）
  error?: string;
}

/** Notion 更新輸入（摘要/情蒐回寫） */
export interface NotionCaseUpdateInput {
  notionPageId: string;
  summary?: string;           // 工作項目摘要
  intelligenceReport?: string; // 情蒐結果（寫進頁面內容）
  progressFlags?: string[];   // 備標進度標記（如「摘要完成」「情蒐完成」）
}

/** Notion 更新結果 */
export interface NotionCaseUpdateResult {
  success: boolean;
  error?: string;
}

// ============================================================
// Layer B：Drive 寫入
// ============================================================

/** Drive 建資料夾輸入 */
export interface DriveCreateFolderInput {
  caseUniqueId: string;       // 案件唯一碼
  publishDate: string;        // 公告日（用來轉民國年）
  title: string;              // 標案名稱
}

/** Drive 建資料夾結果 */
export interface DriveCreateFolderResult {
  success: boolean;
  folderId?: string;          // Google Drive 資料夾 ID
  folderUrl?: string;         // Google Drive 資料夾連結
  error?: string;
}

// ============================================================
// Layer C：一鍵上新完整結果
// ============================================================

/** 一鍵上新的完整回傳（按「要」後的所有結果） */
export interface AcceptResult {
  notion: NotionCaseCreateResult;
  drive: DriveCreateFolderResult;
  summary: string;
  intelligence: string;
}

// ============================================================
// 搜尋排程
// ============================================================

/** 搜尋狀態 */
export interface PatrolSearchStatus {
  lastSearchTime: string | null;  // 上次搜尋時間（ISO 8601）
  totalResults: number;           // 搜尋結果總數
  isSearching: boolean;           // 是否正在搜尋
}
