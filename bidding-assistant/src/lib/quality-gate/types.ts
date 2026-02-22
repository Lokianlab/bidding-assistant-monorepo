/** M04 品質閘門模組 — 型別定義 */

/** 知識庫 ID */
export type KBId = "00A" | "00B" | "00C" | "00D" | "00E";

/** 來源引用 */
export interface KBSourceRef {
  kbId: KBId;
  entryId: string;    // "M-001" | "P-2025-001" 等
  field: string;      // 哪個欄位對應到這個宣稱
  matchedText: string; // 實際比對到的 KB 內容片段
}

/** 幻覺偵測旗標 */
export interface HallucinationFlag {
  patternName: string;           // 模式名稱
  matchedText: string;           // 觸發此旗標的原文片段
  message: string;               // 說明為什麼這可能是幻覺
  startIndex: number;            // 在原始文字中的起始位置
  endIndex: number;
}

/** 句子層級的來源標記 */
export interface SourceAnnotation {
  sentenceIndex: number;
  claim: string;                               // 宣稱的句子
  source: KBSourceRef | null;                  // null = 無法追溯
  hallucinations: HallucinationFlag[];         // 此句子觸發的幻覺旗標
  confidence: "verified" | "partial" | "unverified";
}

/** 閘門 1 事實查核結果 */
export interface FactCheckResult {
  annotations: SourceAnnotation[];
  verifiedCount: number;
  partialCount: number;
  unverifiedCount: number;
  hallucinationCount: number;
  /** 0-100，unverified 和 hallucination 越多分越低 */
  score: number;
  issues: FactCheckIssue[];
}

/** 事實查核問題項目 */
export interface FactCheckIssue {
  severity: "error" | "warning";
  type: "hallucination" | "unverified_claim" | "missing_source";
  message: string;
  context: string;  // 原文片段
}

/** 知識庫條目（用於來源比對，由呼叫端傳入） */
export interface KBEntry {
  kbId: KBId;
  entryId: string;
  searchableFields: Record<string, string>;  // fieldName → 內容
}

/** 事實查核設定 */
export interface FactCheckOptions {
  /** 無依據宣稱超過幾個才報 error（預設 3） */
  unverifiedThreshold?: number;
  /** 幻覺旗標超過幾個才報 error（預設 2） */
  hallucinationThreshold?: number;
  /** 是否跳過來源追溯（只做幻覺偵測） */
  skipSourceTrace?: boolean;
}

// ── 閘門 2：需求追溯 ──────────────────────────────────────

/** 招標需求項目 */
export interface Requirement {
  id: string;                   // "R-01"
  source: string;               // "評分項目第3條" | "資格條件"
  description: string;          // 需求描述
  weight: number | null;        // 評分權重 0-100（如有）
  category: "評分" | "資格" | "交付" | "格式";
}

/** 單一需求的覆蓋結果 */
export interface CoverageResult {
  requirementId: string;
  status: "covered" | "partial" | "missing";
  coveredBy: string[];          // 匹配到的段落摘要
  matchScore: number;           // 0-1 匹配分數
  gap: string | null;           // 缺口描述
}

/** 需求追溯矩陣 */
export interface RequirementMatrix {
  requirements: Requirement[];
  coverage: CoverageResult[];
  uncoveredCount: number;
  coverageRate: number;         // 0-100%
}

/** 閘門 2 結果 */
export interface RequirementTraceResult {
  matrix: RequirementMatrix;
  /** 0-100，按覆蓋率和需求權重加權計算 */
  score: number;
  issues: RequirementTraceIssue[];
}

/** 需求追溯問題項目 */
export interface RequirementTraceIssue {
  severity: "error" | "warning";
  type: "missing_requirement" | "partial_coverage" | "low_coverage";
  message: string;
  context: string;
}

/** 閘門 2 選項 */
export interface RequirementTraceOptions {
  /** 關鍵字匹配分數 ≥ 此值視為 covered（預設 0.5） */
  coverageThreshold?: number;
  /** 關鍵字匹配分數 ≥ 此值視為 partial（預設 0.2） */
  partialThreshold?: number;
}

// ── 閘門 3：實務檢驗 ──────────────────────────────────────

/** 成本項目 */
export interface CostItem {
  description: string;
  estimatedAmount: number;
  source: "explicit" | "inferred";
  confidence: "高" | "中" | "低";
}

/** 預算可行性結果 */
export interface BudgetFeasibility {
  totalBudget: number;
  estimatedCosts: CostItem[];
  totalEstimate: number;
  margin: number;               // 餘裕百分比 (budget - estimate) / budget * 100
  verdict: "充裕" | "合理" | "緊繃" | "超支";
  warnings: string[];
}

/** 常識檢查結果項目 */
export interface CommonSenseFlag {
  ruleName: string;
  matchedText: string;
  message: string;
}

/** 案件背景資訊（用於常識檢查的上下文） */
export interface FeasibilityContext {
  budget?: number;
  durationMonths?: number;
  teamSize?: number;
  participants?: number;
}

/** 閘門 3 選項 */
export interface FeasibilityOptions {
  /** 預算餘裕低於此百分比才警告（預設 10） */
  marginMinPercent?: number;
  /** 是否啟用常識檢查（預設 true） */
  enableCommonSense?: boolean;
}

/** 閘門 3 結果 */
export interface FeasibilityResult {
  budget: BudgetFeasibility | null;
  commonSense: CommonSenseFlag[];
  /** 0-100 */
  score: number;
  issues: FeasibilityIssue[];
}

/** 實務檢驗問題項目 */
export interface FeasibilityIssue {
  severity: "error" | "warning";
  type: "budget_exceeded" | "budget_tight" | "common_sense" | "unrealistic";
  message: string;
  context: string;
}

// ── 品質報告（四道閘門合併） ──────────────────────────────

/** 四道閘門合併的品質報告 */
export interface QualityReport {
  /** 閘門 0（現有品質模組） */
  gate0: {
    score: number;
    label: string;
    errorCount: number;
    warningCount: number;
  };
  /** 閘門 1 事實查核 */
  gate1: FactCheckResult;
  /** 閘門 2 需求追溯（null = 沒有需求清單，跳過） */
  gate2: RequirementTraceResult | null;
  /** 閘門 3 實務檢驗 */
  gate3: FeasibilityResult;
  /** 四道閘門加權平均分數 */
  overallScore: number;
  /** 總評 */
  verdict: "通過" | "有風險" | "不建議提交";
  /** 所有嚴重程度為 error 的問題 */
  criticalIssues: string[];
}

/** 品質報告選項 */
export interface QualityReportOptions {
  /** 總評「通過」門檻分數（預設 70） */
  passThreshold?: number;
  /** 總評「有風險」門檻分數（預設 50） */
  riskThreshold?: number;
  /** 各閘門權重（加總應為 1） */
  weights?: {
    gate0: number;
    gate1: number;
    gate2: number;
    gate3: number;
  };
}
