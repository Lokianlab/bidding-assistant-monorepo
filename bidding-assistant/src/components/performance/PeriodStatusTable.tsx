"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import type { PeriodStatusRow } from "@/lib/dashboard/useAnalyticsMetrics";
import { PERFORMANCE_STATUS_COLUMNS } from "@/lib/dashboard/types";
import { BID_STATUS } from "@/lib/constants/bid-status";

interface PeriodStatusTableProps {
  data: PeriodStatusRow[];
  timeGranularity: "month" | "week";
}

export function PeriodStatusTable({ data, timeGranularity }: PeriodStatusTableProps) {
  // 找出表中實際出現的狀態欄位（按預設順序排列）
  const activeStatusCols = useMemo(() => {
    const seen = new Set<string>();
    for (const row of data) {
      for (const s of Object.keys(row.statusCounts)) seen.add(s);
    }
    return PERFORMANCE_STATUS_COLUMNS.filter((s) => seen.has(s));
  }, [data]);

  // 小計列
  const totals = useMemo(() => {
    const statusTotals: Record<string, number> = {};
    let grandTotal = 0;
    for (const row of data) {
      grandTotal += row.total;
      for (const [status, count] of Object.entries(row.statusCounts)) {
        statusTotals[status] = (statusTotals[status] ?? 0) + count;
      }
    }
    return { grandTotal, statusTotals };
  }, [data]);

  return (
    <Card className="mb-4 sm:mb-6">
      <CardHeader className="pb-2 px-3 sm:px-6">
        <CardTitle className="text-sm">
          {timeGranularity === "month" ? "月份" : "週次"}狀態統計明細
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        <div className="overflow-x-auto -mx-3 sm:mx-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">{timeGranularity === "month" ? "月份" : "週次"}</TableHead>
                <TableHead className="whitespace-nowrap">期間</TableHead>
                <TableHead className="text-right whitespace-nowrap">投標件數</TableHead>
                {activeStatusCols.map((s) => (
                  <TableHead key={s} className="text-right whitespace-nowrap text-xs">{s}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3 + activeStatusCols.length} className="text-center py-8 text-muted-foreground">
                    尚無資料
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {data.map((row) => (
                    <TableRow key={row.key}>
                      <TableCell className="font-medium whitespace-nowrap text-sm">{row.label}</TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{row.dateRange}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{row.total}</TableCell>
                      {activeStatusCols.map((s) => (
                        <StatusCountCell key={s} status={s} count={row.statusCounts[s] ?? 0} />
                      ))}
                    </TableRow>
                  ))}
                  {/* 小計列 */}
                  <TableRow className="border-t-2 font-semibold bg-muted/30">
                    <TableCell className="whitespace-nowrap">小計</TableCell>
                    <TableCell />
                    <TableCell className="text-right font-mono">{totals.grandTotal}</TableCell>
                    {activeStatusCols.map((s) => (
                      <StatusCountCell key={s} status={s} count={totals.statusTotals[s] ?? 0} bold />
                    ))}
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

// ====== 狀態數字儲存格 ======
function StatusCountCell({ status, count, bold }: { status: string; count: number; bold?: boolean }) {
  const colorClass = status === BID_STATUS.得標
    ? "text-emerald-600"
    : status === BID_STATUS.未獲青睞
      ? "text-rose-600"
      : "";

  return (
    <TableCell className={`text-right font-mono ${bold ? "" : "text-sm"}`}>
      {count > 0 ? (
        <span className={`${colorClass} ${bold ? "font-semibold" : ""}`}>{count}</span>
      ) : (
        <span className="text-muted-foreground/40">0</span>
      )}
    </TableCell>
  );
}
