// ====== 情報模組型別定義 ======
// PCC 情報、競爭分析、RFP 解析、Perplexity 搜尋提示、得標評估

// ====== 機關歷史 ======

/** 機關歷史資料（某機關過去標案的統計） */
export interface AgencyHistoryData {
  unit_id: string;
  unit_name: string;
  total_cases: number;
  cases: AgencyCase[];
  top_winners: TopWinner[];
}

/** 機關的單一決標案件 */
export interface AgencyCase {
  job_number: string;
  title: string;
  award_date: string;
  award_amount: number | null;
  winner_name: string;
  winner_id: string;
  bidder_count: number;
  category: string;            // 從案名關鍵字推導的分類
  all_bidder_names: string[];  // 所有投標廠商名稱
}

/** 機關的常勝廠商 */
export interface TopWinner {
  name: string;
  id: string;
  win_count: number;
  total_amount: number;
  consecutive_years: number;
}

// ====== 競爭對手 ======

/** 競爭對手分析結果 */
export interface CompetitorData {
  competitors: Competitor[];
}

/** 單一競爭對手的完整資料 */
export interface Competitor {
  name: string;
  id: string;
  win_count: number;
  total_amount: number;
  consecutive_years: number;
  other_agencies: string[];
  specializations: string[];
}

// ====== RFP 解析 ======

/** RFP 結構化摘要 */
export interface RFPSummaryData {
  title: string;
  budget: number;
  deadline: string;
  award_method: "most_advantageous_eval" | "most_advantageous_review" | "lowest_price";
  scoring_items: ScoringItem[];
  key_requirements: string[];
  hidden_needs: string[];
  qualification_requirements: string[];
}

/** 評分項目 */
export interface ScoringItem {
  item: string;
  weight: number;
  description: string;
}

// ====== Perplexity 搜尋 ======

/** Perplexity 搜尋結果 */
export interface PerplexityData {
  round: number;
  prompt: string;
  result: string;
  findings: string[];
  timestamp: string;
}

/** Perplexity 搜尋提示（產生給使用者使用） */
export interface PerplexityPrompt {
  round: number;
  title: string;
  prompt: string;
  purpose: string;
}

// ====== 得標評估 ======

/** 得標檢查項目 ID */
export type WinCheckId =
  | "consecutive_winner"
  | "committee_known"
  | "committee_structure"
  | "competitor_track"
  | "strategic_value";

/** 紅綠燈狀態 */
export type TrafficLight = "red" | "yellow" | "green" | "unknown";

/** 單一得標檢查項目 */
export interface WinCheck {
  id: WinCheckId;
  label: string;
  status: TrafficLight;
  evidence: string;
  source: string;
  auto_filled: boolean;
}

/** 得標評估結果 */
export interface WinAssessmentData {
  checks: WinCheck[];
  overall: TrafficLight;
  recommendation: string;
}

// ====== 分年標案分析 ======

/** 按年份+分類+投標家數組別統計 */
export interface YearlyCategoryStat {
  year: number;
  category: string;
  count: number;
  budget_total: number | null;
  award_total: number | null;
}

/** 投標家數組別 */
export type BidderGroup = 'single' | 'two' | 'multi' | 'total';

/** 分年標案分析 */
export interface YearlyAnalysis {
  stats: YearlyCategoryStat[];
  years: number[];
  categories: string[];
}

// ====== 分類競爭對手 ======

/** 某分類中的競爭對手 */
export interface CategoryCompetitor {
  name: string;
  encounter_count: number;
  win_count: number;
}

/** 按分類統計的競爭對手 */
export interface CompetitorByCategory {
  category: string;
  total_cases: number;
  top_competitors: CategoryCompetitor[];
}

// ====== 情報報告（完整匯總） ======

/** 某案件的完整情報報告 */
export interface IntelligenceReport {
  case_id: string;
  agency_history: AgencyHistoryData | null;
  competitors: CompetitorData | null;
  rfp_summary: RFPSummaryData | null;
  perplexity_results: PerplexityData[];
  win_assessment: WinAssessmentData | null;
  updated_at: string;
}
