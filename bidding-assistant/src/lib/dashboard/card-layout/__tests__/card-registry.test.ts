import { describe, it, expect } from "vitest";
import {
  CARD_REGISTRY,
  getCardDefinition,
  getCardsByCategory,
} from "../card-registry";

describe("CARD_REGISTRY", () => {
  it("has 14 entries", () => {
    expect(CARD_REGISTRY).toHaveLength(14);
  });

  it("each type is unique", () => {
    const types = CARD_REGISTRY.map((c) => c.type);
    const uniqueTypes = new Set(types);
    expect(uniqueTypes.size).toBe(types.length);
  });

  it("every entry has required fields", () => {
    for (const card of CARD_REGISTRY) {
      expect(card.type).toBeTruthy();
      expect(card.name).toBeTruthy();
      expect(card.description).toBeTruthy();
      expect(card.icon).toBeTruthy();
      expect(["stat", "chart", "gauge", "custom"]).toContain(card.category);
      expect(card.allowedSizes.length).toBeGreaterThan(0);
      expect(card.allowedSizes).toContain(card.defaultSize);
      expect(card.defaultConfig).toBeDefined();
    }
  });
});

describe("getCardDefinition", () => {
  it("returns correct card for a known type", () => {
    const card = getCardDefinition("stat-projects");
    expect(card).toBeDefined();
    expect(card!.name).toBe("當前標案數");
    expect(card!.category).toBe("stat");
  });

  it("returns the custom card definition", () => {
    const card = getCardDefinition("custom");
    expect(card).toBeDefined();
    expect(card!.name).toBe("自訂卡片");
    expect(card!.category).toBe("custom");
  });

  it("returns undefined for unknown type", () => {
    expect(getCardDefinition("non-existent")).toBeUndefined();
  });
});

describe("getCardsByCategory", () => {
  it("returns 8 stat cards", () => {
    const stats = getCardsByCategory("stat");
    expect(stats).toHaveLength(8);
    stats.forEach((card) => expect(card.category).toBe("stat"));
  });

  it("returns 3 chart cards", () => {
    const charts = getCardsByCategory("chart");
    expect(charts).toHaveLength(3);
    charts.forEach((card) => expect(card.category).toBe("chart"));
  });

  it("returns 2 gauge cards", () => {
    const gauges = getCardsByCategory("gauge");
    expect(gauges).toHaveLength(2);
    gauges.forEach((card) => expect(card.category).toBe("gauge"));
  });

  it("returns 1 custom card", () => {
    const custom = getCardsByCategory("custom");
    expect(custom).toHaveLength(1);
    expect(custom[0].type).toBe("custom");
  });
});
