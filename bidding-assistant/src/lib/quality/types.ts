/** 檢查結果嚴重程度 */
export type Severity = "error" | "warning" | "info";

/** 單項檢查結果 */
export interface CheckResult {
  type: Severity;
  rule: string;
  message: string;
  /** 字元位置或段落編號 */
  position?: string;
}

/** 品質分數 */
export interface QualityScore {
  value: number;
  label: string;
  errorCount: number;
  warningCount: number;
  infoCount: number;
}

/** 自訂規則（來自設定） */
export interface CustomRule {
  pattern: string;
  message: string;
  severity: Severity;
}

/** runChecks 所需的規則設定 */
export interface QualityConfig {
  blacklist: string[];
  terminology: { wrong: string; correct: string }[];
  ironLawEnabled: Record<string, boolean>;
  customRules: CustomRule[];
  /** 公司名稱（用於一致性檢查） */
  companyName?: string;
  /** 公司品牌簡稱 */
  companyBrand?: string;
}
