// ====== M03 戰略分析引擎：型別定義 ======
// Phase 1: 適配度評分（Fit Scoring）

import type {
  KBEntry00A,
  KBEntry00B,
  KBEntry00C,
  KBEntry00D,
  KBEntry00E,
  KnowledgeBaseData,
} from "@/lib/knowledge-base/types";
import type {
  SelfAnalysis,
  MarketTrend,
  TenderSummary,
} from "@/lib/pcc/types";

// ====== 基礎型別 ======

/** 信心等級 */
export type ConfidenceLevel = "高" | "中" | "低";

/** 投標建議 */
export type FitVerdict = "建議投標" | "值得評估" | "不建議" | "資料不足";

// ====== 評分結果 ======

/** 單一維度評分 */
export interface DimensionScore {
  score: number; // 0-20
  confidence: ConfidenceLevel;
  evidence: string; // 依據什麼算出來的
}

/** 五維適配度評分 */
export interface FitScore {
  total: number; // 0-100
  dimensions: {
    domain: DimensionScore; // 領域匹配
    agency: DimensionScore; // 機關熟悉度
    competition: DimensionScore; // 競爭強度
    scale: DimensionScore; // 規模適合度
    team: DimensionScore; // 團隊可用性
  };
  verdict: FitVerdict;
  reasons: string[]; // 2-3 句判斷理由
  redFlags: string[]; // 紅旗警示
}

// ====== 知識庫匹配 ======

/** 知識庫匹配結果 */
export interface KBMatchResult {
  team: { entry: KBEntry00A; relevance: string }[];
  portfolio: { entry: KBEntry00B; relevance: string }[];
  templates: { entry: KBEntry00C; relevance: string }[];
  risks: { entry: KBEntry00D; relevance: string }[];
  reviews: { entry: KBEntry00E; relevance: string }[];
}

// ====== 輸入介面 ======

/** 情報模組輸入（來自 M01/PCC 模組） */
export interface IntelligenceInputs {
  selfAnalysis: SelfAnalysis | null;
  marketTrend: MarketTrend | null;
  tenderSummary: TenderSummary | null;
}

/** 適配度評分的完整輸入 */
export interface FitScoreInput {
  caseName: string;
  agency: string;
  budget: number | null;
  intelligence: IntelligenceInputs;
  kb: KnowledgeBaseData;
}

// ====== 設定 ======

/** 各維度權重 */
export interface FitWeights {
  domain: number;
  agency: number;
  competition: number;
  scale: number;
  team: number;
}

/** 戰略分析設定 */
export interface StrategySettings {
  fitWeights: FitWeights;
  thresholds: {
    recommend: number; // ≥ 此分建議投標
    evaluate: number; // ≥ 此分值得評估
  };
  maxConcurrentBids: number;
  teamCapacityDays: number;
}
