"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

function formatCellValue(
  value: unknown,
  numberFormat?: "integer" | "currency" | "percentage"
): string {
  if (value == null) return "-";
  if (typeof value === "number") {
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
  return String(value);
}

export function MiniTableViz({ data, config }: VizProps) {
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
        無資料
      </div>
    );
  }

  const items = data as Record<string, unknown>[];

  // Detect columns: expect "name" and a value key
  const sampleItem = items[0];
  const nameKey =
    Object.keys(sampleItem).find(
      (k) => k === "name" || typeof sampleItem[k] === "string"
    ) ?? Object.keys(sampleItem)[0];
  const valueKey =
    Object.keys(sampleItem).find(
      (k) => k !== nameKey && typeof sampleItem[k] === "number"
    ) ??
    Object.keys(sampleItem).find((k) => k !== nameKey) ??
    Object.keys(sampleItem)[1];

  // Limit to 10 rows
  const maxRows = 10;
  const displayData = items.slice(0, maxRows);
  const hasMore = items.length > maxRows;

  return (
    <div className="h-full w-full overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">{nameKey}</TableHead>
            {valueKey && <TableHead className="text-xs text-right">{valueKey}</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayData.map((item: Record<string, unknown>, index: number) => (
            <TableRow key={index}>
              <TableCell className="text-xs py-1.5">
                {String(item[nameKey] ?? "-")}
              </TableCell>
              {valueKey && (
                <TableCell className="text-xs text-right py-1.5 tabular-nums">
                  {formatCellValue(item[valueKey], config?.numberFormat)}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {hasMore && (
        <div className="text-center text-xs text-muted-foreground py-1">
          ...共 {items.length} 筆
        </div>
      )}
    </div>
  );
}
