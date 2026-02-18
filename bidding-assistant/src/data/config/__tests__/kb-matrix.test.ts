import { describe, it, expect } from "vitest";
import {
  KB_MATRIX,
  WRITING_RULES_STAGES,
  KB_LABELS,
} from "../kb-matrix";
import type { KBRequirement } from "../kb-matrix";

// ---------------------------------------------------------------------------
// Valid values
// ---------------------------------------------------------------------------

const VALID_REQUIREMENTS: KBRequirement[] = ["required", "optional", "none"];
const EXPECTED_KB_KEYS = ["00A", "00B", "00C", "00D", "00E"];
const EXPECTED_STAGES = ["L1", "L2", "L3", "L4", "L5", "L6", "L7", "L8"];

// ---------------------------------------------------------------------------
// KB_MATRIX structure
// ---------------------------------------------------------------------------

describe("KB_MATRIX", () => {
  it("has entries for all 8 stages (L1-L8)", () => {
    for (const stageId of EXPECTED_STAGES) {
      expect(KB_MATRIX).toHaveProperty(stageId);
    }
    expect(Object.keys(KB_MATRIX)).toHaveLength(8);
  });

  it("each stage maps all 5 knowledge base keys", () => {
    for (const stageId of EXPECTED_STAGES) {
      const stageRow = KB_MATRIX[stageId];
      for (const kbKey of EXPECTED_KB_KEYS) {
        expect(stageRow).toHaveProperty(kbKey);
      }
      expect(Object.keys(stageRow)).toHaveLength(5);
    }
  });

  it("all values are valid KBRequirement values", () => {
    for (const stageId of EXPECTED_STAGES) {
      for (const kbKey of EXPECTED_KB_KEYS) {
        const value = KB_MATRIX[stageId][kbKey];
        expect(VALID_REQUIREMENTS).toContain(value);
      }
    }
  });

  it("L1 has 00B as required (core dependency)", () => {
    expect(KB_MATRIX["L1"]["00B"]).toBe("required");
  });

  it("L3 has 00C and 00D as required", () => {
    expect(KB_MATRIX["L3"]["00C"]).toBe("required");
    expect(KB_MATRIX["L3"]["00D"]).toBe("required");
  });

  it("L4 has 00A, 00B, 00C, 00D as required (most demanding stage)", () => {
    expect(KB_MATRIX["L4"]["00A"]).toBe("required");
    expect(KB_MATRIX["L4"]["00B"]).toBe("required");
    expect(KB_MATRIX["L4"]["00C"]).toBe("required");
    expect(KB_MATRIX["L4"]["00D"]).toBe("required");
  });
});

// ---------------------------------------------------------------------------
// WRITING_RULES_STAGES
// ---------------------------------------------------------------------------

describe("WRITING_RULES_STAGES", () => {
  it("is an array with L3 and L4", () => {
    expect(Array.isArray(WRITING_RULES_STAGES)).toBe(true);
    expect(WRITING_RULES_STAGES).toHaveLength(2);
    expect(WRITING_RULES_STAGES).toContain("L3");
    expect(WRITING_RULES_STAGES).toContain("L4");
  });

  it("all entries are valid stage IDs", () => {
    for (const stageId of WRITING_RULES_STAGES) {
      expect(EXPECTED_STAGES).toContain(stageId);
    }
  });
});

// ---------------------------------------------------------------------------
// KB_LABELS
// ---------------------------------------------------------------------------

describe("KB_LABELS", () => {
  it("has a label for every knowledge base key", () => {
    for (const kbKey of EXPECTED_KB_KEYS) {
      expect(KB_LABELS).toHaveProperty(kbKey);
    }
  });

  it("has exactly 5 entries", () => {
    expect(Object.keys(KB_LABELS)).toHaveLength(5);
  });

  it("all labels are non-empty Chinese strings", () => {
    for (const label of Object.values(KB_LABELS)) {
      expect(typeof label).toBe("string");
      expect(label.length).toBeGreaterThan(0);
    }
  });

  it("maps to expected label values", () => {
    expect(KB_LABELS["00A"]).toBe("團隊資料庫");
    expect(KB_LABELS["00B"]).toBe("實績資料庫");
    expect(KB_LABELS["00C"]).toBe("時程範本庫");
    expect(KB_LABELS["00D"]).toBe("應變SOP庫");
    expect(KB_LABELS["00E"]).toBe("案後檢討庫");
  });
});

// ---------------------------------------------------------------------------
// Cross-validation: KB_MATRIX stages align with STAGES config
// ---------------------------------------------------------------------------

describe("KB_MATRIX x STAGES alignment", () => {
  it("KB_MATRIX keys match the standard stage IDs", () => {
    const matrixKeys = Object.keys(KB_MATRIX).sort();
    const expectedSorted = [...EXPECTED_STAGES].sort();
    expect(matrixKeys).toEqual(expectedSorted);
  });
});
