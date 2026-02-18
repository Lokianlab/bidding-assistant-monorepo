import { describe, it, expect } from "vitest";
import {
  BUDGET_RANGES,
  getBudgetRange,
  buildBreakdown,
  groupByField,
  analyzeByWriter,
  analyzeByAgency,
  analyzeByType,
  analyzeByMethod,
  analyzeByBudgetRange,
  analyzeByPriority,
  analyzeByDecision,
} from "../breakdown";
import type { NotionPage } from "../../types";
import { F } from "../../types";

// ---------------------------------------------------------------------------
// Test helpers — mock NotionPage factory
// ---------------------------------------------------------------------------

let _pageId = 0;
function mockPage(overrides: Record<string, unknown> = {}): NotionPage {
  _pageId++;
  return {
    id: `page-${_pageId}`,
    url: `https://notion.so/page-${_pageId}`,
    properties: {
      [F.名稱]: `Test Case ${_pageId}`,
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
      ...overrides,
    },
  };
}

// ---------------------------------------------------------------------------
// BUDGET_RANGES
// ---------------------------------------------------------------------------

describe("BUDGET_RANGES", () => {
  it("has 5 ranges covering 0 to Infinity", () => {
    expect(BUDGET_RANGES).toHaveLength(5);
    expect(BUDGET_RANGES[0].min).toBe(0);
    expect(BUDGET_RANGES[BUDGET_RANGES.length - 1].max).toBe(Infinity);
  });

  it("ranges are contiguous (each max equals next min)", () => {
    for (let i = 0; i < BUDGET_RANGES.length - 1; i++) {
      expect(BUDGET_RANGES[i].max).toBe(BUDGET_RANGES[i + 1].min);
    }
  });
});

// ---------------------------------------------------------------------------
// getBudgetRange
// ---------------------------------------------------------------------------

describe("getBudgetRange()", () => {
  it("returns '100萬以下' for amounts under 1,000,000", () => {
    expect(getBudgetRange(0)).toBe("100萬以下");
    expect(getBudgetRange(500_000)).toBe("100萬以下");
    expect(getBudgetRange(999_999)).toBe("100萬以下");
  });

  it("returns '100萬~500萬' for amounts [1M, 5M)", () => {
    expect(getBudgetRange(1_000_000)).toBe("100萬~500萬");
    expect(getBudgetRange(3_000_000)).toBe("100萬~500萬");
    expect(getBudgetRange(4_999_999)).toBe("100萬~500萬");
  });

  it("returns '500萬~1000萬' for amounts [5M, 10M)", () => {
    expect(getBudgetRange(5_000_000)).toBe("500萬~1000萬");
    expect(getBudgetRange(9_999_999)).toBe("500萬~1000萬");
  });

  it("returns '1000萬~3000萬' for amounts [10M, 30M)", () => {
    expect(getBudgetRange(10_000_000)).toBe("1000萬~3000萬");
    expect(getBudgetRange(29_999_999)).toBe("1000萬~3000萬");
  });

  it("returns '3000萬以上' for amounts >= 30M", () => {
    expect(getBudgetRange(30_000_000)).toBe("3000萬以上");
    expect(getBudgetRange(100_000_000)).toBe("3000萬以上");
  });
});

// ---------------------------------------------------------------------------
// buildBreakdown
// ---------------------------------------------------------------------------

