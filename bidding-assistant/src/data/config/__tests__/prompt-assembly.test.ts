import { describe, it, expect } from "vitest";
import {
  PROMPT_FILES,
  FILE_MAP,
  STAGE_KB_RULES,
  RULE_MAP,
} from "../prompt-assembly";

// ====== PROMPT_FILES ======

describe("PROMPT_FILES", () => {
  it("is a non-empty array", () => {
    expect(Array.isArray(PROMPT_FILES)).toBe(true);
    expect(PROMPT_FILES.length).toBeGreaterThan(0);
  });

  it("each file has all required fields", () => {
    for (const file of PROMPT_FILES) {
      expect(file).toHaveProperty("id");
      expect(file).toHaveProperty("label");
      expect(file).toHaveProperty("filename");
      expect(file).toHaveProperty("category");
      expect(file).toHaveProperty("categoryLabel");

      expect(typeof file.id).toBe("string");
      expect(typeof file.label).toBe("string");
      expect(typeof file.filename).toBe("string");
      expect(typeof file.category).toBe("string");
      expect(typeof file.categoryLabel).toBe("string");

      expect(file.id.length).toBeGreaterThan(0);
      expect(file.label.length).toBeGreaterThan(0);
      expect(file.filename.length).toBeGreaterThan(0);
    }
  });

  it("all IDs are unique", () => {
    const ids = PROMPT_FILES.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all filenames are unique", () => {
    const filenames = PROMPT_FILES.map((f) => f.filename);
    expect(new Set(filenames).size).toBe(filenames.length);
  });

  it('all filenames end with ".md"', () => {
    for (const file of PROMPT_FILES) {
      expect(file.filename).toMatch(/\.md$/);
    }
  });

  it("category values are from the allowed set", () => {
    const allowedCategories = new Set(["system", "stage", "kb", "spec", "tool", "ref"]);
    for (const file of PROMPT_FILES) {
      expect(allowedCategories.has(file.category)).toBe(true);
    }
  });

  it("contains system core files (core and index)", () => {
    const systemFiles = PROMPT_FILES.filter((f) => f.category === "system");
    expect(systemFiles.length).toBeGreaterThanOrEqual(2);
    const ids = systemFiles.map((f) => f.id);
    expect(ids).toContain("core");
    expect(ids).toContain("index");
  });

  it("contains all 8 stage files (L1-L8)", () => {
    const stageIds = PROMPT_FILES.filter((f) => f.category === "stage").map((f) => f.id);
    for (let i = 1; i <= 8; i++) {
      expect(stageIds).toContain(`L${i}`);
    }
  });

  it("contains all 5 KB files (00A-00E)", () => {
    const kbIds = PROMPT_FILES.filter((f) => f.category === "kb").map((f) => f.id);
    expect(kbIds).toContain("00A");
    expect(kbIds).toContain("00B");
    expect(kbIds).toContain("00C");
    expect(kbIds).toContain("00D");
    expect(kbIds).toContain("00E");
  });

  it("contains spec file", () => {
    const specFiles = PROMPT_FILES.filter((f) => f.category === "spec");
    expect(specFiles.length).toBeGreaterThanOrEqual(1);
    expect(specFiles.map((f) => f.id)).toContain("spec");
  });
});

// ====== FILE_MAP ======

describe("FILE_MAP", () => {
  it("maps every PROMPT_FILES entry by id", () => {
    for (const file of PROMPT_FILES) {
      expect(FILE_MAP[file.id]).toBe(file);
    }
  });

  it("has the same number of entries as PROMPT_FILES", () => {
    expect(Object.keys(FILE_MAP).length).toBe(PROMPT_FILES.length);
  });

  it("allows lookup by id", () => {
    const core = FILE_MAP["core"];
    expect(core).toBeDefined();
    expect(core.category).toBe("system");
  });
});

// ====== STAGE_KB_RULES ======

