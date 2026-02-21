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
  /** 無來源宣稱超過幾個才報 error（預設 3） */
  unverifiedThreshold?: number;
  /** 幻覺旗標超過幾個才報 error（預設 2） */
  hallucinationThreshold?: number;
  /** 是否跳過來源追溯（只做幻覺偵測） */
  skipSourceTrace?: boolean;
}
