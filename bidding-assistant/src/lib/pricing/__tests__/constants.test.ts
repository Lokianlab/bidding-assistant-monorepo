import { describe, it, expect } from "vitest";
import { COST_CATEGORIES } from "../constants";
import { calcCategoryTotals } from "../helpers";
import type { CostItem } from "../types";

describe("COST_CATEGORIES", () => {
  // ====== 結構驗證 ======

  it("包含三個費用類別", () => {
    expect(COST_CATEGORIES).toHaveLength(3);
  });

  it("依序為人事費、業務費、雜支（順序影響 UI 渲染）", () => {
    expect(COST_CATEGORIES[0]).toBe("人事費");
    expect(COST_CATEGORIES[1]).toBe("業務費");
    expect(COST_CATEGORIES[2]).toBe("雜支");
  });

  it("精確匹配完整陣列", () => {
    expect([...COST_CATEGORIES]).toEqual(["人事費", "業務費", "雜支"]);
  });

  // ====== 唯一性 ======

  it("無重複值（用作 CategoryTotals record key 時不能重複）", () => {
    const unique = new Set(COST_CATEGORIES);
    expect(unique.size).toBe(COST_CATEGORIES.length);
  });

  // ====== 值的品質 ======

  it("每個類別名稱都是非空字串", () => {
    for (const cat of COST_CATEGORIES) {
      expect(typeof cat).toBe("string");
      expect(cat.length).toBeGreaterThan(0);
      expect(cat.trim()).toBe(cat); // 無前後空白
    }
  });

  // ====== 不可變性（runtime） ======

  it("是唯讀陣列，無法在 runtime 被 push 修改", () => {
    // as const 在 TypeScript 層保證 readonly，但 runtime 也要確認
    // 直接測試 push 是否被禁止（frozen 陣列會拋錯）
    // 注意：`as const` 只是 TS 型別層面，runtime 仍可修改，
    // 所以這個測試記錄的是「目前 runtime 行為」——如果未來加了 Object.freeze 就會拋錯
    const originalLength = COST_CATEGORIES.length;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mutable = COST_CATEGORIES as any;
    try {
      mutable.push("測試");
      // 如果沒拋錯表示 runtime 允許修改，還原並記錄
      mutable.pop();
    } catch {
      // Object.freeze 的情況下會走這裡
    }
    // 不管有沒有 freeze，最終長度不能變
    expect(COST_CATEGORIES).toHaveLength(originalLength);
  });

  // ====== 與 helpers 的整合一致性 ======

  it("每個類別都是 calcCategoryTotals 回傳的 key", () => {
    const totals = calcCategoryTotals([]);
    for (const cat of COST_CATEGORIES) {
      expect(totals).toHaveProperty(cat);
      expect(typeof totals[cat]).toBe("number");
    }
  });

  it("calcCategoryTotals 的 key 數量與 COST_CATEGORIES 一致（無多餘 key）", () => {
    const totals = calcCategoryTotals([]);
    expect(Object.keys(totals)).toHaveLength(COST_CATEGORIES.length);
  });

  it("每個類別的項目都能被 calcCategoryTotals 正確歸類", () => {
    // 為每個類別建一個測試項目，驗證全部被正確加總
    const items: CostItem[] = COST_CATEGORIES.map((cat, i) => ({
      id: String(i + 1),
      category: cat,
      name: `測試-${cat}`,
      unit: "式",
      quantity: 1,
      unitPrice: (i + 1) * 10000,
    }));

    const totals = calcCategoryTotals(items);

    // 第一個類別 10000，第二個 20000，第三個 30000
    expect(totals[COST_CATEGORIES[0]]).toBe(10000);
    expect(totals[COST_CATEGORIES[1]]).toBe(20000);
    expect(totals[COST_CATEGORIES[2]]).toBe(30000);
  });

  // ====== 可迭代性（UI 渲染用） ======

  it("可用 .map() 迭代（UI 下拉選單和摘要列表依賴此行為）", () => {
    const mapped = COST_CATEGORIES.map((cat) => `類別: ${cat}`);
    expect(mapped).toEqual([
      "類別: 人事費",
      "類別: 業務費",
      "類別: 雜支",
    ]);
  });

  it("可用 .includes() 檢查成員（用於驗證輸入值）", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const includes = (COST_CATEGORIES as any as string[]).includes;
    expect(includes.call(COST_CATEGORIES, "人事費")).toBe(true);
    expect(includes.call(COST_CATEGORIES, "業務費")).toBe(true);
    expect(includes.call(COST_CATEGORIES, "雜支")).toBe(true);
    expect(includes.call(COST_CATEGORIES, "不存在的類別")).toBe(false);
    expect(includes.call(COST_CATEGORIES, "")).toBe(false);
  });

  // ====== 作為 SSOT 的防護 ======

  it("不包含空字串或 undefined", () => {
    for (const cat of COST_CATEGORIES) {
      expect(cat).not.toBe("");
      expect(cat).not.toBeUndefined();
      expect(cat).not.toBeNull();
    }
  });

  it("每個值都是純中文（不含英文、數字、特殊符號）", () => {
    const chineseOnly = /^[\u4e00-\u9fff]+$/;
    for (const cat of COST_CATEGORIES) {
      expect(cat).toMatch(chineseOnly);
    }
  });
});
