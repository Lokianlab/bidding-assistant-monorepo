import { describe, it, expect } from "vitest";
import {
  BID_STATUS,
  ACTIVE_STATUSES,
  SUBMITTED_STATUSES,
  PROCURED_STATUSES,
  REVIEW_STATUSES,
  CONCLUDED_STATUSES,
  SUNK_STATUSES,
  BOARD_COLUMNS_ORDER,
  PERFORMANCE_STATUS_COLUMNS,
  STATUS_COLORS_TW,
  STATUS_COLORS_HEX,
  PRIORITY_COLORS_TW,
  DECISION_COLORS_HEX,
  STACK_COLORS_HEX,
  AUTO_COLORS_TW,
  CHART_PALETTE,
  buildStatusFilter,
  buildColorMap,
  getStatusHex,
  getDecisionHex,
  formatCurrency,
} from "../bid-status";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ALL_STATUS_VALUES = Object.values(BID_STATUS);

// ---------------------------------------------------------------------------
// BID_STATUS constant
// ---------------------------------------------------------------------------

describe("BID_STATUS", () => {
  it("has 13 status entries", () => {
    expect(Object.keys(BID_STATUS)).toHaveLength(13);
  });

  it("all values are non-empty strings", () => {
    for (const value of ALL_STATUS_VALUES) {
      expect(typeof value).toBe("string");
      expect(value.length).toBeGreaterThan(0);
    }
  });

  it("all values are unique", () => {
    const unique = new Set(ALL_STATUS_VALUES);
    expect(unique.size).toBe(ALL_STATUS_VALUES.length);
  });

  it("contains expected status keys", () => {
    const expectedKeys = [
      "等標期間",
      "著手領備標",
      "已投標",
      "競標階段",
      "已出席簡報",
      "不參與",
      "逾期未參與",
      "領標後未參與",
      "資格不符",
      "未獲青睞",
      "流標廢標",
      "黃冊集結",
      "得標",
    ];
    for (const key of expectedKeys) {
      expect(BID_STATUS).toHaveProperty(key);
    }
  });
});

// ---------------------------------------------------------------------------
// Status group Sets
// ---------------------------------------------------------------------------

