import { describe, it, expect } from "vitest";
import {
  itemAmount,
  calcCategoryTotals,
  calculateSummary,
  formatAmount,
  createEmptyItem,
  getDefaultItems,
} from "../helpers";
import type { CostItem, PricingConfig } from "../types";

// ====== 單筆計算 ======

describe("itemAmount", () => {
  it("數量 × 單價", () => {
    const item: CostItem = {
      id: "1", category: "人事費", name: "主持人", unit: "人月", quantity: 6, unitPrice: 95000,
    };
    expect(itemAmount(item)).toBe(570000);
  });

  it("數量為 0 時回傳 0", () => {
    const item: CostItem = {
      id: "1", category: "業務費", name: "交通", unit: "式", quantity: 0, unitPrice: 50000,
    };
    expect(itemAmount(item)).toBe(0);
  });

  it("單價為 0 時回傳 0", () => {
    const item: CostItem = {
      id: "1", category: "雜支", name: "雜支", unit: "式", quantity: 5, unitPrice: 0,
    };
    expect(itemAmount(item)).toBe(0);
  });

  it("數量為負數時視為 0", () => {
    const item: CostItem = {
      id: "1", category: "人事費", name: "X", unit: "人月", quantity: -3, unitPrice: 50000,
    };
    expect(itemAmount(item)).toBe(0);
  });

  it("單價為負數時視為 0", () => {
    const item: CostItem = {
      id: "1", category: "業務費", name: "X", unit: "式", quantity: 2, unitPrice: -10000,
    };
    expect(itemAmount(item)).toBe(0);
  });
});

// ====== 類別小計 ======

describe("calcCategoryTotals", () => {
  const items: CostItem[] = [
    { id: "1", category: "人事費", name: "A", unit: "人月", quantity: 2, unitPrice: 100000 },
    { id: "2", category: "人事費", name: "B", unit: "人月", quantity: 3, unitPrice: 50000 },
    { id: "3", category: "業務費", name: "C", unit: "式", quantity: 1, unitPrice: 80000 },
    { id: "4", category: "雜支", name: "D", unit: "式", quantity: 1, unitPrice: 20000 },
  ];

  it("正確分類加總", () => {
    const totals = calcCategoryTotals(items);
    expect(totals.人事費).toBe(350000); // 200000 + 150000
    expect(totals.業務費).toBe(80000);
    expect(totals.雜支).toBe(20000);
  });

  it("空陣列全部為 0", () => {
    const totals = calcCategoryTotals([]);
    expect(totals.人事費).toBe(0);
    expect(totals.業務費).toBe(0);
    expect(totals.雜支).toBe(0);
  });

  it("只有一個類別時其他為 0", () => {
    const single: CostItem[] = [
      { id: "1", category: "業務費", name: "X", unit: "式", quantity: 2, unitPrice: 30000 },
    ];
    const totals = calcCategoryTotals(single);
    expect(totals.人事費).toBe(0);
    expect(totals.業務費).toBe(60000);
    expect(totals.雜支).toBe(0);
  });
});

// ====== 完整摘要 ======

