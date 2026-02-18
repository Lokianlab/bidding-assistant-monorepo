"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import type { WriterStat } from "@/lib/dashboard/useAnalyticsMetrics";
import { fmt } from "@/lib/dashboard/helpers";

interface WriterRankingTableProps {
  writerStats: WriterStat[];
}

export function WriterRankingTable({ writerStats }: WriterRankingTableProps) {
  return (
    <Card className="mb-4 sm:mb-6">
      <CardHeader className="pb-2 px-3 sm:px-6">
        <CardTitle className="text-sm">企劃人員績效排行</CardTitle>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>人員</TableHead>
                <TableHead className="text-right">投標件數</TableHead>
                <TableHead className="text-right">得標件數</TableHead>
                <TableHead className="text-right">得標率</TableHead>
                <TableHead className="text-right">得標金額</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {writerStats.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    尚無企劃人員資料
                  </TableCell>
                </TableRow>
              ) : (
                writerStats.map((w, i) => (
                  <TableRow key={w.name}>
                    <TableCell className="font-mono text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-medium">{w.name}</TableCell>
                    <TableCell className="text-right font-mono">{w.submitted}</TableCell>
                    <TableCell className="text-right font-mono text-emerald-600">{w.won}</TableCell>
                    <TableCell className="text-right font-mono">
                      <Badge
                        variant={w.winRate >= 50 ? "default" : "secondary"}
                        className="text-[10px]"
                      >
                        {w.winRate}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">${fmt(w.wonBudget)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
