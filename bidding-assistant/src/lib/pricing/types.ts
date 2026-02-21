/** 費用項目類別 */
export type CostCategory = "人事費" | "業務費" | "雜支";

/** 單筆費用項目 */
export interface CostItem {
  id: string;
  category: CostCategory;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
}

/** 計算用設定（來自 settings.modules.pricing） */
export interface PricingConfig {
  taxRate: number;
  managementFeeRate: number;
}

/** 各類別小計 */
export type CategoryTotals = Record<CostCategory, number>;

/** 費用摘要（計算結果） */
export interface PricingSummary {
  /** 直接成本（所有項目小計加總） */
  directCost: number;
  /** 管理費 */
  managementFee: number;
  /** 小計（直接成本 + 管理費） */
  subtotal: number;
  /** 營業稅 */
  tax: number;
  /** 合計（小計 + 稅） */
  total: number;
  /** 是否超出預算 */
  overBudget: boolean;
  /** 預算使用率（百分比字串，如 "95.2"） */
  utilization: string;
  /** 各類別小計 */
  byCategory: CategoryTotals;
}
