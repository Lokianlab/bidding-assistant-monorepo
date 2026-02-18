import type {
  CardSizePreset,
  CardConfig,
  CustomCardConfig,
} from "./types";

export interface CardDefinition {
  type: string;
  name: string;
  description: string;
  icon: string;
  category: "stat" | "chart" | "gauge" | "custom";
  allowedSizes: CardSizePreset[];
  defaultSize: CardSizePreset;
  defaultConfig: CardConfig | CustomCardConfig;
}

export const CARD_REGISTRY: CardDefinition[] = [
  // ── Stat cards ──────────────────────────────────────────────
  {
    type: "stat-projects",
    name: "當前標案數",
    description: "顯示目前進行中的標案總數",
    icon: "📋",
    category: "stat",
    allowedSizes: ["small", "medium"],
    defaultSize: "small",
    defaultConfig: {
      title: "當前標案數",
      period: "all",
      numberFormat: "integer",
      showTrend: true,
    },
  },
  {
    type: "stat-budget",
    name: "預算總額",
    description: "所有進行中標案的預算加總",
    icon: "💰",
    category: "stat",
    allowedSizes: ["small", "medium"],
    defaultSize: "small",
    defaultConfig: {
      title: "預算總額",
      period: "all",
      numberFormat: "currency",
      showTrend: true,
    },
  },
  {
    type: "stat-won",
    name: "得標金額",
    description: "已得標案件的金額加總",
    icon: "🏆",
    category: "stat",
    allowedSizes: ["small", "medium"],
    defaultSize: "small",
    defaultConfig: {
      title: "得標金額",
      period: "year",
      numberFormat: "currency",
      showTrend: true,
    },
  },
  {
    type: "stat-winrate",
    name: "得標率",
    description: "得標件數佔總投標件數的比率",
    icon: "📊",
    category: "stat",
    allowedSizes: ["small", "medium"],
    defaultSize: "small",
    defaultConfig: {
      title: "得標率",
      period: "year",
      numberFormat: "percentage",
      showTrend: true,
      threshold: { warn: 0.3, danger: 0.15 },
    },
  },
  {
    type: "stat-bidding",
    name: "競標中金額",
    description: "目前正在競標中的標案金額加總",
    icon: "🔥",
    category: "stat",
    allowedSizes: ["small", "medium"],
    defaultSize: "small",
    defaultConfig: {
      title: "競標中金額",
      period: "all",
      numberFormat: "currency",
      showTrend: false,
    },
  },
  {
    type: "stat-year-submitted",
    name: "年度投標件數",
    description: "今年度已投標的案件總數",
    icon: "📅",
    category: "stat",
    allowedSizes: ["small", "medium"],
    defaultSize: "small",
    defaultConfig: {
      title: "年度投標件數",
      period: "year",
      numberFormat: "integer",
      showTrend: true,
    },
  },
  {
    type: "stat-goal",
    name: "年度目標達成率",
    description: "年度得標金額佔目標金額的比率",
    icon: "🎯",
    category: "stat",
    allowedSizes: ["small", "medium"],
    defaultSize: "small",
    defaultConfig: {
      title: "年度目標達成率",
      period: "year",
      numberFormat: "percentage",
      showTrend: true,
      threshold: { warn: 0.5, danger: 0.25 },
    },
  },
  {
    type: "stat-monthly-target",
    name: "月投標達成率",
    description: "本月投標件數佔月目標的比率",
    icon: "📈",
    category: "stat",
    allowedSizes: ["small", "medium"],
    defaultSize: "small",
    defaultConfig: {
      title: "月投標達成率",
      period: "month",
      numberFormat: "percentage",
      showTrend: true,
      threshold: { warn: 0.5, danger: 0.25 },
    },
  },

  // ── Chart cards ─────────────────────────────────────────────
  {
    type: "chart-team-workload",
    name: "企劃人員工作量",
    description: "各企劃人員目前負責的標案數與進度",
    icon: "👥",
    category: "chart",
    allowedSizes: ["medium", "large", "wide"],
    defaultSize: "large",
    defaultConfig: {
      title: "企劃人員工作量",
      period: "all",
    },
  },
  {
    type: "chart-monthly-trend",
    name: "月份趨勢",
    description: "近期各月的投標與得標件數趨勢",
    icon: "📉",
    category: "chart",
    allowedSizes: ["medium", "large", "wide"],
    defaultSize: "large",
    defaultConfig: {
      title: "月份趨勢",
      period: "year",
    },
  },
  {
    type: "chart-type-analysis",
    name: "標案類型分析",
    description: "按標案類型分類的件數與金額分布",
    icon: "🧩",
    category: "chart",
    allowedSizes: ["medium", "large", "wide"],
    defaultSize: "medium",
    defaultConfig: {
      title: "標案類型分析",
      period: "year",
    },
  },

  // ── Gauge cards ─────────────────────────────────────────────
  {
    type: "gauge-weekly-bid",
    name: "本週投標進度",
    description: "本週投標件數佔週目標的進度",
    icon: "⏱️",
    category: "gauge",
    allowedSizes: ["small", "medium"],
    defaultSize: "small",
    defaultConfig: {
      title: "本週投標進度",
      period: "week",
      numberFormat: "percentage",
      threshold: { warn: 0.5, danger: 0.25 },
    },
  },
  {
    type: "gauge-cost",
    name: "投入成本",
    description: "標案相關的投入成本與預算對比",
    icon: "💸",
    category: "gauge",
    allowedSizes: ["small", "medium"],
    defaultSize: "small",
    defaultConfig: {
      title: "投入成本",
      period: "year",
      numberFormat: "currency",
      threshold: { warn: 0.8, danger: 0.95 },
    },
  },

  // ── Custom card ─────────────────────────────────────────────
  {
    type: "custom",
    name: "自訂卡片",
    description: "使用者可自行選擇指標與視覺化方式的卡片",
    icon: "🛠️",
    category: "custom",
    allowedSizes: ["small", "medium", "large", "wide", "tall"],
    defaultSize: "medium",
    defaultConfig: {
      metric: "activeProjects",
      visualization: "number",
      title: "自訂卡片",
    } as CustomCardConfig,
  },
];

/**
 * Retrieve a card definition by its type identifier.
 * Returns `undefined` when the type is not found.
 */
export function getCardDefinition(type: string): CardDefinition | undefined {
  return CARD_REGISTRY.find((card) => card.type === type);
}

/**
 * Return all card definitions that belong to the given category.
 */
export function getCardsByCategory(
  category: CardDefinition["category"],
): CardDefinition[] {
  return CARD_REGISTRY.filter((card) => card.category === category);
}
