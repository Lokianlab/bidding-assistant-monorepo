"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
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

export function StackedBarViz({ data, config }: VizProps) {
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
  const showLegend = chartConfig?.showLegend ?? true;

  const items = data as Record<string, unknown>[];

  // Detect the name key and all numeric value keys
  const sampleItem = items[0];
  const allKeys = Object.keys(sampleItem);
  const nameKey =
    allKeys.find((k) => k === "name" || typeof sampleItem[k] === "string") ??
    allKeys[0];
  const valueKeys = allKeys.filter(
    (k) => k !== nameKey && typeof sampleItem[k] === "number"
  );

  if (valueKeys.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
        無資料
      </div>
    );
  }

  return (
    <div className="h-full w-full min-h-[150px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={items} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" className="opacity-30" />}
          <XAxis
            dataKey={nameKey}
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
          {showLegend && <Legend />}
          {valueKeys.map((key, i) => (
            <Bar
              key={key}
              dataKey={key}
              stackId="stack"
              fill={CHART_PALETTE[i % CHART_PALETTE.length]}
              radius={
                i === valueKeys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]
              }
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
