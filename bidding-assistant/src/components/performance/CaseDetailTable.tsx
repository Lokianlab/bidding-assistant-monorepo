"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import type { NotionPage } from "@/lib/dashboard/types";
import { F, DEFAULT_STATUS_COLORS } from "@/lib/dashboard/types";
import { fmt, fmtDateTime } from "@/lib/dashboard/helpers";

interface CaseDetailTableProps {
  pages: NotionPage[];
}

export function CaseDetailTable({ pages }: CaseDetailTableProps) {
  return (
    <Card>
      <CardHeader className="pb-2 px-3 sm:px-6">
        <CardTitle className="text-sm">案件明細（{pages.length} 件）</CardTitle>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        <div className="overflow-x-auto -mx-3 sm:mx-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>標案名稱</TableHead>
                <TableHead className="w-24">進程</TableHead>
                <TableHead className="w-28">截標時間</TableHead>
                <TableHead className="hidden sm:table-cell w-28 text-right">預算金額</TableHead>
                <TableHead className="hidden lg:table-cell w-28">招標機關</TableHead>
                <TableHead className="hidden lg:table-cell w-24">企劃人員</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    沒有符合條件的案件
                  </TableCell>
                </TableRow>
              ) : (
                pages.map((page) => {
                  const p = page.properties;
                  const status = p[F.進程] ?? "";
                  const statusColor = DEFAULT_STATUS_COLORS[status] ?? "bg-gray-100 text-gray-600";
                  return (
                    <TableRow key={page.id}>
                      <TableCell className="font-medium max-w-[200px]">
                        <span className="line-clamp-2 text-sm">{p[F.名稱] || "-"}</span>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${statusColor}`}>
                          {status}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{fmtDateTime(p[F.截標])}</TableCell>
                      <TableCell className="hidden sm:table-cell text-right font-mono text-sm">
                        {p[F.預算] ? fmt(p[F.預算]) : "-"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm max-w-[140px] truncate">
                        {p[F.招標機關] || "-"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">
                        {Array.isArray(p[F.企劃主筆]) ? p[F.企劃主筆].join("、") : "-"}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
