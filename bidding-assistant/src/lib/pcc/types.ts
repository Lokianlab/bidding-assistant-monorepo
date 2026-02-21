// ====== PCC API 型別定義 ======

/** 搜尋結果中的單筆記錄 */
export interface PCCRecord {
  date: number; // YYYYMMDD format
  filename: string;
  brief: {
    type: string; // e.g. "決標公告", "招標公告"
    title: string;
    companies?: {
      ids: string[];
      names: string[];
      id_key: Record<string, string[]>;
      name_key: Record<string, string[]>;
    };
  };
  job_number: string;
  unit_id: string;
  unit_name: string;
  unit_api_url: string;
  tender_api_url: string;
  unit_url: string;
  url: string;
}

/** 搜尋 API 回應 */
export interface PCCSearchResponse {
  query?: string;
  page: number;
  total_records: number;
  total_pages: number;
  took: number;
  records: PCCRecord[];
}

/** 標案詳情的動態 key-value 結構 */
export type TenderDetailValue = string | Record<string, string> | undefined;

/** 標案詳情 API 回應 */
export interface PCCTenderDetail {
  detail: Record<string, TenderDetailValue>;
  evaluation_committee?: EvaluationCommitteeMember[];
}

/** 評委資料 */
export interface EvaluationCommitteeMember {
  name: string;
  status: string;
  sequence: string;
  attendance: string;
  experience: string;
}

/** 公司在標案中的角色 */
export type CompanyRole = "投標" | "得標" | "未得標";

/** 解析後的公司角色資訊 */
export interface CompanyRoleInfo {
  name: string;
  id?: string;
  roles: CompanyRole[];
}

/** 解析後的標案摘要（從 detail 中擷取關鍵欄位） */
export interface TenderSummary {
  title: string;
  agency: string;
  budget: number | null;
  floorPrice: number | null;
  awardAmount: number | null;
  bidderCount: number | null;
  awardDate: string | null;
  deadline: string | null;
  procurementType: string | null;
  awardMethod: string | null;
}

/** 前端搜尋狀態 */
export type PCCSearchMode = "title" | "company";

/** API route action types */
export type PCCAction =
  | "searchByTitle"
  | "searchByCompany"
  | "getTenderDetail"
  | "listByUnit"
  | "getInfo";
