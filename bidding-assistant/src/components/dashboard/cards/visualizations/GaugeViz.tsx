"use client";

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

function getGaugeColor(
  ratio: number,
  threshold?: { warn: number; danger: number }
): string {
  if (!threshold) return "#6366f1";
  if (ratio >= threshold.danger / 100) return "#ef4444";
  if (ratio >= threshold.warn / 100) return "#f59e0b";
  return "#10b981";
}

export function GaugeViz({ data, config }: VizProps) {
  if (data == null || (typeof data === "number" && isNaN(data))) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
        無資料
      </div>
    );
  }

  const value = Number(data);
  if (isNaN(value)) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
        無資料
      </div>
    );
  }

  // Clamp to 0-100 range for the gauge
  const clampedValue = Math.max(0, Math.min(100, value));
  const ratio = clampedValue / 100;

  const gaugeColor = getGaugeColor(ratio, config?.threshold);

  // SVG semicircle gauge geometry
  const width = 200;
  const height = 120;
  const cx = width / 2;
  const cy = 100;
  const radius = 80;
  const strokeWidth = 12;

  // Arc calculations: semicircle from 180 to 0 degrees (left to right)
  const startAngle = Math.PI; // 180 degrees
  const endAngle = 0; // 0 degrees
  const sweepAngle = startAngle - endAngle;
  const valueAngle = startAngle - sweepAngle * ratio;

  // Background arc (full semicircle)
  const bgX1 = cx + radius * Math.cos(startAngle);
  const bgY1 = cy - radius * Math.sin(startAngle);
  const bgX2 = cx + radius * Math.cos(endAngle);
  const bgY2 = cy - radius * Math.sin(endAngle);

  const bgPath = `M ${bgX1} ${bgY1} A ${radius} ${radius} 0 1 1 ${bgX2} ${bgY2}`;

  // Value arc
  const valX2 = cx + radius * Math.cos(valueAngle);
  const valY2 = cy - radius * Math.sin(valueAngle);
  const largeArc = ratio > 0.5 ? 1 : 0;

  const valPath = `M ${bgX1} ${bgY1} A ${radius} ${radius} 0 ${largeArc} 1 ${valX2} ${valY2}`;

  // Display value
  let displayValue: string;
  if (config?.numberFormat === "percentage") {
    displayValue = `${Math.round(value)}%`;
  } else if (config?.numberFormat === "currency") {
    displayValue = `$${value.toLocaleString("zh-TW")}`;
  } else {
    displayValue = value.toLocaleString("zh-TW");
  }

  return (
    <div className="flex h-full items-center justify-center">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full max-w-[200px] h-auto"
      >
        {/* Background arc */}
        <path
          d={bgPath}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className="text-muted/30"
        />
        {/* Value arc */}
        {ratio > 0 && (
          <path
            d={valPath}
            fill="none"
            stroke={gaugeColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            className="transition-all duration-500"
          />
        )}
        {/* Center value */}
        <text
          x={cx}
          y={cy - 15}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-foreground font-bold"
          fontSize="22"
        >
          {displayValue}
        </text>
        {/* Min / Max labels */}
        <text
          x={cx - radius}
          y={cy + 16}
          textAnchor="middle"
          className="fill-muted-foreground"
          fontSize="10"
        >
          0
        </text>
        <text
          x={cx + radius}
          y={cy + 16}
          textAnchor="middle"
          className="fill-muted-foreground"
          fontSize="10"
        >
          100
        </text>
      </svg>
    </div>
  );
}
