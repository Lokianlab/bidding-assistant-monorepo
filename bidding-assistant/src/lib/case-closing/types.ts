/**
 * M11 結案飛輪 - 型別定義
 *
 * 核心型別：
 * - CaseSummary: 結案摘要（AI 生成或人工編輯）
 * - CaseAssessment: 結案評分與標籤
 * - CaseLearning: 完整結案學習記錄（DB）
 * - SuccessPattern: 成功模式識別結果
 */

/**
 * 結案摘要（AI 生成的三段落）
 */
export interface CaseSummary {
  caseId: string;
  caseName: string;
  sections: {
    whatWeDid: string;       // 第一段：完成了什麼
    whatWeLearned: string;   // 第二段：學到了什麼
    nextTimeNotes: string;   // 第三段：下次注意
  };
  suggestedTags: string[];   // AI 建議的標籤
}

/**
 * 結案評分與標籤（用戶輸入）
 */
export interface CaseAssessment {
  strategyScore: number;      // 1-10：策略評分
  executionScore: number;     // 1-10：執行評分
  satisfactionScore: number;  // 1-10：客戶滿意度
  tags: string[];             // 用戶選擇的標籤
  customNotes?: string;       // 額外註記
}

/**
 * 計算得出的總評分
 */
export interface AggregateScore {
  strategy: number;
  execution: number;
  satisfaction: number;
  total: number;  // (strategy + execution + satisfaction) / 3
}

/**
 * 結案學習記錄（完整，寫入 DB）
 */
export interface CaseLearning {
  id: string;                  // UUID
  caseId: string;              // 案件 ID
  tenantId: string;            // 多租戶隔離
  title: string;               // 結案記錄標題
  whatWeDid: string;
  whatWeLearned: string;
  nextTimeNotes: string;
  tags: string[];
  strategyScore: number;
  executionScore: number;
  satisfactionScore: number;
  kbItemId?: string;           // 寫入 KB 後的引用
  createdAt: string;           // ISO 時間戳
  updatedAt: string;
}

/**
 * 知識庫項目（寫入 KB 的格式）
 */
export interface KBItemFromClosing {
  title: string;
  content: string;             // 三段落摘要 + 標籤
  caseId: string;
  category: "case_closing";
  tags: string[];
  metadata: {
    bidType?: string;          // 標案類型
    caseSize?: string;         // 案件規模
    durationMonths?: number;
    strategyScore: number;
    executionScore: number;
    satisfactionScore: number;
  };
}

/**
 * 成功模式識別結果
 */
export interface SuccessPattern {
  pattern: string;              // 成功要點描述
  frequency: number;            // 出現次數
  avgScores: {
    strategy: number;
    execution: number;
    satisfaction: number;
  };
}

/**
 * 成功模式查詢回應
 */
export interface SuccessPatternsResponse {
  patterns: SuccessPattern[];
}

/**
 * 結案 UI 狀態
 */
export type ClosingUIState = "initial" | "generating" | "generated" | "saving" | "complete" | "error";

/**
 * Hook 返回值：useCaseClosing
 */
export interface UseCaseClosingReturn {
  // 資料
  summary: CaseSummary | null;
  assessment: CaseAssessment | null;
  aggregateScore: AggregateScore | null;
  savedKBItemId: string | null;

  // 狀態
  isLoading: boolean;
  isGenerating: boolean;
  isSaving: boolean;
  error: string | null;

  // 操作
  generateSummary: (caseId: string, caseName: string) => Promise<void>;
  updateAssessment: (assessment: Partial<CaseAssessment>) => void;
  saveToKB: () => Promise<string>;  // 返回 KB item ID
  complete: () => Promise<void>;    // 完成結案

  // 工具函式
  calculateTotal: () => number;
}
