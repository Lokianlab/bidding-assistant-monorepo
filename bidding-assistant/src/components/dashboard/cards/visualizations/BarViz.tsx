"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { CHART_PALETTE } from "@/lib/chart-config";

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

export function BarViz({ data, config }: VizProps) {
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
        無資料
      </div>
    );
  }

  const chartConfig = config?.chartConfig;
  const showGrid = chartConfig?.showGrid ?? true;
  const showTooltip = chartConfig?.showTooltip ?? true;

  const items = data as Record<string, unknown>[];

  // Detect the numeric value key (first key that is not "name")
  const sampleItem = items[0];
  const valueKey =
    Object.keys(sampleItem).find(
      (k) => k !== "name" && typeof sampleItem[k] === "number"
    ) ?? "value";

  return (
    <div className="h-full w-full min-h-[150px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={items} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" className="opacity-30" />}
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            label={
              chartConfig?.axisLabel
                ? {
                    value: chartConfig.axisLabel,
                    angle: -90,
                    position: "insideLeft",
                    style: { fontSize: 12 },
                  }
                : undefined
            }
          />
          {showTooltip && <Tooltip />}
          <Bar dataKey={valueKey} radius={[4, 4, 0, 0]}>
            {items.map((_: unknown, index: number) => (
              <Cell
                key={`cell-${index}`}
                fill={CHART_PALETTE[index % CHART_PALETTE.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
