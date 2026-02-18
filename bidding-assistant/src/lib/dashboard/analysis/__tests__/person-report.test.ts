import { describe, it, expect } from "vitest";
import { buildPersonReport } from "../person-report";
import type { NotionPage } from "../../types";
import { F } from "../../types";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

let _pageId = 0;
function mockPage(overrides: Record<string, unknown> = {}): NotionPage {
  _pageId++;
  return {
    id: `person-page-${_pageId}`,
    url: `https://notion.so/person-page-${_pageId}`,
    properties: {
      [F.名稱]: `Person Case ${_pageId}`,
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
// buildPersonReport — basic
// ---------------------------------------------------------------------------

describe("buildPersonReport()", () => {
  it("returns correct report structure for a person with no pages", () => {
    const report = buildPersonReport("Nobody", [], []);
    expect(report.name).toBe("Nobody");
    expect(report.total).toBe(0);
    expect(report.won).toBe(0);
    expect(report.winRate).toBe(0);
    expect(report.wonBudget).toBe(0);
    expect(report.costTotal).toBe(0);
    expect(report.warnings).toEqual([]);
    expect(report.strengths).toEqual([]);
    expect(report.quarterTrend).toEqual([]);
    expect(report.agencyStats).toEqual([]);
    expect(report.typeStats).toEqual([]);
    expect(report.methodStats).toEqual([]);
    expect(report.budgetRangeStats).toEqual([]);
  });

  it("filters pages to only those belonging to the specified person", () => {
    const allPages = [
      mockPage({ [F.企劃主筆]: ["Alice"], [F.進程]: "得標", [F.預算]: 5_000_000 }),
      mockPage({ [F.企劃主筆]: ["Bob"], [F.進程]: "得標", [F.預算]: 3_000_000 }),
      mockPage({ [F.企劃主筆]: ["Alice", "Bob"], [F.進程]: "未獲青睞" }),
    ];
    const report = buildPersonReport("Alice", allPages, allPages);
    expect(report.total).toBe(2); // pages with Alice as writer
    expect(report.won).toBe(1);
    expect(report.wonBudget).toBe(5_000_000);
  });

  it("computes costTotal from breakdown costBid + costFee", () => {
    const pages = [
      mockPage({
        [F.企劃主筆]: ["Alice"],
        [F.進程]: "得標",
        [F.押標金]: 50_000,
        [F.領標費]: 5_000,
      }),
      mockPage({
        [F.企劃主筆]: ["Alice"],
        [F.進程]: "未獲青睞",
        [F.押標金]: 30_000,
        [F.領標費]: 3_000,
      }),
    ];
    const report = buildPersonReport("Alice", pages, pages);
    expect(report.costTotal).toBe(50_000 + 5_000 + 30_000 + 3_000);
  });

  // ---------------------------------------------------------------------------
  // Warnings
  // ---------------------------------------------------------------------------

  describe("warnings", () => {
    it("warns about high disqualification rate compared to team", () => {
      const alicePages = [
        mockPage({ [F.企劃主筆]: ["Alice"], [F.進程]: "資格不符" }),
        mockPage({ [F.企劃主筆]: ["Alice"], [F.進程]: "資格不符" }),
        mockPage({ [F.企劃主筆]: ["Alice"], [F.進程]: "得標" }),
      ];
      // Team has lower disqualification rate
      const allPages = [
        ...alicePages,
        mockPage({ [F.企劃主筆]: ["Bob"], [F.進程]: "得標" }),
        mockPage({ [F.企劃主筆]: ["Bob"], [F.進程]: "得標" }),
        mockPage({ [F.企劃主筆]: ["Bob"], [F.進程]: "得標" }),
        mockPage({ [F.企劃主筆]: ["Bob"], [F.進程]: "得標" }),
        mockPage({ [F.企劃主筆]: ["Bob"], [F.進程]: "得標" }),
      ];
      const report = buildPersonReport("Alice", alicePages, allPages);
      const disqWarning = report.warnings.find(
        (w) => w.type === "bad" && w.text.includes("資格不符")
      );
      expect(disqWarning).toBeDefined();
    });

    it("produces a milder warning when disqualification rate is near team avg", () => {
      const allPages = [
        mockPage({ [F.企劃主筆]: ["Alice"], [F.進程]: "資格不符" }),
        mockPage({ [F.企劃主筆]: ["Alice"], [F.進程]: "得標" }),
        mockPage({ [F.企劃主筆]: ["Alice"], [F.進程]: "得標" }),
        // Team also has disqualifications
        mockPage({ [F.企劃主筆]: ["Bob"], [F.進程]: "資格不符" }),
        mockPage({ [F.企劃主筆]: ["Bob"], [F.進程]: "得標" }),
        mockPage({ [F.企劃主筆]: ["Bob"], [F.進程]: "得標" }),
      ];
      const report = buildPersonReport("Alice", allPages, allPages);
      const warnInsight = report.warnings.find(
        (w) => w.type === "warn" && w.text.includes("資格不符")
      );
      expect(warnInsight).toBeDefined();
    });

    it("warns about withdrawn pages with cost", () => {
      const pages = [
        mockPage({
          [F.企劃主筆]: ["Alice"],
          [F.進程]: "領標後未參與",
          [F.押標金]: 30_000,
          [F.領標費]: 5_000,
        }),
        mockPage({
          [F.企劃主筆]: ["Alice"],
          [F.進程]: "得標",
        }),
      ];
      const report = buildPersonReport("Alice", pages, pages);
      const withdrawWarning = report.warnings.find(
        (w) => w.text.includes("未參與")
      );
      expect(withdrawWarning).toBeDefined();
    });

    it("warns about high lost rate (>= 40% and >= 3 lost)", () => {
      const pages = [
        mockPage({ [F.企劃主筆]: ["Alice"], [F.進程]: "未獲青睞" }),
        mockPage({ [F.企劃主筆]: ["Alice"], [F.進程]: "未獲青睞" }),
        mockPage({ [F.企劃主筆]: ["Alice"], [F.進程]: "未獲青睞" }),
        mockPage({ [F.企劃主筆]: ["Alice"], [F.進程]: "未獲青睞" }),
        mockPage({ [F.企劃主筆]: ["Alice"], [F.進程]: "得標" }),
      ];
      const report = buildPersonReport("Alice", pages, pages);
      const lostWarning = report.warnings.find(
        (w) => w.type === "bad" && w.text.includes("未獲青睞")
      );
      expect(lostWarning).toBeDefined();
    });

    it("warns about low win rate vs team", () => {
      const alicePages: NotionPage[] = [];
      for (let i = 0; i < 5; i++) {
        alicePages.push(
          mockPage({
            [F.企劃主筆]: ["Alice"],
            [F.進程]: i === 0 ? "得標" : "未獲青睞",
          })
        );
      }
      // Team with higher win rate
      const teamPages: NotionPage[] = [
        ...alicePages,
        ...Array.from({ length: 10 }, () =>
          mockPage({ [F.企劃主筆]: ["Bob"], [F.進程]: "得標" })
        ),
      ];
      const report = buildPersonReport("Alice", alicePages, teamPages);
      const winRateWarning = report.warnings.find(
        (w) => w.type === "warn" && w.text.includes("得標率")
      );
      expect(winRateWarning).toBeDefined();
    });

    it("warns about agency losing streak (0 wins and >= 3 bids)", () => {
      const pages = [
        mockPage({ [F.企劃主筆]: ["Alice"], [F.招標機關]: "Bad Agency", [F.進程]: "未獲青睞" }),
        mockPage({ [F.企劃主筆]: ["Alice"], [F.招標機關]: "Bad Agency", [F.進程]: "流標/廢標" }),
        mockPage({ [F.企劃主筆]: ["Alice"], [F.招標機關]: "Bad Agency", [F.進程]: "資格不符" }),
      ];
      const report = buildPersonReport("Alice", pages, pages);
      const agencyWarning = report.warnings.find(
        (w) => w.type === "bad" && w.text.includes("Bad Agency")
      );
      expect(agencyWarning).toBeDefined();
    });

    it("sorts warnings by severity descending", () => {
      // Create enough data to trigger multiple warnings
      const pages = [
        mockPage({ [F.企劃主筆]: ["Alice"], [F.進程]: "資格不符" }),
        mockPage({ [F.企劃主筆]: ["Alice"], [F.進程]: "未獲青睞" }),
        mockPage({ [F.企劃主筆]: ["Alice"], [F.進程]: "領標後未參與", [F.押標金]: 10_000 }),
        mockPage({ [F.企劃主筆]: ["Alice"], [F.進程]: "得標" }),
      ];
      const teamPages = [
        ...pages,
        ...Array.from({ length: 10 }, () =>
          mockPage({ [F.企劃主筆]: ["Bob"], [F.進程]: "得標" })
        ),
      ];
      const report = buildPersonReport("Alice", pages, teamPages);
      for (let i = 1; i < report.warnings.length; i++) {
        expect(report.warnings[i].severity).toBeLessThanOrEqual(
          report.warnings[i - 1].severity
        );
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Strengths
  // ---------------------------------------------------------------------------

  describe("strengths", () => {
    it("identifies high win rate compared to team as a strength", () => {
      const alicePages = [
        mockPage({ [F.企劃主筆]: ["Alice"], [F.進程]: "得標" }),
        mockPage({ [F.企劃主筆]: ["Alice"], [F.進程]: "得標" }),
        mockPage({ [F.企劃主筆]: ["Alice"], [F.進程]: "未獲青睞" }),
      ];
      // Team with lower win rate
      const allPages = [
        ...alicePages,
        ...Array.from({ length: 10 }, () =>
          mockPage({ [F.企劃主筆]: ["Bob"], [F.進程]: "未獲青睞" })
        ),
      ];
      const report = buildPersonReport("Alice", alicePages, allPages);
      const winStrength = report.strengths.find(
        (s) => s.type === "good" && s.text.includes("得標率")
      );
      expect(winStrength).toBeDefined();
    });

    it("identifies strong type performance as a strength", () => {
      const pages = [
        mockPage({ [F.企劃主筆]: ["Alice"], [F.標案類型]: ["StrongType"], [F.進程]: "得標" }),
        mockPage({ [F.企劃主筆]: ["Alice"], [F.標案類型]: ["StrongType"], [F.進程]: "得標" }),
        mockPage({ [F.企劃主筆]: ["Alice"], [F.標案類型]: ["StrongType"], [F.進程]: "未獲青睞" }),
      ];
      const report = buildPersonReport("Alice", pages, pages);
      const typeStrength = report.strengths.find(
        (s) => s.type === "good" && s.text.includes("StrongType")
      );
      expect(typeStrength).toBeDefined();
    });

    it("identifies strong agency performance as a strength", () => {
      const pages = [
        mockPage({ [F.企劃主筆]: ["Alice"], [F.招標機關]: "Home Agency", [F.進程]: "得標" }),
        mockPage({ [F.企劃主筆]: ["Alice"], [F.招標機關]: "Home Agency", [F.進程]: "得標" }),
        mockPage({ [F.企劃主筆]: ["Alice"], [F.招標機關]: "Home Agency", [F.進程]: "未獲青睞" }),
      ];
      const report = buildPersonReport("Alice", pages, pages);
      const agencyStrength = report.strengths.find(
        (s) => s.type === "good" && s.text.includes("Home Agency")
      );
      expect(agencyStrength).toBeDefined();
    });

    it("identifies strong method performance as a strength", () => {
      const pages = [
        mockPage({ [F.企劃主筆]: ["Alice"], [F.評審方式]: "GoodMethod", [F.進程]: "得標" }),
        mockPage({ [F.企劃主筆]: ["Alice"], [F.評審方式]: "GoodMethod", [F.進程]: "得標" }),
        mockPage({ [F.企劃主筆]: ["Alice"], [F.評審方式]: "GoodMethod", [F.進程]: "未獲青睞" }),
      ];
      const report = buildPersonReport("Alice", pages, pages);
      const methodStrength = report.strengths.find(
        (s) => s.type === "good" && s.text.includes("GoodMethod")
      );
      expect(methodStrength).toBeDefined();
    });

    it("sorts strengths by severity descending", () => {
      const pages = [
        mockPage({ [F.企劃主筆]: ["Alice"], [F.標案類型]: ["TypeA"], [F.招標機關]: "AgencyA", [F.評審方式]: "MethodA", [F.進程]: "得標" }),
        mockPage({ [F.企劃主筆]: ["Alice"], [F.標案類型]: ["TypeA"], [F.招標機關]: "AgencyA", [F.評審方式]: "MethodA", [F.進程]: "得標" }),
        mockPage({ [F.企劃主筆]: ["Alice"], [F.標案類型]: ["TypeA"], [F.招標機關]: "AgencyA", [F.評審方式]: "MethodA", [F.進程]: "未獲青睞" }),
      ];
      // Make team worse so Alice's win rate is a strength
      const allPages = [
        ...pages,
        ...Array.from({ length: 10 }, () =>
          mockPage({ [F.企劃主筆]: ["Bob"], [F.進程]: "未獲青睞" })
        ),
      ];
      const report = buildPersonReport("Alice", pages, allPages);
      for (let i = 1; i < report.strengths.length; i++) {
        expect(report.strengths[i].severity).toBeLessThanOrEqual(
          report.strengths[i - 1].severity
        );
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Quarter trend
  // ---------------------------------------------------------------------------

  describe("quarter trend", () => {
    it("generates quarter trend from deadline dates", () => {
      const pages = [
        mockPage({
          [F.企劃主筆]: ["Alice"],
          [F.進程]: "得標",
          [F.截標]: "2024-01-15",
        }),
        mockPage({
          [F.企劃主筆]: ["Alice"],
          [F.進程]: "未獲青睞",
          [F.截標]: "2024-01-20",
        }),
        mockPage({
          [F.企劃主筆]: ["Alice"],
          [F.進程]: "得標",
          [F.截標]: "2024-04-10",
        }),
      ];
      const report = buildPersonReport("Alice", pages, pages);
      expect(report.quarterTrend.length).toBeGreaterThanOrEqual(2);

      const q1 = report.quarterTrend.find((q) => q.quarter === "2024 Q1");
      expect(q1).toBeDefined();
      expect(q1!.submitted).toBe(2);
      expect(q1!.won).toBe(1);
      expect(q1!.winRate).toBe(50);

      const q2 = report.quarterTrend.find((q) => q.quarter === "2024 Q2");
      expect(q2).toBeDefined();
      expect(q2!.submitted).toBe(1);
      expect(q2!.won).toBe(1);
      expect(q2!.winRate).toBe(100);
    });

    it("sorts quarter trend chronologically", () => {
      const pages = [
        mockPage({ [F.企劃主筆]: ["Alice"], [F.截標]: "2024-07-15", [F.進程]: "得標" }),
        mockPage({ [F.企劃主筆]: ["Alice"], [F.截標]: "2024-01-15", [F.進程]: "得標" }),
        mockPage({ [F.企劃主筆]: ["Alice"], [F.截標]: "2024-10-15", [F.進程]: "得標" }),
      ];
      const report = buildPersonReport("Alice", pages, pages);
      for (let i = 1; i < report.quarterTrend.length; i++) {
        expect(report.quarterTrend[i].quarter > report.quarterTrend[i - 1].quarter).toBe(true);
      }
    });

    it("skips pages without deadline dates", () => {
      const pages = [
        mockPage({ [F.企劃主筆]: ["Alice"], [F.截標]: "", [F.進程]: "得標" }),
        mockPage({ [F.企劃主筆]: ["Alice"], [F.截標]: null, [F.進程]: "得標" }),
      ];
      const report = buildPersonReport("Alice", pages, pages);
      expect(report.quarterTrend).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Sub-dimension stats
  // ---------------------------------------------------------------------------

  describe("sub-dimension stats", () => {
    it("provides agencyStats for the person", () => {
      const pages = [
        mockPage({ [F.企劃主筆]: ["Alice"], [F.招標機關]: "Agency A", [F.進程]: "得標" }),
        mockPage({ [F.企劃主筆]: ["Alice"], [F.招標機關]: "Agency B", [F.進程]: "未獲青睞" }),
      ];
      const report = buildPersonReport("Alice", pages, pages);
      expect(report.agencyStats.length).toBe(2);
    });

    it("provides typeStats for the person", () => {
      const pages = [
        mockPage({ [F.企劃主筆]: ["Alice"], [F.標案類型]: ["TypeA"], [F.進程]: "得標" }),
      ];
      const report = buildPersonReport("Alice", pages, pages);
      expect(report.typeStats.length).toBe(1);
      expect(report.typeStats[0].key).toBe("TypeA");
    });

    it("provides methodStats for the person", () => {
      const pages = [
        mockPage({ [F.企劃主筆]: ["Alice"], [F.評審方式]: "Method1", [F.進程]: "得標" }),
      ];
      const report = buildPersonReport("Alice", pages, pages);
      expect(report.methodStats.length).toBe(1);
    });

    it("provides budgetRangeStats for the person", () => {
      const pages = [
        mockPage({ [F.企劃主筆]: ["Alice"], [F.預算]: 500_000, [F.進程]: "得標" }),
        mockPage({ [F.企劃主筆]: ["Alice"], [F.預算]: 15_000_000, [F.進程]: "得標" }),
      ];
      const report = buildPersonReport("Alice", pages, pages);
      expect(report.budgetRangeStats.length).toBe(2);
    });
  });

  // ---------------------------------------------------------------------------
  // Quarter decline detection
  // ---------------------------------------------------------------------------

  describe("quarter decline detection", () => {
    it("warns about 3 consecutive quarters of declining win rate", () => {
      const pages = [
        // Q1: 100% (1/1)
        mockPage({ [F.企劃主筆]: ["Alice"], [F.截標]: "2024-01-15", [F.進程]: "得標" }),
        // Q2: 50% (1/2)
        mockPage({ [F.企劃主筆]: ["Alice"], [F.截標]: "2024-04-15", [F.進程]: "得標" }),
        mockPage({ [F.企劃主筆]: ["Alice"], [F.截標]: "2024-04-20", [F.進程]: "未獲青睞" }),
        // Q3: 0% (0/2)
        mockPage({ [F.企劃主筆]: ["Alice"], [F.截標]: "2024-07-15", [F.進程]: "未獲青睞" }),
        mockPage({ [F.企劃主筆]: ["Alice"], [F.截標]: "2024-07-20", [F.進程]: "未獲青睞" }),
      ];
      const report = buildPersonReport("Alice", pages, pages);
      const declineWarning = report.warnings.find(
        (w) => w.text.includes("持續下滑")
      );
      // Q1=100%, Q2=50%, Q3=0%: decline of 100 - 0 = 100 > 10
      expect(declineWarning).toBeDefined();
    });
  });
});
