import { describe, it, expect } from "vitest";
import { FIELDS_DASHBOARD, FIELDS_PERFORMANCE, FIELDS_DASHBOARD_KPI } from "../notion-fields";
import { DEFAULT_FIELD_MAP } from "../field-mapping";

describe("FIELDS_DASHBOARD", () => {
  it("is a non-empty array of strings", () => {
    expect(Array.isArray(FIELDS_DASHBOARD)).toBe(true);
    expect(FIELDS_DASHBOARD.length).toBeGreaterThan(0);
    for (const f of FIELDS_DASHBOARD) {
      expect(typeof f).toBe("string");
    }
  });

  it("contains known required fields", () => {
    const F = DEFAULT_FIELD_MAP;
    expect(FIELDS_DASHBOARD).toContain(F.名稱);
    expect(FIELDS_DASHBOARD).toContain(F.進程);
    expect(FIELDS_DASHBOARD).toContain(F.預算);
    expect(FIELDS_DASHBOARD).toContain(F.截標);
  });

  it("has no duplicates", () => {
    const unique = new Set(FIELDS_DASHBOARD);
    expect(unique.size).toBe(FIELDS_DASHBOARD.length);
  });
});

describe("FIELDS_PERFORMANCE", () => {
  it("is a non-empty array of strings", () => {
    expect(Array.isArray(FIELDS_PERFORMANCE)).toBe(true);
    expect(FIELDS_PERFORMANCE.length).toBeGreaterThan(0);
  });

  it("contains 進程 field for status filtering", () => {
    expect(FIELDS_PERFORMANCE).toContain(DEFAULT_FIELD_MAP.進程);
  });

  it("has no duplicates", () => {
    const unique = new Set(FIELDS_PERFORMANCE);
    expect(unique.size).toBe(FIELDS_PERFORMANCE.length);
  });
});

describe("FIELDS_DASHBOARD_KPI", () => {
  it("is a lightweight subset (5 fields)", () => {
    expect(FIELDS_DASHBOARD_KPI.length).toBe(5);
  });

  it("contains essential KPI fields", () => {
    const F = DEFAULT_FIELD_MAP;
    expect(FIELDS_DASHBOARD_KPI).toContain(F.進程);
    expect(FIELDS_DASHBOARD_KPI).toContain(F.截標);
    expect(FIELDS_DASHBOARD_KPI).toContain(F.預算);
  });

  it("is a subset of FIELDS_DASHBOARD", () => {
    for (const f of FIELDS_DASHBOARD_KPI) {
      expect(FIELDS_DASHBOARD).toContain(f);
    }
  });
});
