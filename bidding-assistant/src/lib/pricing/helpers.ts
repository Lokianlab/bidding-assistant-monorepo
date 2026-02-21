import type { CostItem, PricingConfig, PricingSummary, CategoryTotals } from "./types";

/** 計算單筆項目金額 */
export function itemAmount(item: CostItem): number {
  return item.quantity * item.unitPrice;
}

/** 計算各類別小計 */
export function calcCategoryTotals(items: CostItem[]): CategoryTotals {
  return {
    人事費: items.filter((i) => i.category === "人事費").reduce((s, i) => s + itemAmount(i), 0),
    業務費: items.filter((i) => i.category === "業務費").reduce((s, i) => s + itemAmount(i), 0),
    雜支: items.filter((i) => i.category === "雜支").reduce((s, i) => s + itemAmount(i), 0),
  };
}

/** 從費用項目和設定計算完整摘要 */
export function calculateSummary(
  items: CostItem[],
  config: PricingConfig,
  budgetCeiling: number
): PricingSummary {
  const byCategory = calcCategoryTotals(items);
  const directCost = byCategory.人事費 + byCategory.業務費 + byCategory.雜支;
  const managementFee = Math.round(directCost * config.managementFeeRate);
  const subtotal = directCost + managementFee;
  const tax = Math.round(subtotal * config.taxRate);
  const total = subtotal + tax;
  const overBudget = total > budgetCeiling;
  const utilization = budgetCeiling > 0 ? ((total / budgetCeiling) * 100).toFixed(1) : "0";

  return { directCost, managementFee, subtotal, tax, total, overBudget, utilization, byCategory };
}

/** 格式化金額（加千分位） */
export function formatAmount(n: number): string {
  return n.toLocaleString("zh-TW");
}

/** 建立空白項目 */
export function createEmptyItem(): CostItem {
  return {
    id: String(Date.now()),
    category: "人事費",
    name: "",
    unit: "人月",
    quantity: 1,
    unitPrice: 0,
  };
}

/** 政府標案常見的預設經費項目 */
export function getDefaultItems(): CostItem[] {
  return [
    { id: "1", category: "人事費", name: "計畫主持人", unit: "人月", quantity: 6, unitPrice: 95000 },
    { id: "2", category: "人事費", name: "協同主持人", unit: "人月", quantity: 6, unitPrice: 80000 },
    { id: "3", category: "人事費", name: "專任助理", unit: "人月", quantity: 6, unitPrice: 45000 },
    { id: "4", category: "業務費", name: "交通費", unit: "式", quantity: 1, unitPrice: 50000 },
    { id: "5", category: "業務費", name: "印刷費", unit: "式", quantity: 1, unitPrice: 30000 },
    { id: "6", category: "雜支", name: "雜支", unit: "式", quantity: 1, unitPrice: 20000 },
  ];
}
