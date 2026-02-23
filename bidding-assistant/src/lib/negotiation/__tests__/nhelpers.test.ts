import { describe, it, expect } from "vitest";
import {
  calculateBaseline,
  analyzeNegotiation,
  simulateCompromise,
  simulateMultiple,
  getQuoteStatus,
  formatAmount,
  calculateConcessionRate,
} from "../helpers";
import type { CostBase, NegotiationConfig } from "../types";

describe("Negotiation Helpers", () => {
  const mockCostBase: CostBase = {
    directCost: 1000000,
    managementFee: 100000,
    tax: 110000,
    subtotal: 1210000,
  };

  const mockConfig: NegotiationConfig = {
    minMargin: 0.05,       // 5%
    expectedMargin: 0.15,  // 15%
    idealMargin: 0.2,      // 20%
    maxMargin: 0.3,        // 30%
  };

  describe("calculateBaseline", () => {
    it("應計算正確的底線報價", () => {
      const baseline = calculateBaseline(mockCostBase, mockConfig);
      // 底線 = 1,210,000 * 1.05 = 1,270,500
      expect(baseline).toBe(1270500);
    });

    it("處理空值輸入", () => {
      expect(calculateBaseline(null as any, mockConfig)).toBe(0);
      expect(calculateBaseline(mockCostBase, null as any)).toBe(0);
    });

    it("不同利潤率計算底線", () => {
      const lowConfig = { ...mockConfig, minMargin: 0.03 };
      const result = calculateBaseline(mockCostBase, lowConfig);
      // 1,210,000 * 1.03 = 1,246,300
      expect(result).toBe(1246300);
    });
  });

  describe("analyzeNegotiation", () => {
    it("應生成四個標準方案", () => {
      const analysis = analyzeNegotiation(mockCostBase, mockConfig);

      expect(analysis.costBased.name).toBe("底線");
      expect(analysis.proposed.name).toBe("預案");
      expect(analysis.target.name).toBe("目標");
      expect(analysis.ceiling.name).toBe("天花板");
    });

    it("四個方案的報價順序正確", () => {
      const analysis = analyzeNegotiation(mockCostBase, mockConfig);

      expect(analysis.costBased.quoteAmount).toBeLessThan(analysis.proposed.quoteAmount);
      expect(analysis.proposed.quoteAmount).toBeLessThan(analysis.target.quoteAmount);
      expect(analysis.target.quoteAmount).toBeLessThan(analysis.ceiling.quoteAmount);
    });

    it("計算可讓步額度", () => {
      const analysis = analyzeNegotiation(mockCostBase, mockConfig);
      const expected = analysis.proposed.quoteAmount - analysis.costBased.quoteAmount;
      expect(analysis.allowanceAmount).toBe(expected);
    });

    it("狀態標籤正確", () => {
      const analysis = analyzeNegotiation(mockCostBase, mockConfig);

      expect(analysis.costBased.status).toBe("danger");
      expect(analysis.proposed.status).toBe("safe");
      expect(analysis.target.status).toBe("safe");
      expect(analysis.ceiling.status).toBe("dream");
    });

    it("處理空值輸入", () => {
      const analysis = analyzeNegotiation(null as any, mockConfig);
      expect(analysis.scenarios).toEqual([]);
      expect(analysis.allowanceAmount).toBe(0);
    });
  });

  describe("simulateCompromise", () => {
    it("單一讓步方案計算正確", () => {
      const analysis = analyzeNegotiation(mockCostBase, mockConfig);
      const concessionAmount = 50000;
      const newAmount = analysis.proposed.quoteAmount - concessionAmount;
      const scenario = simulateCompromise(mockCostBase, mockConfig, newAmount);

      expect(scenario.quoteAmount).toBe(newAmount);
      expect(scenario.profitRate).toBeLessThan(mockConfig.expectedMargin);
      expect(scenario.status).toBe("warning");
    });

    it("讓步後跌破底線", () => {
      const baseline = calculateBaseline(mockCostBase, mockConfig);
      const newAmount = baseline - 10000; // 低於底線
      const scenario = simulateCompromise(mockCostBase, mockConfig, newAmount);

      expect(scenario.profitRate).toBeLessThan(mockConfig.minMargin);
      expect(scenario.status).toBe("danger");
    });
  });

  describe("simulateMultiple", () => {
    it("批量模擬多個讓步方案", () => {
      const concessions = [0, 100000, 200000];
      const scenarios = simulateMultiple(mockCostBase, mockConfig, concessions);

      expect(scenarios).toHaveLength(3);
      expect(scenarios[0].quoteAmount).toBeGreaterThan(scenarios[1].quoteAmount);
      expect(scenarios[1].quoteAmount).toBeGreaterThan(scenarios[2].quoteAmount);
    });

    it("空陣列返回空結果", () => {
      const scenarios = simulateMultiple(mockCostBase, mockConfig, []);
      expect(scenarios).toEqual([]);
    });

    it("負值代表加價", () => {
      const scenarios = simulateMultiple(mockCostBase, mockConfig, [-100000]);
      const baseline = calculateBaseline(mockCostBase, mockConfig);

      // -100000 表示加價 100000
      expect(scenarios[0].quoteAmount).toBeGreaterThan(baseline);
    });
  });

  describe("getQuoteStatus", () => {
    it("低於底線為 danger", () => {
      expect(getQuoteStatus(0.03, mockConfig)).toBe("danger");
    });

    it("底線到預期為 warning", () => {
      expect(getQuoteStatus(0.09, mockConfig)).toBe("warning");
    });

    it("預期到理想為 safe", () => {
      expect(getQuoteStatus(0.17, mockConfig)).toBe("safe");
    });

    it("高於理想為 dream", () => {
      expect(getQuoteStatus(0.35, mockConfig)).toBe("dream");
    });

    it("臨界值判斷", () => {
      expect(getQuoteStatus(mockConfig.minMargin, mockConfig)).toBe("danger");
      expect(getQuoteStatus(mockConfig.expectedMargin, mockConfig)).toBe("safe");
      expect(getQuoteStatus(mockConfig.idealMargin, mockConfig)).toBe("safe");
    });
  });

  describe("formatAmount", () => {
    it("格式化金額", () => {
      expect(formatAmount(1000000)).toBe("1,000,000");
      expect(formatAmount(1500000)).toBe("1,500,000");
    });

    it("小數點四捨五入", () => {
      expect(formatAmount(1500500.4)).toBe("1,500,500");
      expect(formatAmount(1500500.6)).toBe("1,500,501");
    });

    it("負數格式化", () => {
      expect(formatAmount(-100000)).toBe("-100,000");
    });
  });

  describe("calculateConcessionRate", () => {
    it("計算讓步百分比", () => {
      const original = 1000000;
      const conceded = 900000;
      const rate = calculateConcessionRate(original, conceded);

      // (1000000 - 900000) / 1000000 = 0.1
      expect(rate).toBeCloseTo(0.1, 5);
    });

    it("零報價時返回 0", () => {
      expect(calculateConcessionRate(0, 500000)).toBe(0);
    });

    it("負數報價處理", () => {
      expect(calculateConcessionRate(-1000000, 500000)).toBe(0);
    });

    it("新報價高於原報價", () => {
      const rate = calculateConcessionRate(1000000, 1100000);
      // (1000000 - 1100000) / 1000000 = -0.1（負值表示加價）
      expect(rate).toBeCloseTo(-0.1, 5);
    });
  });

  describe("邊界條件", () => {
    it("成本為零時", () => {
      const zeroCostBase: CostBase = {
        directCost: 0,
        managementFee: 0,
        tax: 0,
        subtotal: 0,
      };
      const baseline = calculateBaseline(zeroCostBase, mockConfig);
      expect(baseline).toBe(0);
    });

    it("極小成本", () => {
      const smallCostBase: CostBase = {
        directCost: 1,
        managementFee: 0,
        tax: 0,
        subtotal: 1,
      };
      const baseline = calculateBaseline(smallCostBase, mockConfig);
      expect(baseline).toBeGreaterThan(0);
    });

    it("極大成本", () => {
      const largeCostBase: CostBase = {
        directCost: 100000000,
        managementFee: 10000000,
        tax: 11000000,
        subtotal: 121000000,
      };
      const analysis = analyzeNegotiation(largeCostBase, mockConfig);
      expect(analysis.proposed.quoteAmount).toBeGreaterThan(0);
    });
  });
});
