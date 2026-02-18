"use client";

import { useCallback, useMemo } from "react";
import { useSettings } from "@/lib/context/settings-context";
import { DEFAULT_DASHBOARD_LAYOUT } from "./defaults";
import { getCardDefinition } from "./card-registry";
import { logger } from "@/lib/logger";
import type {
  DashboardLayout,
  DashboardCardLayout,
  CardSizePreset,
  CardConfig,
  CustomCardConfig,
} from "./types";

export interface UseCardLayoutReturn {
  /** Current dashboard layout */
  layout: DashboardLayout;
  /** Reorder cards by moving a card from one position to another */
  reorder: (activeId: string, overId: string) => void;
  /** Resize a card */
  resize: (cardId: string, size: CardSizePreset) => void;
  /** Add a new card */
  add: (type: string, config?: CardConfig | CustomCardConfig) => void;
  /** Remove a card */
  remove: (cardId: string) => void;
  /** Update a card's config */
  updateConfig: (cardId: string, config: Partial<CardConfig | CustomCardConfig>) => void;
  /** Reset layout to defaults */
  reset: () => void;
}

/**
 * Hook for managing the customizable dashboard card layout.
 * Reads/writes layout state through the settings context (persisted to localStorage).
 */
export function useCardLayout(): UseCardLayoutReturn {
  const { settings, updateSettings } = useSettings();

  const layout = useMemo<DashboardLayout>(
    () => settings.dashboardLayout ?? DEFAULT_DASHBOARD_LAYOUT,
    [settings.dashboardLayout]
  );

  const persist = useCallback(
    (next: DashboardLayout) => {
      updateSettings({ dashboardLayout: next });
    },
    [updateSettings]
  );

  // ── Reorder ──────────────────────────────────────────────
  const reorder = useCallback(
    (activeId: string, overId: string) => {
      if (activeId === overId) return;

      const cards = [...layout.cards];
      const fromIdx = cards.findIndex((c) => c.cardId === activeId);
      const toIdx = cards.findIndex((c) => c.cardId === overId);
      if (fromIdx === -1 || toIdx === -1) return;

      const [moved] = cards.splice(fromIdx, 1);
      cards.splice(toIdx, 0, moved);

      // Recalculate positions
      const updated = cards.map((c, i) => ({ ...c, position: i }));
      persist({ ...layout, cards: updated });
      logger.info("system", "儀表板卡片重新排序", `${activeId} → ${overId}`, "useCardLayout");
    },
    [layout, persist]
  );

  // ── Resize ───────────────────────────────────────────────
  const resize = useCallback(
    (cardId: string, size: CardSizePreset) => {
      const cards = layout.cards.map((c) =>
        c.cardId === cardId ? { ...c, size } : c
      );
      persist({ ...layout, cards });
      logger.info("system", "儀表板卡片調整大小", `${cardId} → ${size}`, "useCardLayout");
    },
    [layout, persist]
  );

  // ── Add ──────────────────────────────────────────────────
  const add = useCallback(
    (type: string, config?: CardConfig | CustomCardConfig) => {
      const def = getCardDefinition(type);
      if (!def) {
        logger.error("system", "新增卡片失敗：未知類型", type, "useCardLayout");
        return;
      }

      const newCard: DashboardCardLayout = {
        cardId: `card-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type,
        position: layout.cards.length,
        size: def.defaultSize,
        config: config ?? { ...def.defaultConfig },
      };

      persist({ ...layout, cards: [...layout.cards, newCard] });
      logger.info("system", "新增儀表板卡片", `${type} (${newCard.cardId})`, "useCardLayout");
    },
    [layout, persist]
  );

  // ── Remove ───────────────────────────────────────────────
  const remove = useCallback(
    (cardId: string) => {
      const cards = layout.cards
        .filter((c) => c.cardId !== cardId)
        .map((c, i) => ({ ...c, position: i }));
      persist({ ...layout, cards });
      logger.info("system", "移除儀表板卡片", cardId, "useCardLayout");
    },
    [layout, persist]
  );

  // ── Update config ────────────────────────────────────────
  const updateConfig = useCallback(
    (cardId: string, configPatch: Partial<CardConfig | CustomCardConfig>) => {
      const cards = layout.cards.map((c) =>
        c.cardId === cardId
          ? { ...c, config: { ...c.config, ...configPatch } }
          : c
      );
      persist({ ...layout, cards });
      logger.debug("system", "更新卡片設定", `${cardId}: ${JSON.stringify(Object.keys(configPatch))}`, "useCardLayout");
    },
    [layout, persist]
  );

  // ── Reset ────────────────────────────────────────────────
  const reset = useCallback(() => {
    persist(DEFAULT_DASHBOARD_LAYOUT);
    logger.warn("system", "儀表板佈局已還原為預設值", undefined, "useCardLayout");
  }, [persist]);

  return { layout, reorder, resize, add, remove, updateConfig, reset };
}

export default useCardLayout;
