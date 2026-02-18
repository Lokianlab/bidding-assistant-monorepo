import { describe, it, expect } from "vitest";
import { generateGlobalInsights } from "../global-insights";
import type { NotionPage } from "../../types";
import { F } from "../../types";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

let _pageId = 0;
function mockPage(overrides: Record<string, unknown> = {}): NotionPage {
  _pageId++;
  return {
    id: `insight-page-${_pageId}`,
    url: `https://notion.so/insight-page-${_pageId}`,
    properties: {
      [F.名稱]: `Insight Case ${_pageId}`,
      [F.進程]: "等標期間",
      [F.預算]: 1_000_000,
      [F.押標金]: 10_000,
      [F.領標費]: 2_000,
      [F.企劃主筆]: [],
      [F.招標機關]: "",
      [F.標案類型]: [],
      [F.評審方式]: "",
      [F.投遞序位]: "",
      [F.決策]: "",
      [F.截標]: "",
      ...overrides,
    },
  };
}

// ---------------------------------------------------------------------------
// generateGlobalInsights — empty input
// ---------------------------------------------------------------------------

describe("generateGlobalInsights()", () => {
  it("returns empty insights for empty pages", () => {
    expect(generateGlobalInsights([])).toEqual([]);
  });

  it("returns insights sorted by severity descending", () => {
    // Create a scenario that triggers multiple insights
    const pages: NotionPage[] = [];

    // Writer with high disqualification rate (>20%): triggers bad insight
    for (let i = 0; i < 5; i++) {
      pages.push(
        mockPage({
          [F.企劃主筆]: ["HighDisqual"],
          [F.進程]: i < 2 ? "資格不符" : "得標",
          [F.預算]: 1_000_000,
          [F.招標機關]: "Agency A",
          [F.標案類型]: ["TypeA"],
          [F.評審方式]: "最有利標",
        })
      );
    }

    const insights = generateGlobalInsights(pages);
    // Should be sorted by severity descending
    for (let i = 1; i < insights.length; i++) {
      expect(insights[i].severity).toBeLessThanOrEqual(insights[i - 1].severity);
    }
  });

  // ---------------------------------------------------------------------------
  // (1) Writer disqualification rate insight
  // ---------------------------------------------------------------------------

  describe("writer disqualification insights", () => {
    it("flags writer with >20% disqualification rate (min 2 pages)", () => {
      const pages = [
        mockPage({ [F.企劃主筆]: ["Alice"], [F.進程]: "資格不符" }),
        mockPage({ [F.企劃主筆]: ["Alice"], [F.進程]: "資格不符" }),
        mockPage({ [F.企劃主筆]: ["Alice"], [F.進程]: "得標" }),
      ];
      const insights = generateGlobalInsights(pages);
      const disqInsight = insights.find(
        (i) => i.type === "bad" && i.relatedKey === "Alice" && i.text.includes("資格不符")
      );
      expect(disqInsight).toBeDefined();
      expect(disqInsight!.severity).toBe(95);
    });

    it("does not flag writer with only 1 page", () => {
      const pages = [
        mockPage({ [F.企劃主筆]: ["Solo"], [F.進程]: "資格不符" }),
      ];
      const insights = generateGlobalInsights(pages);
      const disqInsight = insights.find(
        (i) => i.relatedKey === "Solo" && i.text.includes("資格不符")
      );
      expect(disqInsight).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // (1b) Writer withdrawn cost insight
  // ---------------------------------------------------------------------------

  describe("writer withdrawal insights", () => {
    it("warns when writer has >= 2 withdrawn pages", () => {
      const pages = [
        mockPage({ [F.企劃主筆]: ["Bob"], [F.進程]: "領標後未參與", [F.押標金]: 30_000, [F.領標費]: 5_000 }),
        mockPage({ [F.企劃主筆]: ["Bob"], [F.進程]: "逾期未參與", [F.押標金]: 20_000, [F.領標費]: 3_000 }),
        mockPage({ [F.企劃主筆]: ["Bob"], [F.進程]: "得標" }),
      ];
      const insights = generateGlobalInsights(pages);
      const withdrawInsight = insights.find(
        (i) => i.type === "warn" && i.relatedKey === "Bob" && i.text.includes("未參與")
      );
      expect(withdrawInsight).toBeDefined();
      expect(withdrawInsight!.severity).toBe(70);
    });
  });

  // ---------------------------------------------------------------------------
  // (2) Agency insights
  // ---------------------------------------------------------------------------

  describe("agency insights", () => {
    it("flags agency with 0 wins and >= 5 total bids", () => {
      const pages: NotionPage[] = [];
      for (let i = 0; i < 5; i++) {
        pages.push(
          mockPage({
            [F.招標機關]: "Bad Agency",
            [F.進程]: "未獲青睞",
            [F.押標金]: 10_000,
            [F.領標費]: 1_000,
          })
        );
      }
      const insights = generateGlobalInsights(pages);
      const agInsight = insights.find(
        (i) => i.type === "bad" && i.relatedKey === "Bad Agency"
      );
      expect(agInsight).toBeDefined();
      expect(agInsight!.severity).toBe(85);
    });

    it("praises agency with >= 50% win rate and >= 3 total bids", () => {
      const pages = [
        mockPage({ [F.招標機關]: "Good Agency", [F.進程]: "得標" }),
        mockPage({ [F.招標機關]: "Good Agency", [F.進程]: "得標" }),
        mockPage({ [F.招標機關]: "Good Agency", [F.進程]: "未獲青睞" }),
      ];
      const insights = generateGlobalInsights(pages);
      const agInsight = insights.find(
        (i) => i.type === "good" && i.relatedKey === "Good Agency"
      );
      expect(agInsight).toBeDefined();
      expect(agInsight!.severity).toBe(30);
    });
  });

  // ---------------------------------------------------------------------------
  // (3) Method insights
  // ---------------------------------------------------------------------------

  describe("method insights", () => {
    it("flags method with 0% win rate and >= 3 bids", () => {
      const pages = [
        mockPage({ [F.評審方式]: "BadMethod", [F.進程]: "未獲青睞" }),
        mockPage({ [F.評審方式]: "BadMethod", [F.進程]: "流標/廢標" }),
        mockPage({ [F.評審方式]: "BadMethod", [F.進程]: "資格不符" }),
      ];
      const insights = generateGlobalInsights(pages);
      const methodInsight = insights.find(
        (i) => i.type === "bad" && i.relatedKey === "BadMethod"
      );
      expect(methodInsight).toBeDefined();
      expect(methodInsight!.severity).toBe(80);
    });

    it("praises method with >= 50% win rate and >= 3 bids", () => {
      const pages = [
        mockPage({ [F.評審方式]: "GoodMethod", [F.進程]: "得標" }),
        mockPage({ [F.評審方式]: "GoodMethod", [F.進程]: "得標" }),
        mockPage({ [F.評審方式]: "GoodMethod", [F.進程]: "未獲青睞" }),
      ];
      const insights = generateGlobalInsights(pages);
      const methodInsight = insights.find(
        (i) => i.type === "good" && i.relatedKey === "GoodMethod"
      );
      expect(methodInsight).toBeDefined();
      expect(methodInsight!.severity).toBe(25);
    });
  });

  // ---------------------------------------------------------------------------
  // (4) Type insights
  // ---------------------------------------------------------------------------

  describe("type insights", () => {
    it("warns about type with 0% win rate and >= 3 bids", () => {
      const pages = [
        mockPage({ [F.標案類型]: ["BadType"], [F.進程]: "未獲青睞" }),
        mockPage({ [F.標案類型]: ["BadType"], [F.進程]: "流標/廢標" }),
        mockPage({ [F.標案類型]: ["BadType"], [F.進程]: "資格不符" }),
      ];
      const insights = generateGlobalInsights(pages);
      const typeInsight = insights.find(
        (i) => i.type === "warn" && i.relatedKey === "BadType"
      );
      expect(typeInsight).toBeDefined();
      expect(typeInsight!.severity).toBe(60);
    });

    it("praises type with >= 50% win rate and >= 3 bids", () => {
      const pages = [
        mockPage({ [F.標案類型]: ["GoodType"], [F.進程]: "得標" }),
        mockPage({ [F.標案類型]: ["GoodType"], [F.進程]: "得標" }),
        mockPage({ [F.標案類型]: ["GoodType"], [F.進程]: "未獲青睞" }),
      ];
      const insights = generateGlobalInsights(pages);
      const typeInsight = insights.find(
        (i) => i.type === "good" && i.relatedKey === "GoodType"
      );
      expect(typeInsight).toBeDefined();
      expect(typeInsight!.severity).toBe(20);
    });
  });

  // ---------------------------------------------------------------------------
  // (5) Budget range insights
  // ---------------------------------------------------------------------------

  describe("budget range insights", () => {
    it("warns about budget range with 0% win rate and >= 3 bids", () => {
      const pages = [
        mockPage({ [F.預算]: 500_000, [F.進程]: "未獲青睞" }),
        mockPage({ [F.預算]: 800_000, [F.進程]: "流標/廢標" }),
        mockPage({ [F.預算]: 200_000, [F.進程]: "資格不符" }),
      ];
      const insights = generateGlobalInsights(pages);
      const budgetInsight = insights.find(
        (i) => i.type === "warn" && i.text.includes("100萬以下")
      );
      expect(budgetInsight).toBeDefined();
      expect(budgetInsight!.severity).toBe(55);
    });

    it("praises budget range with >= 50% win rate and >= 3 bids", () => {
      const pages = [
        mockPage({ [F.預算]: 500_000, [F.進程]: "得標" }),
        mockPage({ [F.預算]: 800_000, [F.進程]: "得標" }),
        mockPage({ [F.預算]: 200_000, [F.進程]: "未獲青睞" }),
      ];
      const insights = generateGlobalInsights(pages);
      const budgetInsight = insights.find(
        (i) => i.type === "good" && i.text.includes("100萬以下")
      );
      expect(budgetInsight).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // (6) Decision hit rate insights
  // ---------------------------------------------------------------------------

  describe("decision priority insights", () => {
    it("discovers when second priority outperforms first priority", () => {
      const pages: NotionPage[] = [];
      // First priority: 1 win / 3 bids = 33%
      pages.push(mockPage({ [F.決策]: "第一順位", [F.進程]: "得標" }));
      pages.push(mockPage({ [F.決策]: "第一順位", [F.進程]: "未獲青睞" }));
      pages.push(mockPage({ [F.決策]: "第一順位", [F.進程]: "未獲青睞" }));
      // Second priority: 2 wins / 3 bids = 67%
      pages.push(mockPage({ [F.決策]: "第二順位", [F.進程]: "得標" }));
      pages.push(mockPage({ [F.決策]: "第二順位", [F.進程]: "得標" }));
      pages.push(mockPage({ [F.決策]: "第二順位", [F.進程]: "未獲青睞" }));

      const insights = generateGlobalInsights(pages);
      const discoveryInsight = insights.find(
        (i) => i.type === "discovery" && i.text.includes("第一順位")
      );
      expect(discoveryInsight).toBeDefined();
    });

    it("discovers when first and second priority are close (< 5%)", () => {
      const pages: NotionPage[] = [];
      // First priority: 2 wins / 5 bids = 40%
      for (let i = 0; i < 2; i++) {
        pages.push(mockPage({ [F.決策]: "第一順位", [F.進程]: "得標" }));
      }
      for (let i = 0; i < 3; i++) {
        pages.push(mockPage({ [F.決策]: "第一順位", [F.進程]: "未獲青睞" }));
      }
      // Second priority: 2 wins / 5 bids = 40% (same)
      for (let i = 0; i < 2; i++) {
        pages.push(mockPage({ [F.決策]: "第二順位", [F.進程]: "得標" }));
      }
      for (let i = 0; i < 3; i++) {
        pages.push(mockPage({ [F.決策]: "第二順位", [F.進程]: "未獲青睞" }));
      }

      const insights = generateGlobalInsights(pages);
      const discoveryInsight = insights.find(
        (i) => i.type === "discovery" && i.text.includes("差異不大")
      );
      expect(discoveryInsight).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // (7) Global cost insight
  // ---------------------------------------------------------------------------

  describe("global cost insight", () => {
    it("warns when team has >= 3 withdrawn pages", () => {
      const pages = [
        mockPage({ [F.進程]: "領標後未參與", [F.押標金]: 30_000, [F.領標費]: 5_000 }),
        mockPage({ [F.進程]: "逾期未參與", [F.押標金]: 20_000, [F.領標費]: 3_000 }),
        mockPage({ [F.進程]: "領標後未參與", [F.押標金]: 10_000, [F.領標費]: 1_000 }),
      ];
      const insights = generateGlobalInsights(pages);
      const costInsight = insights.find(
        (i) => i.type === "warn" && i.text.includes("沉沒成本")
      );
      expect(costInsight).toBeDefined();
      expect(costInsight!.severity).toBe(72);
    });

    it("does not warn when team has < 3 withdrawn pages", () => {
      const pages = [
        mockPage({ [F.進程]: "領標後未參與" }),
        mockPage({ [F.進程]: "逾期未參與" }),
      ];
      const insights = generateGlobalInsights(pages);
      const costInsight = insights.find(
        (i) => i.text.includes("沉沒成本")
      );
      expect(costInsight).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Insight types are valid
  // ---------------------------------------------------------------------------

  describe("insight structure", () => {
    it("all insights have valid type and severity", () => {
      const pages: NotionPage[] = [];
      // Create enough data to trigger multiple insights
      for (let i = 0; i < 6; i++) {
        pages.push(
          mockPage({
            [F.企劃主筆]: ["TestWriter"],
            [F.招標機關]: "TestAgency",
            [F.進程]: i < 3 ? "資格不符" : "得標",
            [F.標案類型]: ["TestType"],
            [F.評審方式]: "TestMethod",
          })
        );
      }
      const insights = generateGlobalInsights(pages);
      for (const insight of insights) {
        expect(["good", "warn", "bad", "info", "discovery"]).toContain(insight.type);
        expect(typeof insight.severity).toBe("number");
        expect(typeof insight.text).toBe("string");
        expect(insight.text.length).toBeGreaterThan(0);
        expect(typeof insight.icon).toBe("string");
      }
    });
  });
});