describe("buildBreakdown()", () => {
  it("returns zeroed breakdown for empty pages", () => {
    const result = buildBreakdown("test", []);
    expect(result).toMatchObject({
      key: "test",
      total: 0,
      won: 0,
      lost: 0,
      cancelled: 0,
      disqualified: 0,
      withdrawn: 0,
      active: 0,
      winRate: 0,
      wonBudget: 0,
      costBid: 0,
      costFee: 0,
    });
  });

  it("counts won pages and accumulates wonBudget", () => {
    const pages = [
      mockPage({ [F.進程]: "得標", [F.預算]: 5_000_000 }),
      mockPage({ [F.進程]: "得標", [F.預算]: 3_000_000 }),
    ];
    const result = buildBreakdown("winner", pages);
    expect(result.won).toBe(2);
    expect(result.wonBudget).toBe(8_000_000);
    expect(result.total).toBe(2);
  });

  it("counts lost pages", () => {
    const pages = [
      mockPage({ [F.進程]: "未獲青睞" }),
      mockPage({ [F.進程]: "未獲青睞" }),
    ];
    const result = buildBreakdown("loser", pages);
    expect(result.lost).toBe(2);
  });

  it("counts cancelled pages", () => {
    const pages = [mockPage({ [F.進程]: "流標/廢標" })];
    const result = buildBreakdown("cancelled", pages);
    expect(result.cancelled).toBe(1);
  });

  it("counts disqualified pages", () => {
    const pages = [mockPage({ [F.進程]: "資格不符" })];
    const result = buildBreakdown("disq", pages);
    expect(result.disqualified).toBe(1);
  });

  it("counts withdrawn pages (both subtypes)", () => {
    const pages = [
      mockPage({ [F.進程]: "領標後未參與" }),
      mockPage({ [F.進程]: "逾期未參與" }),
    ];
    const result = buildBreakdown("withdrawn", pages);
    expect(result.withdrawn).toBe(2);
  });

  it("counts active pages (any status not in concluded/withdrawn)", () => {
    const pages = [
      mockPage({ [F.進程]: "等標期間" }),
      mockPage({ [F.進程]: "著手領/備標" }),
      mockPage({ [F.進程]: "已投標" }),
    ];
    const result = buildBreakdown("active", pages);
    // "已投標" is not won/lost/cancelled/disqualified/withdrawn, so it's active
    // "等標期間" and "著手領/備標" are also active
    expect(result.active).toBe(3);
  });

  it("computes winRate correctly for concluded cases", () => {
    const pages = [
      mockPage({ [F.進程]: "得標" }),
      mockPage({ [F.進程]: "未獲青睞" }),
      mockPage({ [F.進程]: "流標/廢標" }),
      mockPage({ [F.進程]: "資格不符" }),
    ];
    const result = buildBreakdown("team", pages);
    // concluded = 1 + 1 + 1 + 1 = 4, won = 1
    expect(result.winRate).toBe(25); // Math.round(1/4 * 100)
  });

  it("returns 0 winRate when no concluded cases", () => {
    const pages = [mockPage({ [F.進程]: "等標期間" })];
    const result = buildBreakdown("no-concluded", pages);
    expect(result.winRate).toBe(0);
  });

  it("accumulates costBid and costFee only for PROCURED_STATUSES", () => {
    const pages = [
      // "得標" is in PROCURED_STATUSES => costs counted
      mockPage({ [F.進程]: "得標", [F.押標金]: 50_000, [F.領標費]: 5_000 }),
      // "等標期間" is NOT in PROCURED_STATUSES => costs not counted
      mockPage({ [F.進程]: "等標期間", [F.押標金]: 30_000, [F.領標費]: 3_000 }),
      // "逾期未參與" is in PROCURED_STATUSES => costs counted
      mockPage({ [F.進程]: "逾期未參與", [F.押標金]: 20_000, [F.領標費]: 2_000 }),
    ];
    const result = buildBreakdown("costs", pages);
    expect(result.costBid).toBe(70_000);
    expect(result.costFee).toBe(7_000);
  });

  it("handles pages with missing properties gracefully", () => {
    const page: NotionPage = {
      id: "sparse",
      url: "https://notion.so/sparse",
      properties: {},
    };
    const result = buildBreakdown("sparse", [page]);
    expect(result.total).toBe(1);
    expect(result.active).toBe(1); // default status "" does not match any case
    expect(result.costBid).toBe(0);
    expect(result.costFee).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// groupByField
// ---------------------------------------------------------------------------

describe("groupByField()", () => {
  it("groups pages by single-value field", () => {
    const pages = [
      mockPage({ [F.招標機關]: "Agency A" }),
      mockPage({ [F.招標機關]: "Agency A" }),
      mockPage({ [F.招標機關]: "Agency B" }),
    ];
    const groups = groupByField(pages, (p) => [p.properties[F.招標機關]]);
    expect(Object.keys(groups)).toHaveLength(2);
    expect(groups["Agency A"]).toHaveLength(2);
    expect(groups["Agency B"]).toHaveLength(1);
  });

  it("groups pages by multi-value field (a page can appear in multiple groups)", () => {
    const pages = [
      mockPage({ [F.企劃主筆]: ["Alice", "Bob"] }),
      mockPage({ [F.企劃主筆]: ["Bob", "Carol"] }),
    ];
    const groups = groupByField(pages, (p) => p.properties[F.企劃主筆] ?? []);
    expect(groups["Alice"]).toHaveLength(1);
    expect(groups["Bob"]).toHaveLength(2);
    expect(groups["Carol"]).toHaveLength(1);
  });

  it("skips empty keys", () => {
    const pages = [
      mockPage({ [F.招標機關]: "" }),
      mockPage({ [F.招標機關]: "Agency A" }),
    ];
    const groups = groupByField(pages, (p) => [p.properties[F.招標機關]]);
    expect(groups[""]).toBeUndefined();
    expect(groups["Agency A"]).toHaveLength(1);
  });

  it("returns empty object for no pages", () => {
    const groups = groupByField([], (p) => [p.properties[F.招標機關]]);
    expect(groups).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// analyzeByWriter
// ---------------------------------------------------------------------------

describe("analyzeByWriter()", () => {
  it("returns empty array for no pages", () => {
    expect(analyzeByWriter([])).toEqual([]);
  });

  it("groups by writer and returns sorted ResultBreakdown[]", () => {
    const pages = [
      mockPage({ [F.企劃主筆]: ["Alice"], [F.進程]: "得標", [F.預算]: 5_000_000 }),
      mockPage({ [F.企劃主筆]: ["Alice"], [F.進程]: "未獲青睞" }),
      mockPage({ [F.企劃主筆]: ["Bob"], [F.進程]: "得標", [F.預算]: 3_000_000 }),
    ];
    const result = analyzeByWriter(pages);
    // Alice has 2 pages, Bob has 1 => sorted by total desc
    expect(result[0].key).toBe("Alice");
    expect(result[0].total).toBe(2);
    expect(result[0].won).toBe(1);
    expect(result[0].wonBudget).toBe(5_000_000);
    expect(result[1].key).toBe("Bob");
    expect(result[1].total).toBe(1);
  });

  it("handles pages with multiple writers (page counted in each group)", () => {
    const pages = [
      mockPage({ [F.企劃主筆]: ["Alice", "Bob"], [F.進程]: "得標", [F.預算]: 2_000_000 }),
    ];
    const result = analyzeByWriter(pages);
    expect(result).toHaveLength(2);
    expect(result.find((r) => r.key === "Alice")?.won).toBe(1);
    expect(result.find((r) => r.key === "Bob")?.won).toBe(1);
  });

  it("filters out empty writer names", () => {
    const pages = [
      mockPage({ [F.企劃主筆]: ["", "Alice"], [F.進程]: "得標" }),
    ];
    const result = analyzeByWriter(pages);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("Alice");
  });

  it("handles non-array writer field gracefully", () => {
    const pages = [mockPage({ [F.企劃主筆]: null })];
    const result = analyzeByWriter(pages);
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// analyzeByAgency
// ---------------------------------------------------------------------------

describe("analyzeByAgency()", () => {
  it("returns empty array for no pages", () => {
    expect(analyzeByAgency([])).toEqual([]);
  });

  it("groups by agency, filters empty keys, sorts by total desc", () => {
    const pages = [
      mockPage({ [F.招標機關]: "Agency A", [F.進程]: "得標" }),
      mockPage({ [F.招標機關]: "Agency A", [F.進程]: "未獲青睞" }),
      mockPage({ [F.招標機關]: "Agency B", [F.進程]: "得標" }),
      mockPage({ [F.招標機關]: "", [F.進程]: "等標期間" }),
    ];
    const result = analyzeByAgency(pages);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("Agency A");
    expect(result[0].total).toBe(2);
    expect(result[1].key).toBe("Agency B");
  });
});

// ---------------------------------------------------------------------------
// analyzeByType
// ---------------------------------------------------------------------------

describe("analyzeByType()", () => {
  it("returns empty array for no pages", () => {
    expect(analyzeByType([])).toEqual([]);
  });

  it("groups by type (multi-select), sorted by total desc", () => {
    const pages = [
      mockPage({ [F.標案類型]: ["TypeA", "TypeB"], [F.進程]: "得標" }),
      mockPage({ [F.標案類型]: ["TypeA"], [F.進程]: "未獲青睞" }),
    ];
    const result = analyzeByType(pages);
    expect(result[0].key).toBe("TypeA");
    expect(result[0].total).toBe(2);
    expect(result[1].key).toBe("TypeB");
    expect(result[1].total).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// analyzeByMethod
// ---------------------------------------------------------------------------

describe("analyzeByMethod()", () => {
  it("returns empty array for no pages", () => {
    expect(analyzeByMethod([])).toEqual([]);
  });

  it("groups by method, filters empty keys", () => {
    const pages = [
      mockPage({ [F.評審方式]: "最有利標", [F.進程]: "得標" }),
      mockPage({ [F.評審方式]: "最有利標", [F.進程]: "未獲青睞" }),
      mockPage({ [F.評審方式]: "最低標", [F.進程]: "得標" }),
      mockPage({ [F.評審方式]: "", [F.進程]: "等標期間" }),
    ];
    const result = analyzeByMethod(pages);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("最有利標");
    expect(result[0].total).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// analyzeByBudgetRange
// ---------------------------------------------------------------------------

describe("analyzeByBudgetRange()", () => {
  it("returns empty array for no pages", () => {
    expect(analyzeByBudgetRange([])).toEqual([]);
  });

  it("groups by budget range and preserves BUDGET_RANGES order", () => {
    const pages = [
      mockPage({ [F.預算]: 500_000, [F.進程]: "得標" }),
      mockPage({ [F.預算]: 2_000_000, [F.進程]: "未獲青睞" }),
      mockPage({ [F.預算]: 50_000_000, [F.進程]: "得標" }),
    ];
    const result = analyzeByBudgetRange(pages);
    expect(result).toHaveLength(3);
    // Should be ordered by BUDGET_RANGES order, not by total
    expect(result[0].key).toBe("100萬以下");
    expect(result[1].key).toBe("100萬~500萬");
    expect(result[2].key).toBe("3000萬以上");
  });

  it("skips budget ranges with no pages", () => {
    const pages = [
      mockPage({ [F.預算]: 500_000, [F.進程]: "得標" }),
    ];
    const result = analyzeByBudgetRange(pages);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("100萬以下");
  });
});

// ---------------------------------------------------------------------------
// analyzeByPriority
// ---------------------------------------------------------------------------

describe("analyzeByPriority()", () => {
  it("returns empty array for no pages", () => {
    expect(analyzeByPriority([])).toEqual([]);
  });

  it("groups by priority, filters empty keys, sorts by total desc", () => {
    const pages = [
      mockPage({ [F.投遞序位]: "第一順位", [F.進程]: "得標" }),
      mockPage({ [F.投遞序位]: "第一順位", [F.進程]: "未獲青睞" }),
      mockPage({ [F.投遞序位]: "第二順位", [F.進程]: "得標" }),
      mockPage({ [F.投遞序位]: "", [F.進程]: "等標期間" }),
    ];
    const result = analyzeByPriority(pages);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("第一順位");
    expect(result[0].total).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// analyzeByDecision
// ---------------------------------------------------------------------------

describe("analyzeByDecision()", () => {
  it("returns empty array for no pages", () => {
    expect(analyzeByDecision([])).toEqual([]);
  });

  it("groups by decision, filters empty keys", () => {
    const pages = [
      mockPage({ [F.決策]: "參與投標", [F.進程]: "得標" }),
      mockPage({ [F.決策]: "參與投標", [F.進程]: "未獲青睞" }),
      mockPage({ [F.決策]: "不參與投標", [F.進程]: "不參與" }),
      mockPage({ [F.決策]: "" }),
    ];
    const result = analyzeByDecision(pages);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("參與投標");
    expect(result[0].total).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Integration: win rate calculation across analyze functions
// ---------------------------------------------------------------------------

describe("Win rate integration", () => {
  it("computes correct win rate across all concluded statuses", () => {
    const pages = [
      mockPage({ [F.招標機關]: "A", [F.進程]: "得標" }),
      mockPage({ [F.招標機關]: "A", [F.進程]: "得標" }),
      mockPage({ [F.招標機關]: "A", [F.進程]: "未獲青睞" }),
      mockPage({ [F.招標機關]: "A", [F.進程]: "流標/廢標" }),
      mockPage({ [F.招標機關]: "A", [F.進程]: "資格不符" }),
      // active page should not count toward win rate
      mockPage({ [F.招標機關]: "A", [F.進程]: "已投標" }),
    ];
    const result = analyzeByAgency(pages);
    expect(result[0].key).toBe("A");
    // concluded = 2 + 1 + 1 + 1 = 5, won = 2
    expect(result[0].winRate).toBe(40); // Math.round(2/5 * 100)
  });
});