describe("calculateSummary", () => {
  const config: PricingConfig = { taxRate: 0.05, managementFeeRate: 0.1 };

  const items: CostItem[] = [
    { id: "1", category: "人事費", name: "主持人", unit: "人月", quantity: 6, unitPrice: 100000 },
    { id: "2", category: "業務費", name: "交通", unit: "式", quantity: 1, unitPrice: 50000 },
    { id: "3", category: "雜支", name: "雜支", unit: "式", quantity: 1, unitPrice: 10000 },
  ];
  // 直接成本: 600000 + 50000 + 10000 = 660000
  // 管理費: 660000 * 0.1 = 66000
  // 小計: 726000
  // 稅: 726000 * 0.05 = 36300
  // 合計: 762300

  it("正確計算直接成本", () => {
    const s = calculateSummary(items, config, 1000000);
    expect(s.directCost).toBe(660000);
  });

  it("正確計算管理費（四捨五入）", () => {
    const s = calculateSummary(items, config, 1000000);
    expect(s.managementFee).toBe(66000);
  });

  it("正確計算小計", () => {
    const s = calculateSummary(items, config, 1000000);
    expect(s.subtotal).toBe(726000);
  });

  it("正確計算稅", () => {
    const s = calculateSummary(items, config, 1000000);
    expect(s.tax).toBe(36300);
  });

  it("正確計算合計", () => {
    const s = calculateSummary(items, config, 1000000);
    expect(s.total).toBe(762300);
  });

  it("未超預算時 overBudget = false", () => {
    const s = calculateSummary(items, config, 1000000);
    expect(s.overBudget).toBe(false);
  });

  it("超預算時 overBudget = true", () => {
    const s = calculateSummary(items, config, 700000);
    expect(s.overBudget).toBe(true);
  });

  it("計算預算使用率", () => {
    const s = calculateSummary(items, config, 1000000);
    expect(s.utilization).toBe("76.2");
  });

  it("預算為 0 時使用率為 '0'", () => {
    const s = calculateSummary(items, config, 0);
    expect(s.utilization).toBe("0");
  });

  it("空項目合計為 0", () => {
    const s = calculateSummary([], config, 1000000);
    expect(s.directCost).toBe(0);
    expect(s.managementFee).toBe(0);
    expect(s.tax).toBe(0);
    expect(s.total).toBe(0);
    expect(s.overBudget).toBe(false);
  });

  it("各類別小計正確帶出", () => {
    const s = calculateSummary(items, config, 1000000);
    expect(s.byCategory.人事費).toBe(600000);
    expect(s.byCategory.業務費).toBe(50000);
    expect(s.byCategory.雜支).toBe(10000);
  });

  it("管理費率為 0 時管理費 = 0", () => {
    const s = calculateSummary(items, { taxRate: 0.05, managementFeeRate: 0 }, 1000000);
    expect(s.managementFee).toBe(0);
    expect(s.subtotal).toBe(660000);
  });

  it("稅率為 0 時稅 = 0", () => {
    const s = calculateSummary(items, { taxRate: 0, managementFeeRate: 0.1 }, 1000000);
    expect(s.tax).toBe(0);
    expect(s.total).toBe(726000);
  });

  it("管理費四捨五入驗證", () => {
    // 直接成本 333333, 管理費率 0.1 → 33333.3 → Math.round → 33333
    const oddItems: CostItem[] = [
      { id: "1", category: "人事費", name: "A", unit: "人月", quantity: 1, unitPrice: 333333 },
    ];
    const s = calculateSummary(oddItems, config, 1000000);
    expect(s.managementFee).toBe(33333);
  });
});

// ====== 工具函式 ======

describe("formatAmount", () => {
  it("加千分位", () => {
    expect(formatAmount(1234567)).toBe("1,234,567");
  });

  it("0 不加分隔", () => {
    expect(formatAmount(0)).toBe("0");
  });

  it("負數加千分位", () => {
    expect(formatAmount(-1234567)).toBe("-1,234,567");
  });

  it("小數", () => {
    expect(formatAmount(1234.56)).toContain("1,234");
  });
});

describe("createEmptyItem", () => {
  it("回傳預設空白項目", () => {
    const item = createEmptyItem();
    expect(item.category).toBe("人事費");
    expect(item.name).toBe("");
    expect(item.unit).toBe("人月");
    expect(item.quantity).toBe(1);
    expect(item.unitPrice).toBe(0);
    expect(item.id).toBeTruthy();
  });
});

describe("getDefaultItems", () => {
  it("回傳 6 個預設項目", () => {
    const items = getDefaultItems();
    expect(items).toHaveLength(6);
  });

  it("包含三種類別", () => {
    const items = getDefaultItems();
    const categories = new Set(items.map((i) => i.category));
    expect(categories).toContain("人事費");
    expect(categories).toContain("業務費");
    expect(categories).toContain("雜支");
  });

  it("每個項目都有正數金額", () => {
    const items = getDefaultItems();
    items.forEach((item) => {
      expect(item.quantity).toBeGreaterThan(0);
      expect(item.unitPrice).toBeGreaterThan(0);
    });
  });
});
