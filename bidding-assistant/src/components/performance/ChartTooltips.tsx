"use client";

import { formatCurrency } from "@/lib/chart-config";

interface TooltipPayloadEntry {
  color: string;
  name: string;
  value: number;
  dataKey: string;
}

interface BaseTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}

// ====== 基本圖表 Tooltip ======
export function ChartTooltip({ active, payload, label, isCurrency }: BaseTooltipProps & { isCurrency?: boolean }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background border rounded-lg shadow-lg p-2.5 text-sm">
      <p className="font-medium mb-1 text-xs">{label}</p>
      {payload.map((entry: TooltipPayloadEntry, i: number) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-mono">{isCurrency ? formatCurrency(entry.value) : entry.value}</span>
        </div>
      ))}
    </div>
  );
}

// ====== 累加圖 Tooltip ======
export function CumulativeTooltip({ active, payload, label }: BaseTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background border rounded-lg shadow-lg p-2.5 text-sm">
      <p className="font-medium mb-1 text-xs">{label}</p>
      {payload.map((entry: TooltipPayloadEntry, i: number) => {
        const isCum = entry.dataKey.startsWith("cum");
        return (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-mono">
              {entry.dataKey === "cumWonBudget" || entry.dataKey === "wonBudget"
                ? formatCurrency(entry.value)
                : entry.value}
            </span>
            {isCum && <span className="text-[10px] text-muted-foreground/60">（累計）</span>}
          </div>
        );
      })}
    </div>
  );
}

// ====== 同期比較 Tooltip ======
export function YoYTooltip({ active, payload, label }: BaseTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background border rounded-lg shadow-lg p-2.5 text-sm min-w-[180px]">
      <p className="font-medium mb-1 text-xs">{label}</p>
      {payload.map((entry: TooltipPayloadEntry, i: number) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-mono">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}
