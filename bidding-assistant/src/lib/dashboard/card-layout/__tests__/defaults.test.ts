import { describe, it, expect } from "vitest";
import { DEFAULT_DASHBOARD_LAYOUT } from "../defaults";
import { CARD_REGISTRY } from "../card-registry";

describe("DEFAULT_DASHBOARD_LAYOUT", () => {
  it("has 13 cards", () => {
    expect(DEFAULT_DASHBOARD_LAYOUT.cards).toHaveLength(13);
  });

  it("each card type exists in CARD_REGISTRY", () => {
    const registeredTypes = new Set(CARD_REGISTRY.map((c) => c.type));
    for (const card of DEFAULT_DASHBOARD_LAYOUT.cards) {
      expect(registeredTypes.has(card.type)).toBe(true);
    }
  });

  it("positions are sequential starting from 0", () => {
    const positions = DEFAULT_DASHBOARD_LAYOUT.cards.map((c) => c.position);
    for (let i = 0; i < positions.length; i++) {
      expect(positions[i]).toBe(i);
    }
  });

  it("each card has a unique cardId", () => {
    const ids = DEFAULT_DASHBOARD_LAYOUT.cards.map((c) => c.cardId);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("gridCols is set to 4", () => {
    expect(DEFAULT_DASHBOARD_LAYOUT.gridCols).toBe(4);
  });

  it("does not include the custom card type", () => {
    const types = DEFAULT_DASHBOARD_LAYOUT.cards.map((c) => c.type);
    expect(types).not.toContain("custom");
  });
});