describe("Status group Sets", () => {
  describe("ACTIVE_STATUSES", () => {
    it("is a Set with 5 entries", () => {
      expect(ACTIVE_STATUSES).toBeInstanceOf(Set);
      expect(ACTIVE_STATUSES.size).toBe(5);
    });

    it("contains the correct statuses", () => {
      expect(ACTIVE_STATUSES.has(BID_STATUS.著手領備標)).toBe(true);
      expect(ACTIVE_STATUSES.has(BID_STATUS.已投標)).toBe(true);
      expect(ACTIVE_STATUSES.has(BID_STATUS.競標階段)).toBe(true);
      expect(ACTIVE_STATUSES.has(BID_STATUS.已出席簡報)).toBe(true);
      expect(ACTIVE_STATUSES.has(BID_STATUS.得標)).toBe(true);
    });

    it("does not contain inactive statuses", () => {
      expect(ACTIVE_STATUSES.has(BID_STATUS.不參與)).toBe(false);
      expect(ACTIVE_STATUSES.has(BID_STATUS.等標期間)).toBe(false);
    });
  });

  describe("SUBMITTED_STATUSES", () => {
    it("is a Set with 8 entries", () => {
      expect(SUBMITTED_STATUSES).toBeInstanceOf(Set);
      expect(SUBMITTED_STATUSES.size).toBe(8);
    });

    it("contains all statuses that count as submitted", () => {
      const expected = [
        BID_STATUS.已投標,
        BID_STATUS.競標階段,
        BID_STATUS.已出席簡報,
        BID_STATUS.得標,
        BID_STATUS.未獲青睞,
        BID_STATUS.流標廢標,
        BID_STATUS.資格不符,
        BID_STATUS.領標後未參與,
      ];
      for (const s of expected) {
        expect(SUBMITTED_STATUSES.has(s)).toBe(true);
      }
    });
  });

  describe("PROCURED_STATUSES", () => {
    it("is a Set with 8 entries", () => {
      expect(PROCURED_STATUSES).toBeInstanceOf(Set);
      expect(PROCURED_STATUSES.size).toBe(8);
    });

    it("includes statuses where procurement occurred", () => {
      expect(PROCURED_STATUSES.has(BID_STATUS.領標後未參與)).toBe(true);
      expect(PROCURED_STATUSES.has(BID_STATUS.逾期未參與)).toBe(true);
      expect(PROCURED_STATUSES.has(BID_STATUS.得標)).toBe(true);
    });
  });

  describe("REVIEW_STATUSES", () => {
    it("is a Set with 8 entries", () => {
      expect(REVIEW_STATUSES).toBeInstanceOf(Set);
      expect(REVIEW_STATUSES.size).toBe(8);
    });
  });

  describe("CONCLUDED_STATUSES", () => {
    it("is a Set with 4 entries", () => {
      expect(CONCLUDED_STATUSES).toBeInstanceOf(Set);
      expect(CONCLUDED_STATUSES.size).toBe(4);
    });

    it("contains only final-outcome statuses", () => {
      const expected = [
        BID_STATUS.得標,
        BID_STATUS.未獲青睞,
        BID_STATUS.流標廢標,
        BID_STATUS.資格不符,
      ];
      for (const s of expected) {
        expect(CONCLUDED_STATUSES.has(s)).toBe(true);
      }
    });
  });

  describe("SUNK_STATUSES", () => {
    it("is a Set with 2 entries", () => {
      expect(SUNK_STATUSES).toBeInstanceOf(Set);
      expect(SUNK_STATUSES.size).toBe(2);
    });

    it("contains only sunk-cost statuses", () => {
      expect(SUNK_STATUSES.has(BID_STATUS.領標後未參與)).toBe(true);
      expect(SUNK_STATUSES.has(BID_STATUS.逾期未參與)).toBe(true);
    });
  });

  describe("no unintended overlap", () => {
    it("SUNK_STATUSES and CONCLUDED_STATUSES do not overlap", () => {
      for (const s of SUNK_STATUSES) {
        expect(CONCLUDED_STATUSES.has(s)).toBe(false);
      }
    });

    it("ACTIVE_STATUSES and SUNK_STATUSES do not overlap", () => {
      for (const s of SUNK_STATUSES) {
        expect(ACTIVE_STATUSES.has(s)).toBe(false);
      }
    });
  });

  describe("all group members are valid BID_STATUS values", () => {
    const allGroups = [
      { name: "ACTIVE_STATUSES", set: ACTIVE_STATUSES },
      { name: "SUBMITTED_STATUSES", set: SUBMITTED_STATUSES },
      { name: "PROCURED_STATUSES", set: PROCURED_STATUSES },
      { name: "REVIEW_STATUSES", set: REVIEW_STATUSES },
      { name: "CONCLUDED_STATUSES", set: CONCLUDED_STATUSES },
      { name: "SUNK_STATUSES", set: SUNK_STATUSES },
    ];

    for (const { name, set } of allGroups) {
      it(`${name} contains only values from BID_STATUS`, () => {
        for (const s of set) {
          expect(ALL_STATUS_VALUES).toContain(s);
        }
      });
    }
  });
});

// ---------------------------------------------------------------------------
// Ordered arrays
// ---------------------------------------------------------------------------

describe("BOARD_COLUMNS_ORDER", () => {
  it("has 13 entries (all statuses)", () => {
    expect(BOARD_COLUMNS_ORDER).toHaveLength(13);
  });

  it("contains every BID_STATUS value exactly once", () => {
    const unique = new Set(BOARD_COLUMNS_ORDER);
    expect(unique.size).toBe(BOARD_COLUMNS_ORDER.length);
    for (const status of ALL_STATUS_VALUES) {
      expect(BOARD_COLUMNS_ORDER).toContain(status);
    }
  });
});

