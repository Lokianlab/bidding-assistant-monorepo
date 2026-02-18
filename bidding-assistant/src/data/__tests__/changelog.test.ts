import { describe, it, expect } from "vitest";
import { CHANGELOG } from "../changelog";

describe("CHANGELOG", () => {
  it("should be non-empty", () => {
    expect(CHANGELOG.length).toBeGreaterThan(0);
  });

  it("should have versions in descending semver order", () => {
    for (let i = 0; i < CHANGELOG.length - 1; i++) {
      const current = CHANGELOG[i].version;
      const next = CHANGELOG[i + 1].version;

      // Parse semver parts for comparison
      const [cMajor, cMinor, cPatch] = current.split(".").map(Number);
      const [nMajor, nMinor, nPatch] = next.split(".").map(Number);

      const currentNum = cMajor * 10000 + cMinor * 100 + cPatch;
      const nextNum = nMajor * 10000 + nMinor * 100 + nPatch;

      expect(currentNum).toBeGreaterThan(nextNum);
    }
  });

  it("should have required fields for every entry", () => {
    for (const entry of CHANGELOG) {
      expect(entry.version).toBeTruthy();
      expect(entry.date).toBeTruthy();
      expect(entry.title).toBeTruthy();
      expect(Array.isArray(entry.changes)).toBe(true);
      expect(entry.changes.length).toBeGreaterThan(0);
    }
  });

  it("should have valid date format (YYYY-MM-DD) for every entry", () => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    for (const entry of CHANGELOG) {
      expect(entry.date).toMatch(dateRegex);
    }
  });

  it("should have valid change types for every change", () => {
    const validTypes = new Set(["feature", "fix", "improve", "breaking"]);

    for (const entry of CHANGELOG) {
      for (const change of entry.changes) {
        expect(validTypes.has(change.type)).toBe(true);
        expect(change.description).toBeTruthy();
      }
    }
  });

  it("should have unique version numbers", () => {
    const versions = CHANGELOG.map((e) => e.version);
    const unique = new Set(versions);
    expect(unique.size).toBe(versions.length);
  });
});
