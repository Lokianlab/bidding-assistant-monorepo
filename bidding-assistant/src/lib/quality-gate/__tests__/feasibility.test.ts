import { describe, it, expect } from "vitest";
import {
  checkFeasibility,
  checkBudget,
  checkCommonSense,
} from "../feasibility";
import type { CostItem } from "../types";

// ── checkBudget ─────────────────────────────────────────

describe("checkBudget", () => {
  const sampleCosts: CostItem[] = [
    { description: "人事費", estimatedAmount: 300_000, source: "explicit", confidence: "高" },
    { description: "設備費", estimatedAmount: 100_000, source: "explicit", confidence: "中" },
    { description: "雜支", estimatedAmount: 50_000, source: "inferred", confidence: "低" },
  ];

  it("預算充裕（餘裕 ≥ 30%）", () => {
    const result = checkBudget(sampleCosts, 1_000_000);
    expect(result.verdict).toBe("充裕");
    expect(result.margin).toBeGreaterThan(30);
    expect(result.totalEstimate).toBe(450_000);
  });

  it("預算合理（10% ≤ 餘裕 < 30%）", () => {
    const result = checkBudget(sampleCosts, 600_000);
    expect(result.verdict).toBe("合理");
    expect(result.margin).toBeGreaterThanOrEqual(10);
    expect(result.margin).toBeLessThan(30);
  });

  it("預算緊繃（0% ≤ 餘裕 < 10%）", () => {
    const result = checkBudget(sampleCosts, 490_000);
    expect(result.verdict).toBe("緊繃");
    expect(result.margin).toBeGreaterThanOrEqual(0);
    expect(result.margin).toBeLessThan(10);
  });

  it("預算超支（餘裕 < 0%）", () => {
    const result = checkBudget(sampleCosts, 400_000);
    expect(result.verdict).toBe("超支");
    expect(result.margin).toBeLessThan(0);
  });

  it("空成本清單 → 充裕", () => {
    const result = checkBudget([], 500_000);
    expect(result.verdict).toBe("充裕");
    expect(result.totalEstimate).toBe(0);
    expect(result.margin).toBe(100);
  });

  it("預算為 0 且有成本 → 超支", () => {
    const result = checkBudget(sampleCosts, 0);
    expect(result.verdict).toBe("超支");
  });

  it("低信心度成本項目產生警告", () => {
    const result = checkBudget(sampleCosts, 1_000_000);
    expect(result.warnings.some((w) => w.includes("信心度低"))).toBe(true);
  });

  it("超過一半為推算值時產生警告", () => {
    const inferredCosts: CostItem[] = [
      { description: "A", estimatedAmount: 100_000, source: "inferred", confidence: "中" },
      { description: "B", estimatedAmount: 200_000, source: "inferred", confidence: "中" },
      { description: "C", estimatedAmount: 50_000, source: "explicit", confidence: "高" },
    ];
    const result = checkBudget(inferredCosts, 1_000_000);
    expect(result.warnings.some((w) => w.includes("推算值"))).toBe(true);
  });

  it("餘裕低於自訂門檻產生警告", () => {
    const result = checkBudget(sampleCosts, 500_000, 15);
    expect(result.warnings.some((w) => w.includes("警戒線"))).toBe(true);
  });
});

// ── checkCommonSense ────────────────────────────────────

describe("checkCommonSense", () => {
  it("低預算 + AR/VR → 觸發警告", () => {
    const flags = checkCommonSense(
      "本計畫將採用 VR 虛擬實境技術打造沉浸式體驗。",
      { budget: 300_000 },
    );
    expect(flags).toHaveLength(1);
    expect(flags[0].ruleName).toBe("ar_vr_low_budget");
  });

  it("高預算 + AR/VR → 不觸發", () => {
    const flags = checkCommonSense(
      "本計畫將採用 VR 虛擬實境技術。",
      { budget: 2_000_000 },
    );
    expect(flags).toHaveLength(0);
  });

  it("低人數 + 大數據 → 觸發警告", () => {
    const flags = checkCommonSense(
      "採用大數據分析方法進行研究。",
      { participants: 50 },
    );
    expect(flags).toHaveLength(1);
    expect(flags[0].ruleName).toBe("big_data_low_scale");
  });

  it("高人數 + 大數據 → 不觸發", () => {
    const flags = checkCommonSense(
      "採用大數據分析方法進行研究。",
      { participants: 5000 },
    );
    expect(flags).toHaveLength(0);
  });

  it("低預算 + AI 系統開發 → 觸發", () => {
    const flags = checkCommonSense(
      "本案將自建 AI 模型開發智慧分析平台。",
      { budget: 500_000 },
    );
    expect(flags.some((f) => f.ruleName === "ai_dev_low_budget")).toBe(true);
  });

  it("低預算 + 國際交流 → 觸發", () => {
    const flags = checkCommonSense(
      "安排海外參訪學習先進經驗。",
      { budget: 200_000 },
    );
    expect(flags.some((f) => f.ruleName === "international_low_budget")).toBe(true);
  });

  it("低預算 + 區塊鏈 → 觸發", () => {
    const flags = checkCommonSense(
      "導入區塊鏈技術確保資料不可竄改。",
      { budget: 400_000 },
    );
    expect(flags.some((f) => f.ruleName === "blockchain_no_context")).toBe(true);
  });

  it("空文字不報錯", () => {
    const flags = checkCommonSense("", { budget: 100_000 });
    expect(flags).toHaveLength(0);
  });

  it("正常文字不觸發", () => {
    const flags = checkCommonSense(
      "本公司將依契約規定辦理各項服務工作，並定期提交進度報告。",
      { budget: 300_000 },
    );
    expect(flags).toHaveLength(0);
  });

  it("無上下文時不觸發（預設值不滿足條件）", () => {
    const flags = checkCommonSense(
      "本計畫將採用 VR 技術。",
      {},
    );
    expect(flags).toHaveLength(0);
  });

  it("多條規則可同時觸發", () => {
    const flags = checkCommonSense(
      "本計畫採用 VR 技術並導入區塊鏈確保安全，同時安排海外參訪。",
      { budget: 200_000 },
    );
    expect(flags.length).toBeGreaterThanOrEqual(3);
  });
});

