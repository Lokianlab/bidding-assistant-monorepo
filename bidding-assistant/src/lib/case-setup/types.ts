/** M01 案件建立模組 — 型別定義 */

/** 案件建立輸入 */
export interface CaseSetupInput {
  case_id: string;
  title: string;
  agency: string;
  budget: number | null;
  deadline: string | null; // ISO date
  award_method: string | null;
  pcc_job_number: string;
  pcc_unit_id: string;
}

/** 案件建立結果 */
export interface CaseSetupResult {
  notion_page_id: string | null;
  drive_folder_id: string | null;
  drive_folder_url: string | null;
  steps: SetupStep[];
}

/** 單一步驟執行結果 */
export interface SetupStep {
  step: string;
  success: boolean;
  error?: string;
  duration_ms?: number;
}

/** Drive 資料夾建立輸入 */
export interface DriveCreateFolderInput {
  caseUniqueId: string;
  deadline: string | null;
  title: string;
  parentFolderId: string;
}

/** 鷹架範本複製結果 */
export interface ScaffoldCopyResult {
  copied: number;
  errors: string[];
}

/** Google Drive 檔案/資料夾項目 */
export interface DriveItem {
  id: string;
  name: string;
  mimeType: string;
}
