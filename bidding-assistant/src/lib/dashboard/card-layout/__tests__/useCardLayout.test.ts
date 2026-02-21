import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { SettingsProvider } from "@/lib/context/settings-context";
import { useCardLayout } from "../useCardLayout";
import { DEFAULT_DASHBOARD_LAYOUT } from "../defaults";

// ── Helper ──────────────────────────────────────────────────

function wrapper({ children }: { children: ReactNode }) {
  return createElement(SettingsProvider, null, children);
}

beforeEach(() => {
  localStorage.clear();
});

// ── Layout initialization ───────────────────────────────────

describe("useCardLayout — initialization", () => {
  it("returns default layout when no settings stored", () => {
    const { result } = renderHook(() => useCardLayout(), { wrapper });
    expect(result.current.layout).toEqual(DEFAULT_DASHBOARD_LAYOUT);
  });

  it("returns all 6 operations", () => {
    const { result } = renderHook(() => useCardLayout(), { wrapper });
    expect(typeof result.current.reorder).toBe("function");
    expect(typeof result.current.resize).toBe("function");
    expect(typeof result.current.add).toBe("function");
    expect(typeof result.current.remove).toBe("function");
    expect(typeof result.current.updateConfig).toBe("function");
    expect(typeof result.current.reset).toBe("function");
  });
});

// ── Reorder ─────────────────────────────────────────────────

describe("useCardLayout — reorder", () => {
  it("swaps two cards correctly", () => {
    const { result } = renderHook(() => useCardLayout(), { wrapper });
    const firstId = result.current.layout.cards[0].cardId;
    const secondId = result.current.layout.cards[1].cardId;

    act(() => {
      result.current.reorder(firstId, secondId);
    });

    expect(result.current.layout.cards[0].cardId).toBe(secondId);
    expect(result.current.layout.cards[1].cardId).toBe(firstId);
    // Positions should be recalculated
    expect(result.current.layout.cards[0].position).toBe(0);
    expect(result.current.layout.cards[1].position).toBe(1);
  });

  it("does nothing when activeId === overId", () => {
    const { result } = renderHook(() => useCardLayout(), { wrapper });
    const original = result.current.layout.cards.map((c) => c.cardId);
    const firstId = original[0];

    act(() => {
      result.current.reorder(firstId, firstId);
    });

    expect(result.current.layout.cards.map((c) => c.cardId)).toEqual(original);
  });

  it("does nothing when activeId is not found", () => {
    const { result } = renderHook(() => useCardLayout(), { wrapper });
    const original = result.current.layout.cards.map((c) => c.cardId);

    act(() => {
      result.current.reorder("nonexistent", original[0]);
    });

    expect(result.current.layout.cards.map((c) => c.cardId)).toEqual(original);
  });

  it("does nothing when overId is not found", () => {
    const { result } = renderHook(() => useCardLayout(), { wrapper });
    const original = result.current.layout.cards.map((c) => c.cardId);

    act(() => {
      result.current.reorder(original[0], "nonexistent");
    });

    expect(result.current.layout.cards.map((c) => c.cardId)).toEqual(original);
  });
});

// ── Resize ──────────────────────────────────────────────────

describe("useCardLayout — resize", () => {
  it("changes the size of a card", () => {
    const { result } = renderHook(() => useCardLayout(), { wrapper });
    const cardId = result.current.layout.cards[0].cardId;

    act(() => {
      result.current.resize(cardId, "large");
    });

    const card = result.current.layout.cards.find((c) => c.cardId === cardId);
    expect(card?.size).toBe("large");
  });

  it("leaves other cards unchanged", () => {
    const { result } = renderHook(() => useCardLayout(), { wrapper });
    const cardId = result.current.layout.cards[0].cardId;
    const otherCard = result.current.layout.cards[1];

    act(() => {
      result.current.resize(cardId, "large");
    });

    const unchanged = result.current.layout.cards.find((c) => c.cardId === otherCard.cardId);
    expect(unchanged?.size).toBe(otherCard.size);
  });

  it("does not crash when resizing a nonexistent cardId", () => {
    const { result } = renderHook(() => useCardLayout(), { wrapper });
    const before = result.current.layout.cards.map((c) => ({ id: c.cardId, size: c.size }));

    act(() => {
      result.current.resize("nonexistent-card-id", "large");
    });

    const after = result.current.layout.cards.map((c) => ({ id: c.cardId, size: c.size }));
    expect(after).toEqual(before);
  });
});

