import { describe, it, expect } from "vitest";
import { CARD_SIZE_MAP } from "../types";
import type { CardSizePreset } from "../types";

const ALL_PRESETS: CardSizePreset[] = ["small", "medium", "large", "wide", "tall"];

describe("CARD_SIZE_MAP", () => {
  it("has all presets", () => {
    for (const preset of ALL_PRESETS) {
      expect(CARD_SIZE_MAP).toHaveProperty(preset);
    }
  });

  it("has exactly 5 presets", () => {
    expect(Object.keys(CARD_SIZE_MAP)).toHaveLength(5);
  });

  it("each size has positive colSpan and rowSpan", () => {
    for (const preset of ALL_PRESETS) {
      const size = CARD_SIZE_MAP[preset];
      expect(size.colSpan).toBeGreaterThan(0);
      expect(size.rowSpan).toBeGreaterThan(0);
    }
  });

  it("colSpan and rowSpan are integers", () => {
    for (const preset of ALL_PRESETS) {
      const size = CARD_SIZE_MAP[preset];
      expect(Number.isInteger(size.colSpan)).toBe(true);
      expect(Number.isInteger(size.rowSpan)).toBe(true);
    }
  });
});
