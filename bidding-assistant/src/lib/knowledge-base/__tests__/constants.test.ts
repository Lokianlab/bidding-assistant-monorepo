import { describe, it, expect } from "vitest";
import {
  KB_STORAGE_KEY,
  KB_DATA_VERSION,
  KB_CATEGORIES,
  KB_CATEGORY_MAP,
  EMPTY_KB_DATA,
} from "../constants";

// ---------------------------------------------------------------------------
// KB_STORAGE_KEY
// ---------------------------------------------------------------------------

describe("KB_STORAGE_KEY", () => {
  it("is a non-empty string", () => {
    expect(typeof KB_STORAGE_KEY).toBe("string");
    expect(KB_STORAGE_KEY.length).toBeGreaterThan(0);
  });

  it("has the expected value", () => {
    expect(KB_STORAGE_KEY).toBe("bidding-assistant-knowledge-base");
  });
});

// ---------------------------------------------------------------------------
// KB_DATA_VERSION
// ---------------------------------------------------------------------------

describe("KB_DATA_VERSION", () => {
  it("is a positive integer", () => {
    expect(typeof KB_DATA_VERSION).toBe("number");
    expect(KB_DATA_VERSION).toBeGreaterThan(0);
    expect(Number.isInteger(KB_DATA_VERSION)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// KB_CATEGORIES
// ---------------------------------------------------------------------------

describe("KB_CATEGORIES", () => {
  it("defines exactly 5 knowledge base categories", () => {
    expect(KB_CATEGORIES).toHaveLength(5);
  });

  it("has correct IDs in order: 00A, 00B, 00C, 00D, 00E", () => {
    const ids = KB_CATEGORIES.map((c) => c.id);
    expect(ids).toEqual(["00A", "00B", "00C", "00D", "00E"]);
  });

  it("each category has required fields with non-empty values", () => {
    for (const cat of KB_CATEGORIES) {
      expect(typeof cat.id).toBe("string");
      expect(cat.id.length).toBeGreaterThan(0);
      expect(typeof cat.label).toBe("string");
      expect(cat.label.length).toBeGreaterThan(0);
      expect(typeof cat.icon).toBe("string");
      expect(cat.icon.length).toBeGreaterThan(0);
      expect(typeof cat.description).toBe("string");
      expect(cat.description.length).toBeGreaterThan(0);
      expect(typeof cat.idPrefix).toBe("string");
      expect(cat.idPrefix.length).toBeGreaterThan(0);
      expect(typeof cat.idFormat).toBe("string");
      expect(cat.idFormat.length).toBeGreaterThan(0);
    }
  });

  it("has unique IDs", () => {
    const ids = KB_CATEGORIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has unique labels", () => {
    const labels = KB_CATEGORIES.map((c) => c.label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("has unique idPrefixes", () => {
    const prefixes = KB_CATEGORIES.map((c) => c.idPrefix);
    expect(new Set(prefixes).size).toBe(prefixes.length);
  });

  it("idFormat starts with idPrefix for each category", () => {
    for (const cat of KB_CATEGORIES) {
      expect(cat.idFormat.startsWith(cat.idPrefix)).toBe(true);
    }
  });

  it("contains expected category labels", () => {
    const labels = KB_CATEGORIES.map((c) => c.label);
    expect(labels).toContain("團隊資料庫");
    expect(labels).toContain("實績資料庫");
    expect(labels).toContain("時程範本庫");
    expect(labels).toContain("應變SOP庫");
    expect(labels).toContain("案後檢討庫");
  });

  it("idPrefix ends with a hyphen", () => {
    for (const cat of KB_CATEGORIES) {
      expect(cat.idPrefix.endsWith("-")).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// KB_CATEGORY_MAP
// ---------------------------------------------------------------------------

describe("KB_CATEGORY_MAP", () => {
  it("has 5 entries", () => {
    expect(Object.keys(KB_CATEGORY_MAP)).toHaveLength(5);
  });

  it("is a map indexed by category ID", () => {
    expect(KB_CATEGORY_MAP["00A"]).toBeDefined();
    expect(KB_CATEGORY_MAP["00B"]).toBeDefined();
    expect(KB_CATEGORY_MAP["00C"]).toBeDefined();
    expect(KB_CATEGORY_MAP["00D"]).toBeDefined();
    expect(KB_CATEGORY_MAP["00E"]).toBeDefined();
  });

  it("maps to the correct category definitions", () => {
    expect(KB_CATEGORY_MAP["00A"].label).toBe("團隊資料庫");
    expect(KB_CATEGORY_MAP["00B"].label).toBe("實績資料庫");
    expect(KB_CATEGORY_MAP["00C"].label).toBe("時程範本庫");
    expect(KB_CATEGORY_MAP["00D"].label).toBe("應變SOP庫");
    expect(KB_CATEGORY_MAP["00E"].label).toBe("案後檢討庫");
  });

  it("is consistent with KB_CATEGORIES (every entry matches)", () => {
    for (const cat of KB_CATEGORIES) {
      expect(KB_CATEGORY_MAP[cat.id]).toEqual(cat);
    }
  });

  it("maps each category icon correctly", () => {
    for (const cat of KB_CATEGORIES) {
      expect(KB_CATEGORY_MAP[cat.id].icon).toBe(cat.icon);
    }
  });
});

// ---------------------------------------------------------------------------
// EMPTY_KB_DATA
// ---------------------------------------------------------------------------

describe("EMPTY_KB_DATA", () => {
  it("has empty arrays for all 5 categories", () => {
    expect(EMPTY_KB_DATA["00A"]).toEqual([]);
    expect(EMPTY_KB_DATA["00B"]).toEqual([]);
    expect(EMPTY_KB_DATA["00C"]).toEqual([]);
    expect(EMPTY_KB_DATA["00D"]).toEqual([]);
    expect(EMPTY_KB_DATA["00E"]).toEqual([]);
  });

  it("has a valid lastUpdated ISO string", () => {
    expect(typeof EMPTY_KB_DATA.lastUpdated).toBe("string");
    const date = new Date(EMPTY_KB_DATA.lastUpdated);
    expect(isNaN(date.getTime())).toBe(false);
  });

  it("has version matching KB_DATA_VERSION", () => {
    expect(EMPTY_KB_DATA.version).toBe(KB_DATA_VERSION);
  });

  it("has all category keys from KB_CATEGORIES", () => {
    const catIds = KB_CATEGORIES.map((c) => c.id);
    for (const id of catIds) {
      expect(EMPTY_KB_DATA).toHaveProperty(id);
    }
  });

  it("category arrays are actual empty arrays (not undefined or null)", () => {
    const catIds = KB_CATEGORIES.map((c) => c.id) as Array<keyof typeof EMPTY_KB_DATA>;
    for (const id of catIds) {
      const value = EMPTY_KB_DATA[id];
      expect(Array.isArray(value)).toBe(true);
      expect(value).toHaveLength(0);
    }
  });
});