// ── Add ─────────────────────────────────────────────────────

describe("useCardLayout — add", () => {
  it("adds a card of known type", () => {
    const { result } = renderHook(() => useCardLayout(), { wrapper });
    const before = result.current.layout.cards.length;

    act(() => {
      result.current.add("stat-projects");
    });

    expect(result.current.layout.cards.length).toBe(before + 1);
    const added = result.current.layout.cards[result.current.layout.cards.length - 1];
    expect(added.type).toBe("stat-projects");
    expect(added.position).toBe(before);
  });

  it("does not add a card of unknown type", () => {
    const { result } = renderHook(() => useCardLayout(), { wrapper });
    const before = result.current.layout.cards.length;

    act(() => {
      result.current.add("unknown-type-xyz");
    });

    expect(result.current.layout.cards.length).toBe(before);
  });

  it("uses provided config when given", () => {
    const { result } = renderHook(() => useCardLayout(), { wrapper });
    const customConfig = { title: "自訂標題", period: "year" as const, numberFormat: "integer" as const, showTrend: false };

    act(() => {
      result.current.add("stat-projects", customConfig);
    });

    const added = result.current.layout.cards[result.current.layout.cards.length - 1];
    expect(added.config).toEqual(customConfig);
  });
});

// ── Remove ──────────────────────────────────────────────────

describe("useCardLayout — remove", () => {
  it("removes a card and recalculates positions", () => {
    const { result } = renderHook(() => useCardLayout(), { wrapper });
    const before = result.current.layout.cards.length;
    const removeId = result.current.layout.cards[1].cardId;

    act(() => {
      result.current.remove(removeId);
    });

    expect(result.current.layout.cards.length).toBe(before - 1);
    expect(result.current.layout.cards.find((c) => c.cardId === removeId)).toBeUndefined();
    // Positions should be sequential
    result.current.layout.cards.forEach((c, i) => {
      expect(c.position).toBe(i);
    });
  });

  it("does nothing when cardId is not found (no crash)", () => {
    const { result } = renderHook(() => useCardLayout(), { wrapper });
    const before = result.current.layout.cards.length;

    act(() => {
      result.current.remove("nonexistent");
    });

    // Still same count (filter just returns all)
    expect(result.current.layout.cards.length).toBe(before);
  });
});

// ── Update config ───────────────────────────────────────────

describe("useCardLayout — updateConfig", () => {
  it("merges partial config into existing card", () => {
    const { result } = renderHook(() => useCardLayout(), { wrapper });
    const cardId = result.current.layout.cards[0].cardId;
    const originalConfig = { ...result.current.layout.cards[0].config };

    act(() => {
      result.current.updateConfig(cardId, { title: "新標題" });
    });

    const card = result.current.layout.cards.find((c) => c.cardId === cardId);
    expect(card?.config.title).toBe("新標題");
    // Other config keys should be preserved
    expect(card?.config.showTrend).toBe((originalConfig as { showTrend: boolean }).showTrend);
  });
});

// ── Reset ───────────────────────────────────────────────────

describe("useCardLayout — reset", () => {
  it("restores layout to defaults after modifications", () => {
    const { result } = renderHook(() => useCardLayout(), { wrapper });

    // Modify: remove a card
    act(() => {
      result.current.remove(result.current.layout.cards[0].cardId);
    });
    expect(result.current.layout.cards.length).toBe(DEFAULT_DASHBOARD_LAYOUT.cards.length - 1);

    // Reset
    act(() => {
      result.current.reset();
    });

    expect(result.current.layout).toEqual(DEFAULT_DASHBOARD_LAYOUT);
  });
});
