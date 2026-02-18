"use client";

import { fmt } from "@/lib/dashboard/helpers";

export interface VizProps {
  data: unknown;
  config?: {
    title?: string;
    numberFormat?: "integer" | "currency" | "percentage";
    colorScheme?: string;
    threshold?: { warn: number; danger: number };
    showTrend?: boolean;
    chartConfig?: {
      showGrid?: boolean;
      showLegend?: boolean;
      showTooltip?: boolean;
      stacked?: boolean;
      axisLabel?: string;
    };
  };
}

function getThresholdColor(
  value: number,
  threshold?: { warn: number; danger: number }
): string {
  if (!threshold) return "text-foreground";
  if (value >= threshold.danger) return "text-red-500";
  if (value >= threshold.warn) return "text-amber-500";
  return "text-green-500";
}

function formatValue(
  value: number,
  numberFormat?: "integer" | "currency" | "percentage"
): string {
  switch (numberFormat) {
    case "currency":
      return `$${fmt(value)}`;
    case "percentage":
      return `${Math.round(value * 100)}%`;
    case "integer":
    default:
      return fmt(value);
  }
}

export function NumberViz({ data, config }: VizProps) {
  if (data == null || (typeof data === "number" && isNaN(data))) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
        無資料
      </div>
    );
  }

  const value = typeof data === "number" ? data : Number(data);
  if (isNaN(value)) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
        無資料
      </div>
    );
  }

  const colorClass = getThresholdColor(value, config?.threshold);
  const formatted = formatValue(value, config?.numberFormat);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-1">
      <span className={`text-3xl font-bold tabular-nums ${colorClass}`}>
        {formatted}
      </span>
      {config?.showTrend && (
        <span
          className={`text-sm font-medium ${
            value > 0 ? "text-green-500" : value < 0 ? "text-red-500" : "text-muted-foreground"
          }`}
        >
          {value > 0 ? "\u2191" : value < 0 ? "\u2193" : "\u2192"}
        </span>
      )}
    </div>
  );
}
