export type CardSizePreset = "small" | "medium" | "large" | "wide" | "tall";

export interface CardSize {
  colSpan: number;
  rowSpan: number;
}

export const CARD_SIZE_MAP: Record<CardSizePreset, CardSize> = {
  small: { colSpan: 1, rowSpan: 1 },
  medium: { colSpan: 2, rowSpan: 1 },
  large: { colSpan: 2, rowSpan: 2 },
  wide: { colSpan: 4, rowSpan: 1 },
  tall: { colSpan: 1, rowSpan: 2 },
};

export type VisualizationType =
  | "number"
  | "ring"
  | "bar"
  | "line"
  | "gauge"
  | "mini-table"
  | "stacked-bar"
  | "heatmap";

export type MetricKey =
  | "activeProjects"
  | "totalBudget"
  | "wonBudget"
  | "winRate"
  | "biddingBudget"
  | "yearSubmitted"
  | "yearWon"
  | "monthSubmitted"
  | "weekSubmitted"
  | "yearlyGoal"
  | "goalAttainment"
  | "monthlyTarget"
  | "weeklyTarget"
  | "totalCost"
  | "teamWorkload"
  | "monthlyTrend"
  | "typeAnalysis"
  | "statusDistribution"
  | "costBreakdown";

export type MetricDataType = "number" | "ratio" | "array" | "matrix";

export interface CardConfig {
  title?: string;
  period?: "all" | "year" | "month" | "week";
  colorScheme?: string;
  threshold?: { warn: number; danger: number };
  showTrend?: boolean;
  numberFormat?: "integer" | "currency" | "percentage";
}

export interface CustomCardConfig extends CardConfig {
  metric: MetricKey;
  visualization: VisualizationType;
  chartConfig?: {
    showGrid?: boolean;
    showLegend?: boolean;
    showTooltip?: boolean;
    stacked?: boolean;
    axisLabel?: string;
  };
}

export interface DashboardCardLayout {
  cardId: string;
  type: string;
  position: number;
  size: CardSizePreset;
  config: CardConfig | CustomCardConfig;
}

export interface DashboardLayout {
  cards: DashboardCardLayout[];
  gridCols: number;
}