describe("PERFORMANCE_STATUS_COLUMNS", () => {
  it("has 8 entries", () => {
    expect(PERFORMANCE_STATUS_COLUMNS).toHaveLength(8);
  });

  it("all entries are valid BID_STATUS values", () => {
    for (const s of PERFORMANCE_STATUS_COLUMNS) {
      expect(ALL_STATUS_VALUES).toContain(s);
    }
  });

  it("matches REVIEW_STATUSES exactly", () => {
    const perfSet = new Set(PERFORMANCE_STATUS_COLUMNS);
    expect(perfSet.size).toBe(REVIEW_STATUSES.size);
    for (const s of REVIEW_STATUSES) {
      expect(perfSet.has(s)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Color mappings
// ---------------------------------------------------------------------------

describe("STATUS_COLORS_TW", () => {
  it("has a Tailwind color class for every BID_STATUS value", () => {
    for (const status of ALL_STATUS_VALUES) {
      expect(STATUS_COLORS_TW[status]).toBeDefined();
      expect(typeof STATUS_COLORS_TW[status]).toBe("string");
      expect(STATUS_COLORS_TW[status].length).toBeGreaterThan(0);
    }
  });
});

describe("STATUS_COLORS_HEX", () => {
  it("has a hex color for every BID_STATUS value", () => {
    for (const status of ALL_STATUS_VALUES) {
      expect(STATUS_COLORS_HEX[status]).toBeDefined();
      expect(STATUS_COLORS_HEX[status]).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
});

describe("PRIORITY_COLORS_TW", () => {
  it("has 7 priority entries", () => {
    expect(Object.keys(PRIORITY_COLORS_TW)).toHaveLength(7);
  });

  it("all values are non-empty strings", () => {
    for (const v of Object.values(PRIORITY_COLORS_TW)) {
      expect(typeof v).toBe("string");
      expect(v.length).toBeGreaterThan(0);
    }
  });
});

describe("DECISION_COLORS_HEX", () => {
  it("has 7 decision entries", () => {
    expect(Object.keys(DECISION_COLORS_HEX)).toHaveLength(7);
  });

  it("all values are valid hex colors", () => {
    for (const v of Object.values(DECISION_COLORS_HEX)) {
      expect(v).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
});

describe("STACK_COLORS_HEX", () => {
  it("has 6 entries (5 concluded statuses + 1 in-progress)", () => {
    expect(Object.keys(STACK_COLORS_HEX)).toHaveLength(6);
  });

  it("all values are valid hex colors", () => {
    for (const v of Object.values(STACK_COLORS_HEX)) {
      expect(v).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
});

describe("AUTO_COLORS_TW", () => {
  it("has 8 fallback colors", () => {
    expect(AUTO_COLORS_TW).toHaveLength(8);
  });
});

describe("CHART_PALETTE", () => {
  it("has 10 hex colors", () => {
    expect(CHART_PALETTE).toHaveLength(10);
    for (const c of CHART_PALETTE) {
      expect(c).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
});

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

describe("buildStatusFilter()", () => {
  it("produces an 'or' filter array from a Set", () => {
    const filter = buildStatusFilter(CONCLUDED_STATUSES);
    expect(filter).toHaveProperty("or");
    expect(filter.or).toHaveLength(CONCLUDED_STATUSES.size);
    for (const clause of filter.or) {
      expect(clause).toHaveProperty("property", "標案進程");
      expect(clause).toHaveProperty("status");
      expect(CONCLUDED_STATUSES.has(clause.status.equals)).toBe(true);
    }
  });

  it("uses a custom property name when provided", () => {
    const filter = buildStatusFilter(SUNK_STATUSES, "customProp");
    for (const clause of filter.or) {
      expect(clause.property).toBe("customProp");
    }
  });
});

describe("buildColorMap()", () => {
  it("returns default colors for known statuses", () => {
    const result = buildColorMap(ALL_STATUS_VALUES as unknown as string[], STATUS_COLORS_TW);
    for (const s of ALL_STATUS_VALUES) {
      expect(result[s]).toBe(STATUS_COLORS_TW[s]);
    }
  });

  it("assigns auto colors for unknown options", () => {
    const result = buildColorMap(["unknown-1", "unknown-2"], {});
    expect(result["unknown-1"]).toBe(AUTO_COLORS_TW[0]);
    expect(result["unknown-2"]).toBe(AUTO_COLORS_TW[1]);
  });

  it("wraps around AUTO_COLORS_TW when there are more unknowns than colors", () => {
    const unknowns = Array.from({ length: 10 }, (_, i) => `u-${i}`);
    const result = buildColorMap(unknowns, {});
    // Index 8 wraps to AUTO_COLORS_TW[0], index 9 wraps to AUTO_COLORS_TW[1]
    expect(result["u-8"]).toBe(AUTO_COLORS_TW[0]);
    expect(result["u-9"]).toBe(AUTO_COLORS_TW[1]);
  });
});

describe("getStatusHex()", () => {
  it("returns the mapped hex for a known status", () => {
    expect(getStatusHex(BID_STATUS.得標)).toBe("#10b981");
  });

  it("falls back to CHART_PALETTE for an unknown status", () => {
    expect(getStatusHex("unknown")).toBe(CHART_PALETTE[0]);
  });

  it("uses the index parameter for palette fallback", () => {
    expect(getStatusHex("unknown", 3)).toBe(CHART_PALETTE[3]);
  });

  it("wraps palette index", () => {
    expect(getStatusHex("unknown", 10)).toBe(CHART_PALETTE[0]);
  });
});

describe("getDecisionHex()", () => {
  it("returns the mapped hex for a known decision", () => {
    expect(getDecisionHex("第一順位")).toBe("#ef4444");
  });

  it("falls back to CHART_PALETTE for an unknown decision", () => {
    expect(getDecisionHex("unknown")).toBe(CHART_PALETTE[0]);
  });
});

describe("formatCurrency()", () => {
  it("formats a number with dollar sign and locale separators", () => {
    const result = formatCurrency(1234567);
    expect(result).toContain("$");
    expect(result).toContain("1,234,567");
  });

  it("handles zero", () => {
    expect(formatCurrency(0)).toBe("$0");
  });
});
