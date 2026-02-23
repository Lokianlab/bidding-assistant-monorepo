/**
 * M09 Negotiation Module - Integration Tests
 * Verify helpers + hook work together correctly
 */

import { describe, it, expect } from "vitest";
import { analyzeNegotiation, calculateBaseline, getQuoteStatus } from "../helpers";
import type { CostBase, NegotiationConfig } from "../types";

describe("M09 Integration Tests", () => {
  const testCostBase: CostBase = {
    directCost: 60000,
    managementFee: 10000,
    tax: 10000,
    subtotal: 80000,
  };

  const testConfig: NegotiationConfig = {
    minMargin: 0.05,
    expectedMargin: 0.15,
    idealMargin: 0.2,
    maxMargin: 0.3,
  };

  it("計算流程：成本 → 底線 → 預案 → 目標 → 天花板", () => {
    const baseline = calculateBaseline(testCostBase, testConfig);
    expect(baseline).toBe(84000); // 80000 * 1.05

    const analysis = analyzeNegotiation(testCostBase, testConfig);

    // Verify four scenarios are calculated in order
    expect(analysis.costBased.quoteAmount).toBe(84000);
    expect(analysis.proposed.quoteAmount).toBe(92000);
    expect(analysis.target.quoteAmount).toBe(96000);
    expect(analysis.ceiling.quoteAmount).toBe(104000);

    // Verify profit rates match config
    expect(analysis.costBased.profitRate).toBe(0.05);
    expect(analysis.proposed.profitRate).toBe(0.15);
    expect(analysis.target.profitRate).toBe(0.2);
    expect(analysis.ceiling.profitRate).toBe(0.3);
  });

  it("狀態分級正確分配：danger < warning < safe < dream", () => {
    const analysis = analyzeNegotiation(testCostBase, testConfig);

    expect(analysis.costBased.status).toBe("danger");
    expect(analysis.proposed.status).toBe("safe");
    expect(analysis.target.status).toBe("safe");
    expect(analysis.ceiling.status).toBe("dream");
  });

  it("讓步額度計算正確", () => {
    const analysis = analyzeNegotiation(testCostBase, testConfig);

    // allowanceAmount = proposed - baseline (how much you can concede)
    expect(analysis.allowanceAmount).toBe(92000 - 84000); // 8000
  });

  it("自訂金額狀態判斷邊界", () => {
    const testRates = [
      { rate: 0.05, expected: "danger" }, // exact minMargin
      { rate: 0.08, expected: "warning" }, // slightly above minMargin
      { rate: 0.15, expected: "safe" }, // expectedMargin
      { rate: 0.30, expected: "dream" }, // maxMargin exact
      { rate: 0.35, expected: "dream" }, // above maxMargin
    ];

    for (const { rate, expected } of testRates) {
      const status = getQuoteStatus(rate, testConfig);
      expect(status).toBe(expected);
    }
  });

  it("設定變更反映在所有方案中", () => {
    const customConfig: NegotiationConfig = {
      minMargin: 0.10,
      expectedMargin: 0.20,
      idealMargin: 0.25,
      maxMargin: 0.35,
    };

    const analysis = analyzeNegotiation(testCostBase, customConfig);

    // All quotes should be higher with higher margins
    expect(analysis.costBased.quoteAmount).toBe(88000); // 80000 * 1.10
    expect(analysis.proposed.quoteAmount).toBe(96000); // 80000 * 1.20
    expect(analysis.target.quoteAmount).toBe(100000); // 80000 * 1.25
    expect(analysis.ceiling.quoteAmount).toBe(108000); // 80000 * 1.35
  });

  it("邊界值處理：零成本", () => {
    const zeroCostBase: CostBase = {
      directCost: 0,
      managementFee: 0,
      tax: 0,
      subtotal: 0,
    };

    const analysis = analyzeNegotiation(zeroCostBase, testConfig);

    // Should all be zero, profit rates also zero
    expect(analysis.costBased.quoteAmount).toBe(0);
    expect(analysis.proposed.profitRate).toBe(0);
  });

  it("邊界值處理：非常大的成本", () => {
    const largeCostBase: CostBase = {
      directCost: 1000000,
      managementFee: 100000,
      tax: 100000,
      subtotal: 1200000,
    };

    const analysis = analyzeNegotiation(largeCostBase, testConfig);

    expect(analysis.costBased.quoteAmount).toBe(1260000);
    expect(analysis.proposed.quoteAmount).toBe(1380000);
    expect(analysis.ceiling.quoteAmount).toBe(1560000);

    // Profit rates should still be accurate
    expect(analysis.costBased.profitRate).toBeCloseTo(0.05, 5);
    expect(analysis.proposed.profitRate).toBeCloseTo(0.15, 5);
  });

  it("利潤金額計算準確", () => {
    const analysis = analyzeNegotiation(testCostBase, testConfig);

    // profitAmount = quoteAmount - subtotal
    expect(analysis.costBased.profitAmount).toBe(4000); // 84000 - 80000
    expect(analysis.proposed.profitAmount).toBe(12000); // 92000 - 80000
    expect(analysis.target.profitAmount).toBe(16000); // 96000 - 80000
    expect(analysis.ceiling.profitAmount).toBe(24000); // 104000 - 80000
  });

  it("讓步比例計算正確", () => {
    const analysis = analyzeNegotiation(testCostBase, testConfig);

    // ceiling to proposed: (104000-92000) / (104000-84000) = 12000/20000 = 0.6
    const concessionFromProposedToCeiling =
      (analysis.ceiling.quoteAmount - analysis.proposed.quoteAmount) /
      (analysis.ceiling.quoteAmount - analysis.costBased.quoteAmount);

    expect(concessionFromProposedToCeiling).toBeCloseTo(0.6, 5);
  });

  it("方案命名正確", () => {
    const analysis = analyzeNegotiation(testCostBase, testConfig);

    expect(analysis.costBased.name).toBe("底線");
    expect(analysis.proposed.name).toBe("預案");
    expect(analysis.target.name).toBe("目標");
    expect(analysis.ceiling.name).toBe("天花板");
  });
});
