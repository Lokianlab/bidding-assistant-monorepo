import type { DashboardLayout } from "./types";
import { CARD_REGISTRY } from "./card-registry";

/**
 * Default dashboard layout matching the current fixed layout order.
 * Contains 13 cards (all preset types, excluding the "custom" card type).
 */
export const DEFAULT_DASHBOARD_LAYOUT: DashboardLayout = {
  gridCols: 4,
  cards: [
    // Row 1 – four small stat cards
    {
      cardId: "default-stat-projects",
      type: "stat-projects",
      position: 0,
      size: "small",
      config: { ...CARD_REGISTRY.find((c) => c.type === "stat-projects")!.defaultConfig },
    },
    {
      cardId: "default-stat-budget",
      type: "stat-budget",
      position: 1,
      size: "small",
      config: { ...CARD_REGISTRY.find((c) => c.type === "stat-budget")!.defaultConfig },
    },
    {
      cardId: "default-stat-won",
      type: "stat-won",
      position: 2,
      size: "small",
      config: { ...CARD_REGISTRY.find((c) => c.type === "stat-won")!.defaultConfig },
    },
    {
      cardId: "default-stat-winrate",
      type: "stat-winrate",
      position: 3,
      size: "small",
      config: { ...CARD_REGISTRY.find((c) => c.type === "stat-winrate")!.defaultConfig },
    },

    // Row 2 – four small stat cards
    {
      cardId: "default-stat-bidding",
      type: "stat-bidding",
      position: 4,
      size: "small",
      config: { ...CARD_REGISTRY.find((c) => c.type === "stat-bidding")!.defaultConfig },
    },
    {
      cardId: "default-stat-year-submitted",
      type: "stat-year-submitted",
      position: 5,
      size: "small",
      config: { ...CARD_REGISTRY.find((c) => c.type === "stat-year-submitted")!.defaultConfig },
    },
    {
      cardId: "default-stat-goal",
      type: "stat-goal",
      position: 6,
      size: "small",
      config: { ...CARD_REGISTRY.find((c) => c.type === "stat-goal")!.defaultConfig },
    },
    {
      cardId: "default-stat-monthly-target",
      type: "stat-monthly-target",
      position: 7,
      size: "small",
      config: { ...CARD_REGISTRY.find((c) => c.type === "stat-monthly-target")!.defaultConfig },
    },

    // Row 3 – chart (large) + two gauges (small)
    {
      cardId: "default-chart-team-workload",
      type: "chart-team-workload",
      position: 8,
      size: "large",
      config: { ...CARD_REGISTRY.find((c) => c.type === "chart-team-workload")!.defaultConfig },
    },
    {
      cardId: "default-gauge-weekly-bid",
      type: "gauge-weekly-bid",
      position: 9,
      size: "small",
      config: { ...CARD_REGISTRY.find((c) => c.type === "gauge-weekly-bid")!.defaultConfig },
    },
    {
      cardId: "default-gauge-cost",
      type: "gauge-cost",
      position: 10,
      size: "small",
      config: { ...CARD_REGISTRY.find((c) => c.type === "gauge-cost")!.defaultConfig },
    },

    // Row 4 – two chart cards (large + medium)
    {
      cardId: "default-chart-monthly-trend",
      type: "chart-monthly-trend",
      position: 11,
      size: "large",
      config: { ...CARD_REGISTRY.find((c) => c.type === "chart-monthly-trend")!.defaultConfig },
    },
    {
      cardId: "default-chart-type-analysis",
      type: "chart-type-analysis",
      position: 12,
      size: "medium",
      config: { ...CARD_REGISTRY.find((c) => c.type === "chart-type-analysis")!.defaultConfig },
    },
  ],
};