// ── checkFeasibility（整合測試）──────────────────────────

describe("checkFeasibility", () => {
  it("無預算無成本 → 高分", () => {
    const result = checkFeasibility("正常的建議書文字。", [], {});
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.budget).toBeNull();
    expect(result.issues).toHaveLength(0);
  });

  it("預算超支 → score 下降 + error issue", () => {
    const costs: CostItem[] = [
      { description: "人事費", estimatedAmount: 600_000, source: "explicit", confidence: "高" },
      { description: "設備費", estimatedAmount: 500_000, source: "explicit", confidence: "高" },
    ];
    const result = checkFeasibility("正常文字。", costs, { budget: 800_000 });

    expect(result.budget?.verdict).toBe("超支");
    expect(result.score).toBeLessThan(60);
    expect(result.issues.some((i) => i.type === "budget_exceeded")).toBe(true);
  });

  it("預算緊繃 → warning issue", () => {
    const costs: CostItem[] = [
      { description: "人事費", estimatedAmount: 460_000, source: "explicit", confidence: "高" },
    ];
    const result = checkFeasibility("正常文字。", costs, { budget: 500_000 });

    expect(result.budget?.verdict).toBe("緊繃");
    expect(result.issues.some((i) => i.type === "budget_tight")).toBe(true);
  });

  it("常識違規 + 預算超支 → 多個 issue", () => {
    const costs: CostItem[] = [
      { description: "VR開發", estimatedAmount: 500_000, source: "explicit", confidence: "中" },
    ];
    const result = checkFeasibility(
      "本計畫將採用 VR 技術打造沉浸式體驗。",
      costs,
      { budget: 300_000 },
    );

    expect(result.issues.some((i) => i.type === "budget_exceeded")).toBe(true);
    expect(result.issues.some((i) => i.type === "common_sense")).toBe(true);
    expect(result.score).toBeLessThan(40);
  });

  it("enableCommonSense=false 跳過常識檢查", () => {
    const result = checkFeasibility(
      "本計畫採用 VR 技術。",
      [],
      { budget: 100_000 },
      { enableCommonSense: false },
    );
    expect(result.commonSense).toHaveLength(0);
    expect(result.issues.every((i) => i.type !== "common_sense")).toBe(true);
  });

  it("marginMinPercent 可調", () => {
    const costs: CostItem[] = [
      { description: "人事費", estimatedAmount: 400_000, source: "explicit", confidence: "高" },
    ];
    // 餘裕 20%，預設門檻 10% 不會觸發
    const defaultResult = checkFeasibility("正常。", costs, { budget: 500_000 });
    // 門檻調高到 25% 會觸發
    const strictResult = checkFeasibility("正常。", costs, { budget: 500_000 }, { marginMinPercent: 25 });

    expect(defaultResult.issues.filter((i) => i.type === "budget_tight")).toHaveLength(0);
    expect(strictResult.issues.some((i) => i.type === "budget_tight")).toBe(true);
  });

  it("分數不低於 0 也不高於 100", () => {
    const costs: CostItem[] = [
      { description: "A", estimatedAmount: 10_000_000, source: "explicit", confidence: "高" },
    ];
    const result = checkFeasibility(
      "VR 元宇宙 區塊鏈 大數據分析 自建 AI 模型開發 海外參訪。",
      costs,
      { budget: 100_000, participants: 10 },
    );
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});
