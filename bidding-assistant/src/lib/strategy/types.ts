// ====== M03 戰略分析引擎：型別定義 ======

import type { KBEntry00A, KBEntry00B, KBEntry00C, KBEntry00D, KBEntry00E, KnowledgeBaseData } from "@/lib/knowledge-base/types";
import type { SelfAnalysis, MarketTrend, TenderSummary } from "@/lib/pcc/types";
import type { CommitteeAnalysis } from "@/lib/pcc/committee-analysis";

// Re-export for convenience
export type { KBEntry00A, KBEntry00B, KBEntry00C, KBEntry00D, KBEntry00E, KnowledgeBaseData };
export type { SelfAnalysis, MarketTrend, TenderSummary, CommitteeAnalysis };

// ====== 適配度評分 ======

/** 五個評分維度的 key */
export type DimensionKey = "domain" | "agency" | "competition" | "scale" | "team";

/** 適配度判定結果 */
export type FitVerdict = "建議投標" | "值得評估" | "不建議" | "資料不足";

/** 信心等級 */
export type Confidence = "高" | "中" | "低";

/** 單一維度的評分結果 */
export interface DimensionScore {
  score: number;          // 0-20
  confidence: Confidence;
  evidence: string;       // 依據什麼算出來的
}

/** 五維適配度評分結果 */
export interface FitScore {
  total: number;                  // 0-100
  dimensions: Record<DimensionKey, DimensionScore>;
  verdict: FitVerdict;
  reasons: string[];              // 2-3 句判斷理由
  redFlags: string[];             // 紅旗警示
}

/** 各維度權重設定 */
export type FitWeights = Record<DimensionKey, number>;

/** 決策門檻 */
export interface VerdictThresholds {
  recommend: number;    // >= 此分數 → 建議投標
  evaluate: number;     // >= 此分數 → 值得評估；< 此分數 → 不建議
}

// ====== M01 情報輸入 ======

/**
 * 機關情報（鏡像自 useAgencyIntel 的輸出）。
 * M03 定義自己的輸入契約，Hook 層負責轉換。
 */
export interface AgencyIntel {
  totalCases: number;
  recentCases: { title: string; date: number; winner: string | null; bidders: number }[];
  incumbents: { name: string; wins: number }[];
  myHistory: { title: string; date: number; won: boolean }[];
}

/** M03 需要的 M01 資料（由 Hook 在呼叫時組裝） */
export interface IntelligenceInputs {
  selfAnalysis: SelfAnalysis | null;
  agencyIntel: AgencyIntel | null;
  marketTrend: MarketTrend | null;
  committeeAnalysis: CommitteeAnalysis | null;
  tenderSummary: TenderSummary | null;
}

// ====== 知識庫匹配 ======

/** 單筆匹配結果 */
export interface KBMatchEntry<T> {
  entry: T;
  relevance: string;    // 匹配原因
}

/** 知識庫匹配結果 */
export interface KBMatchResult {
  team: KBMatchEntry<KBEntry00A>[];
  portfolio: KBMatchEntry<KBEntry00B>[];
  templates: KBMatchEntry<KBEntry00C>[];
  risks: KBMatchEntry<KBEntry00D>[];
  reviews: KBMatchEntry<KBEntry00E>[];
}

// ====== 設定 ======

/** 戰略分析模組設定 */
export interface StrategySettings {
  fitWeights: FitWeights;
  thresholds: VerdictThresholds;
  maxConcurrentBids: number;
  teamCapacityDays: number;
}
