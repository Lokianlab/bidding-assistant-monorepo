import { describe, it, expect } from "vitest";
import { SEED_00C, SEED_00D } from "../seed-data";

describe("SEED_00C (時程範本庫)", () => {
  it("is non-empty", () => {
    expect(SEED_00C.length).toBeGreaterThan(0);
  });

  it("all entries have unique IDs", () => {
    const ids = SEED_00C.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all IDs follow T- prefix convention", () => {
    for (const entry of SEED_00C) {
      expect(entry.id).toMatch(/^T-[A-Z]{3}$/);
    }
  });

  it("every entry has required fields", () => {
    for (const entry of SEED_00C) {
      expect(entry.templateName.length).toBeGreaterThan(0);
      expect(entry.applicableType.length).toBeGreaterThan(0);
      expect(entry.budgetRange.length).toBeGreaterThan(0);
      expect(entry.durationRange.length).toBeGreaterThan(0);
      expect(entry.warnings.length).toBeGreaterThan(0);
      expect(entry.entryStatus).toBe("active");
      expect(entry.updatedAt.length).toBeGreaterThan(0);
    }
  });

  it("every entry has at least 3 phases", () => {
    for (const entry of SEED_00C) {
      expect(entry.phases.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("every phase has required fields", () => {
    for (const entry of SEED_00C) {
      for (const phase of entry.phases) {
        expect(phase.phase.length).toBeGreaterThan(0);
        expect(phase.duration.length).toBeGreaterThan(0);
        expect(phase.deliverables.length).toBeGreaterThan(0);
        expect(phase.checkpoints.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("SEED_00D (應變SOP庫)", () => {
  it("is non-empty", () => {
    expect(SEED_00D.length).toBeGreaterThan(0);
  });

  it("all entries have unique IDs", () => {
    const ids = SEED_00D.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all IDs follow R- prefix convention", () => {
    for (const entry of SEED_00D) {
      expect(entry.id).toMatch(/^R-[A-Z]{2,4}$/);
    }
  });

  it("every entry has required fields", () => {
    for (const entry of SEED_00D) {
      expect(entry.riskName.length).toBeGreaterThan(0);
      expect(["低", "中", "高"]).toContain(entry.riskLevel);
      expect(entry.prevention.length).toBeGreaterThan(0);
      expect(entry.notes.length).toBeGreaterThan(0);
      expect(entry.entryStatus).toBe("active");
      expect(entry.updatedAt.length).toBeGreaterThan(0);
    }
  });

  it("every entry has at least 2 response steps", () => {
    for (const entry of SEED_00D) {
      expect(entry.responseSteps.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("every response step has required fields", () => {
    for (const entry of SEED_00D) {
      for (const step of entry.responseSteps) {
        expect(step.step.length).toBeGreaterThan(0);
        expect(step.action.length).toBeGreaterThan(0);
        expect(step.responsible.length).toBeGreaterThan(0);
      }
    }
  });

  it("response steps are numbered sequentially", () => {
    for (const entry of SEED_00D) {
      for (let i = 0; i < entry.responseSteps.length; i++) {
        expect(entry.responseSteps[i].step).toMatch(
          new RegExp(`^${i + 1}\\.`),
        );
      }
    }
  });

  it("covers all risk levels", () => {
    const levels = new Set(SEED_00D.map((e) => e.riskLevel));
    expect(levels).toContain("高");
    expect(levels).toContain("中");
  });
});

describe("cross-seed consistency", () => {
  it("no overlapping IDs between 00C and 00D", () => {
    const cIds = new Set(SEED_00C.map((e) => e.id));
    const dIds = new Set(SEED_00D.map((e) => e.id));
    for (const id of cIds) {
      expect(dIds.has(id)).toBe(false);
    }
  });
});
