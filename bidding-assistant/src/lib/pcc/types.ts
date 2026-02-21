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

// ====== 競爭分析型別 ======

/** 競爭對手統計 */
export interface CompetitorStats {
  id: string;          // 統編
  name: string;        // 公司名稱
  encounters: number;  // 撞案次數（同案出現）
  theirWins: number;   // 對手得標次數
  myWins: number;      // 我方得標次數
  agencies: string[];  // 常碰的機關（去重）
}

/** 機關統計 */
export interface AgencyStats {
  unitId: string;
  unitName: string;
  totalCases: number;    // 該機關出現次數
  myWins: number;        // 我方得標
  myLosses: number;      // 我方未得標
  avgBidders: number;    // 平均投標家數
}

/** 自我分析總覽 */
export interface SelfAnalysis {
  totalRecords: number;     // 全部紀錄筆數
  awardRecords: number;     // 決標公告筆數
  wins: number;
  losses: number;
  winRate: number;
  competitors: CompetitorStats[];  // 按撞案次數排序
  agencies: AgencyStats[];         // 按案件數排序
  yearlyStats: { year: number; total: number; wins: number }[];
}

// ====== 市場趨勢型別 ======

/** 單一年度的市場數據 */
export interface YearlyMarketData {
  year: number;
  totalCases: number;           // 全部案件（含招標+決標）
  awardCases: number;           // 決標公告數
  tenderCases: number;          // 招標公告數
  avgBidders: number;           // 平均投標家數（決標案件）
  maxBidders: number;           // 最多投標家數
  minBidders: number;           // 最少投標家數
  topAgencies: string[];        // 該年度最活躍機關（前 3）
}

/** 市場趨勢分析結果 */
export interface MarketTrend {
  keyword: string;
  totalRecords: number;
  yearRange: [number, number];       // [最早年, 最近年]
  yearlyData: YearlyMarketData[];    // 按年度排序
  topAgencies: { name: string; count: number }[];  // 全期最活躍機關
  competitionLevel: "藍海" | "一般" | "紅海";       // 競爭程度判斷
}
