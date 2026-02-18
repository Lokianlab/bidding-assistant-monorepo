"use client";

import React from "react";
import type {
  CustomCardConfig,
  VisualizationType,
  MetricKey,
} from "@/lib/dashboard/card-layout/types";
import type { DashboardMetrics } from "@/lib/dashboard/useDashboardMetrics";

// ── Placeholder visualization components ──────────────────────
// These will be replaced by actual implementations in ./visualizations/

function NumberViz({ value, config }: { value: unknown; config: CustomCardConfig }) {
  const displayValue = typeof value === "number" ? value : 0;
  return (
    <div className="text-2xl font-bold">
      {config.numberFormat === "currency"
        ? `$${displayValue.toLocaleString()}`
        : config.numberFormat === "percentage"
          ? `${Math.round(displayValue * 100)}%`
          : displayValue.toLocaleString()}
    </div>
  );
}

function RingViz({ value, config }: { value: unknown; config: CustomCardConfig }) {
  const pct = typeof value === "number" ? Math.min(Math.max(Math.round(value * 100), 0), 100) : 0;
  const size = 64;
  const stroke = 5;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  return (
    <div className="flex items-center gap-3">
      <svg width={size} height={size} className="shrink-0">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-muted/30" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="currentColor" strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-emerald-500 transition-all duration-500"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className="text-xs font-bold fill-current">
          {pct}%
        </text>
      </svg>
      <span className="text-sm text-muted-foreground">{config.title}</span>
    </div>
  );
}

function BarViz({ value }: { value: unknown; config: CustomCardConfig }) {
  if (!Array.isArray(value)) {
    return <div className="text-sm text-muted-foreground">-- 無資料 --</div>;
  }
  return (
    <div className="text-sm text-muted-foreground">
      Bar chart placeholder ({value.length} items)
    </div>
  );
}

function LineViz({ value }: { value: unknown; config: CustomCardConfig }) {
  if (!Array.isArray(value)) {
    return <div className="text-sm text-muted-foreground">-- 無資料 --</div>;
  }
  return (
    <div className="text-sm text-muted-foreground">
      Line chart placeholder ({value.length} items)
    </div>
  );
}

function GaugeViz({ value, config }: { value: unknown; config: CustomCardConfig }) {
  const pct = typeof value === "number" ? Math.min(Math.max(Math.round(value * 100), 0), 100) : 0;
  return (
    <div className="text-center">
      <div className="text-2xl font-bold">{pct}%</div>
      <div className="text-xs text-muted-foreground">{config.title}</div>
    </div>
  );
}

function MiniTableViz({ value }: { value: unknown; config: CustomCardConfig }) {
  if (!Array.isArray(value)) {
    return <div className="text-sm text-muted-foreground">-- 無資料 --</div>;
  }
  return (
    <div className="text-sm text-muted-foreground">
      Mini table placeholder ({value.length} rows)
    </div>
  );
}

function StackedBarViz({ value }: { value: unknown; config: CustomCardConfig }) {
  if (!Array.isArray(value)) {
    return <div className="text-sm text-muted-foreground">-- 無資料 --</div>;
  }
  return (
    <div className="text-sm text-muted-foreground">
      Stacked bar placeholder ({value.length} items)
    </div>
  );
}

function HeatmapViz({ value }: { value: unknown; config: CustomCardConfig }) {
  if (!value) {
    return <div className="text-sm text-muted-foreground">-- 無資料 --</div>;
  }
  return (
    <div className="text-sm text-muted-foreground">
      Heatmap placeholder
    </div>
  );
}

// ── Visualization component map ──────────────────────────────

const VIZ_MAP: Record<
  VisualizationType,
  React.FC<{ value: unknown; config: CustomCardConfig }>
> = {
  number: NumberViz,
  ring: RingViz,
  bar: BarViz,
  line: LineViz,
  gauge: GaugeViz,
  "mini-table": MiniTableViz,
  "stacked-bar": StackedBarViz,
  heatmap: HeatmapViz,
};

// ── Metric key → DashboardMetrics field mapping ──────────────

function resolveMetricValue(
  metrics: DashboardMetrics,
  metricKey: MetricKey,
): unknown {
  const MAP: Record<MetricKey, () => unknown> = {
    activeProjects: () => metrics.activeProjects.length,
    totalBudget: () => metrics.totalBudget,
    wonBudget: () => metrics.wonBudget,
    winRate: () => metrics.winRate / 100, // stored as 0-100 in metrics, convert to 0-1 ratio
    biddingBudget: () => metrics.biddingBudget,
    yearSubmitted: () => metrics.yearSubmittedCount,
    yearWon: () => metrics.yearWonCount,
    monthSubmitted: () => metrics.monthSubmittedCount,
    weekSubmitted: () => metrics.weekSubmittedCount,
    yearlyGoal: () => 0, // goal is external, not in metrics
    goalAttainment: () => 0, // computed externally
    monthlyTarget: () => 0, // target is external
    weeklyTarget: () => 0, // target is external
    totalCost: () => metrics.totalCost.total,
    teamWorkload: () => metrics.teamWorkload,
    monthlyTrend: () => metrics.monthlyTrend,
    typeAnalysis: () => metrics.typeAnalysis,
    statusDistribution: () => metrics.statusDistribution,
    costBreakdown: () => metrics.totalCostByPeriod,
  };

  const resolver = MAP[metricKey];
  return resolver ? resolver() : undefined;
}

// ── CustomCard component ─────────────────────────────────────

interface CustomCardProps {
  config: CustomCardConfig;
  metrics: DashboardMetrics;
}

/**
 * Renders a custom card based on its config.
 * Looks up the metric key in the metrics object to get data,
 * then renders the appropriate visualization component.
 */
export function CustomCard({ config, metrics }: CustomCardProps) {
  const value = resolveMetricValue(metrics, config.metric);
  const VizComponent = VIZ_MAP[config.visualization];

  if (!VizComponent) {
    return (
      <div className="text-sm text-muted-foreground">
        unknown visualization type: {config.visualization}
      </div>
    );
  }

  return <VizComponent value={value} config={config} />;
}

export default CustomCard;
