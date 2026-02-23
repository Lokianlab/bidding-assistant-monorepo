/** 成本基礎（來自 pricing 模組） */
export interface CostBase {
  directCost: number;      // 直接成本
  managementFee: number;   // 管理費
  tax: number;             // 營業稅
  subtotal: number;        // 小計（成本 + 管理費 + 稅）
}

/** 議價設定（應用設定的一部分） */
export interface NegotiationConfig {
  minMargin: number;       // 底線利潤率（e.g., 0.05 = 5%）
  expectedMargin: number;  // 預期利潤率（e.g., 0.15 = 15%）
  idealMargin: number;     // 理想利潤率（e.g., 0.20 = 20%）
  maxMargin: number;       // 天花板利潤率（e.g., 0.30 = 30%）
}

/** 報價方案狀態 */
export type QuoteStatus = 'safe' | 'warning' | 'danger' | 'dream';

/** 報價方案 */
export interface QuoteScenario {
  name: string;            // 方案名稱（e.g., "底線", "預案", "讓步 500k"）
  quoteAmount: number;     // 報價金額
  profitAmount: number;    // 利潤金額
  profitRate: number;      // 利潤率（0.15 = 15%）
  status: QuoteStatus;     // 安全性狀態
}

/** 議價分析結果 */
export interface NegotiationAnalysis {
  costBased: QuoteScenario;           // 底線方案
  proposed: QuoteScenario;            // 預案
  target: QuoteScenario;              // 目標
  ceiling: QuoteScenario;             // 天花板
  scenarios: QuoteScenario[];         // 用戶模擬的其他方案
  allowanceAmount: number;            // 可讓步總額（預案 - 底線）
}

/** 成本敏感度分析 — 成本變化對報價的影響 */
export interface SensitivityAnalysis {
  baseCost: number;                   // 基準成本
  scenarios: {
    variation: number;                // 成本變化（e.g., -0.1 = 成本下降 10%）
    costBase: CostBase;               // 變化後的成本基礎
    proposed: QuoteScenario;          // 對應的預案報價
    impact: {
      costChange: number;             // 成本變化金額
      quoteChange: number;            // 報價變化金額
      profitChangeRate: number;       // 利潤率變化（e.g., 0.02 = 上升 2%）
    };
  }[];
}
