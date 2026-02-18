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

function getHeatColor(value: number, min: number, max: number): string {
  if (max === min) return "rgba(99, 102, 241, 0.5)";
  const ratio = (value - min) / (max - min);
  // Light to dark: from rgba(99,102,241,0.1) to rgba(99,102,241,1.0)
  const alpha = 0.1 + ratio * 0.9;
  return `rgba(99, 102, 241, ${alpha.toFixed(2)})`;
}

export function HeatmapViz({ data, config }: VizProps) {
  // data should be a 2D array (matrix)
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
        無資料
      </div>
    );
  }

  // Validate that it is a matrix (array of arrays)
  const matrix: number[][] = [];
  for (const row of data) {
    if (Array.isArray(row)) {
      matrix.push(row.map((v: unknown) => (typeof v === "number" ? v : 0)));
    }
  }

  if (matrix.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
        無資料
      </div>
    );
  }

  // Find min and max for color scaling
  const allValues = matrix.flat();
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);

  const cols = Math.max(...matrix.map((r) => r.length));

  // config is available for future color scheme customization
  void config;

  return (
    <div className="flex h-full w-full items-center justify-center overflow-auto p-1">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, minmax(24px, 1fr))`,
          gap: "2px",
          width: "100%",
        }}
      >
        {matrix.map((row, rowIdx) =>
          row.map((value, colIdx) => (
            <div
              key={`${rowIdx}-${colIdx}`}
              title={String(value)}
              style={{
                backgroundColor: getHeatColor(value, min, max),
                aspectRatio: "1",
              }}
              className="flex items-center justify-center rounded text-[10px] font-medium text-foreground/80 min-w-[24px] min-h-[24px]"
            >
              {value}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