describe("STAGE_KB_RULES", () => {
  it("is a non-empty array", () => {
    expect(Array.isArray(STAGE_KB_RULES)).toBe(true);
    expect(STAGE_KB_RULES.length).toBeGreaterThan(0);
  });

  it("has exactly 8 rules (L1-L8)", () => {
    expect(STAGE_KB_RULES.length).toBe(8);
    const stageIds = STAGE_KB_RULES.map((r) => r.stageId);
    for (let i = 1; i <= 8; i++) {
      expect(stageIds).toContain(`L${i}`);
    }
  });

  it("each rule has all required fields", () => {
    for (const rule of STAGE_KB_RULES) {
      expect(rule).toHaveProperty("stageId");
      expect(rule).toHaveProperty("alwaysLoad");
      expect(rule).toHaveProperty("stageFile");
      expect(rule).toHaveProperty("extraSpecs");
      expect(rule).toHaveProperty("kb");

      expect(typeof rule.stageId).toBe("string");
      expect(Array.isArray(rule.alwaysLoad)).toBe(true);
      expect(typeof rule.stageFile).toBe("string");
      expect(Array.isArray(rule.extraSpecs)).toBe(true);
      expect(typeof rule.kb).toBe("object");
    }
  });

  it('all alwaysLoad references exist in FILE_MAP', () => {
    for (const rule of STAGE_KB_RULES) {
      for (const fileId of rule.alwaysLoad) {
        expect(FILE_MAP[fileId]).toBeDefined();
      }
    }
  });

  it("all stageFile references exist in FILE_MAP", () => {
    for (const rule of STAGE_KB_RULES) {
      expect(FILE_MAP[rule.stageFile]).toBeDefined();
    }
  });

  it("stageFile matches the stageId", () => {
    for (const rule of STAGE_KB_RULES) {
      expect(rule.stageFile).toBe(rule.stageId);
    }
  });

  it("all extraSpecs references exist in FILE_MAP", () => {
    for (const rule of STAGE_KB_RULES) {
      for (const specId of rule.extraSpecs) {
        expect(FILE_MAP[specId]).toBeDefined();
      }
    }
  });

  it("all KB references exist in FILE_MAP", () => {
    for (const rule of STAGE_KB_RULES) {
      for (const kbId of Object.keys(rule.kb)) {
        expect(FILE_MAP[kbId]).toBeDefined();
      }
    }
  });

  it('all KB references use valid values ("required" or "optional")', () => {
    for (const rule of STAGE_KB_RULES) {
      for (const ref of Object.values(rule.kb)) {
        expect(ref === "required" || ref === "optional").toBe(true);
      }
    }
  });

  it("all rules include core and index in alwaysLoad", () => {
    for (const rule of STAGE_KB_RULES) {
      expect(rule.alwaysLoad).toContain("core");
      expect(rule.alwaysLoad).toContain("index");
    }
  });

  it("L3 and L4 include spec in extraSpecs", () => {
    const l3 = STAGE_KB_RULES.find((r) => r.stageId === "L3");
    const l4 = STAGE_KB_RULES.find((r) => r.stageId === "L4");
    expect(l3!.extraSpecs).toContain("spec");
    expect(l4!.extraSpecs).toContain("spec");
  });

  it("L4 requires all four main KBs (00A, 00B, 00C, 00D)", () => {
    const l4 = STAGE_KB_RULES.find((r) => r.stageId === "L4");
    expect(l4!.kb["00A"]).toBe("required");
    expect(l4!.kb["00B"]).toBe("required");
    expect(l4!.kb["00C"]).toBe("required");
    expect(l4!.kb["00D"]).toBe("required");
  });

  it("L1 requires 00B", () => {
    const l1 = STAGE_KB_RULES.find((r) => r.stageId === "L1");
    expect(l1!.kb["00B"]).toBe("required");
  });

  it("L6 and L8 have empty KB references", () => {
    const l6 = STAGE_KB_RULES.find((r) => r.stageId === "L6");
    const l8 = STAGE_KB_RULES.find((r) => r.stageId === "L8");
    expect(Object.keys(l6!.kb).length).toBe(0);
    expect(Object.keys(l8!.kb).length).toBe(0);
  });

  it("all KB references point to KB-category files", () => {
    for (const rule of STAGE_KB_RULES) {
      for (const kbId of Object.keys(rule.kb)) {
        const file = FILE_MAP[kbId];
        expect(file.category).toBe("kb");
      }
    }
  });
});

// ====== RULE_MAP ======

describe("RULE_MAP", () => {
  it("maps every STAGE_KB_RULES entry by stageId", () => {
    for (const rule of STAGE_KB_RULES) {
      expect(RULE_MAP[rule.stageId]).toBe(rule);
    }
  });

  it("has the same number of entries as STAGE_KB_RULES", () => {
    expect(Object.keys(RULE_MAP).length).toBe(STAGE_KB_RULES.length);
  });

  it("allows lookup by stageId", () => {
    const l1 = RULE_MAP["L1"];
    expect(l1).toBeDefined();
    expect(l1.stageId).toBe("L1");
  });
});
