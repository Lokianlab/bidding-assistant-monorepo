import type { MetricKey, MetricDataType, VisualizationType } from "./types";

export interface MetricDefinition {
  key: MetricKey;
  name: string;
  description: string;
  dataType: MetricDataType;
  compatibleVisualizations: VisualizationType[];
  defaultVisualization: VisualizationType;
  defaultNumberFormat?: "integer" | "currency" | "percentage";
}

export const METRIC_REGISTRY: MetricDefinition[] = [
  // ── Number metrics ──────────────────────────────────────────
  {
    key: "activeProjects",
    name: "進行中標案數",
    description: "目前狀態為進行中的標案總數",
    dataType: "number",
    compatibleVisualizations: ["number", "ring", "gauge"],
    defaultVisualization: "number",
    defaultNumberFormat: "integer",
  },
  {
    key: "totalBudget",
    name: "預算總額",
    description: "所有進行中標案的預算加總金額",
    dataType: "number",
    compatibleVisualizations: ["number", "ring", "gauge"],
    defaultVisualization: "number",
    defaultNumberFormat: "currency",
  },
  {
    key: "wonBudget",
    name: "得標金額",
    description: "已得標案件的金額加總",
    dataType: "number",
    compatibleVisualizations: ["number", "ring", "gauge"],
    defaultVisualization: "number",
    defaultNumberFormat: "currency",
  },
  {
    key: "biddingBudget",
    name: "競標中金額",
    description: "目前正在競標中的標案金額加總",
    dataType: "number",
    compatibleVisualizations: ["number", "ring", "gauge"],
    defaultVisualization: "number",
    defaultNumberFormat: "currency",
  },
  {
    key: "yearSubmitted",
    name: "年度投標件數",
    description: "今年度已投標的案件總數",
    dataType: "number",
    compatibleVisualizations: ["number", "ring", "gauge"],
    defaultVisualization: "number",
    defaultNumberFormat: "integer",
  },
  {
    key: "yearWon",
    name: "年度得標件數",
    description: "今年度已得標的案件總數",
    dataType: "number",
    compatibleVisualizations: ["number", "ring", "gauge"],
    defaultVisualization: "number",
    defaultNumberFormat: "integer",
  },
  {
    key: "monthSubmitted",
    name: "月投標件數",
    description: "本月已投標的案件數",
    dataType: "number",
    compatibleVisualizations: ["number", "ring", "gauge"],
    defaultVisualization: "number",
    defaultNumberFormat: "integer",
  },
  {
    key: "weekSubmitted",
    name: "週投標件數",
    description: "本週已投標的案件數",
    dataType: "number",
    compatibleVisualizations: ["number", "ring", "gauge"],
    defaultVisualization: "number",
    defaultNumberFormat: "integer",
  },
  {
    key: "yearlyGoal",
    name: "年度目標金額",
    description: "年度得標目標金額",
    dataType: "number",
    compatibleVisualizations: ["number", "ring", "gauge"],
    defaultVisualization: "number",
    defaultNumberFormat: "currency",
  },
  {
    key: "monthlyTarget",
    name: "月投標目標",
    description: "每月投標件數目標",
    dataType: "number",
    compatibleVisualizations: ["number", "ring", "gauge"],
    defaultVisualization: "number",
    defaultNumberFormat: "integer",
  },
  {
    key: "weeklyTarget",
    name: "週投標目標",
    description: "每週投標件數目標",
    dataType: "number",
    compatibleVisualizations: ["number", "ring", "gauge"],
    defaultVisualization: "number",
    defaultNumberFormat: "integer",
  },
  {
    key: "totalCost",
    name: "投入成本",
    description: "標案相關的總投入成本",
    dataType: "number",
    compatibleVisualizations: ["number", "ring", "gauge"],
    defaultVisualization: "number",
    defaultNumberFormat: "currency",
  },

  // ── Ratio metrics (0-1) ────────────────────────────────────
  {
    key: "winRate",
    name: "得標率",
    description: "得標件數佔總投標件數的比率",
    dataType: "ratio",
    compatibleVisualizations: ["ring", "gauge", "number"],
    defaultVisualization: "ring",
    defaultNumberFormat: "percentage",
  },
  {
    key: "goalAttainment",
    name: "目標達成率",
    description: "年度得標金額佔目標金額的比率",
    dataType: "ratio",
    compatibleVisualizations: ["ring", "gauge", "number"],
    defaultVisualization: "ring",
    defaultNumberFormat: "percentage",
  },

  // ── Array metrics ──────────────────────────────────────────
  {
    key: "teamWorkload",
    name: "企劃人員工作量",
    description: "各企劃人員負責的標案數與狀態分布",
    dataType: "array",
    compatibleVisualizations: ["bar", "line", "stacked-bar", "mini-table"],
    defaultVisualization: "stacked-bar",
  },
  {
    key: "monthlyTrend",
    name: "月份趨勢",
    description: "近期各月的投標與得標件數趨勢",
    dataType: "array",
    compatibleVisualizations: ["bar", "line", "stacked-bar", "mini-table"],
    defaultVisualization: "line",
  },
  {
    key: "typeAnalysis",
    name: "標案類型分析",
    description: "按標案類型分類的件數與金額分布",
    dataType: "array",
    compatibleVisualizations: ["bar", "line", "stacked-bar", "mini-table"],
    defaultVisualization: "bar",
  },
  {
    key: "statusDistribution",
    name: "狀態分布",
    description: "各狀態的標案件數分布",
    dataType: "array",
    compatibleVisualizations: ["bar", "line", "stacked-bar", "mini-table"],
    defaultVisualization: "bar",
  },

  // ── Matrix metrics ─────────────────────────────────────────
  {
    key: "costBreakdown",
    name: "成本細項",
    description: "標案成本按類別與時間的二維分布",
    dataType: "matrix",
    compatibleVisualizations: ["heatmap"],
    defaultVisualization: "heatmap",
  },
];

/**
 * Return the list of compatible visualization types for a given metric key.
 * Returns an empty array when the metric key is not found.
 */
export function getCompatibleVisualizations(
  metricKey: MetricKey,
): VisualizationType[] {
  const metric = METRIC_REGISTRY.find((m) => m.key === metricKey);
  return metric ? metric.compatibleVisualizations : [];
}
