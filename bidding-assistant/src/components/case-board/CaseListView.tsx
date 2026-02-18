"use client";

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StageProgressBar } from "./StageProgressBar";
import type { NotionPage } from "@/lib/dashboard/types";
import { F } from "@/lib/dashboard/types";
import { fmt, fmtDate } from "@/lib/dashboard/helpers";
import { parseDateField } from "@/lib/dashboard/helpers";
import {
  getCaseProgress,
  saveCaseProgress,
  getDeadlineUrgency,
  getUrgencyColor,
} from "@/lib/case-board/helpers";
import type { StageStatus } from "@/lib/case-board/types";

interface CaseListViewProps {
  pages: NotionPage[];
  onPageClick: (page: NotionPage) => void;
  onProgressChange: () => void;
}

export function CaseListView({ pages, onPageClick, onProgressChange }: CaseListViewProps) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const todayMs = now.getTime();

  function handleStageChange(pageId: string, stageId: string, status: StageStatus) {
    const progress = getCaseProgress(pageId);
    const updated = {
      ...progress,
      stages: progress.stages.map((s) =>
        s.stageId === stageId ? { ...s, status } : s,
      ),
      lastUpdated: new Date().toISOString(),
    };
    saveCaseProgress(pageId, updated);
    onProgressChange();
  }

  return (
    <div className="overflow-x-auto -mx-3 sm:mx-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>標案名稱</TableHead>
            <TableHead className="w-24">進程</TableHead>
            <TableHead className="w-28">截標時間</TableHead>
            <TableHead className="w-16">剩餘</TableHead>
            <TableHead className="hidden sm:table-cell w-28 text-right">預算金額</TableHead>
            <TableHead className="hidden lg:table-cell w-28">招標機關</TableHead>
            <TableHead className="w-36">AI 進度</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pages.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                沒有符合條件的標案
              </TableCell>
            </TableRow>
          ) : (
            pages.map((page) => {
              const p = page.properties;
              const deadlineTs = parseDateField(p[F.截標]);
              const daysLeftVal = deadlineTs > 0
                ? Math.ceil((deadlineTs - todayMs) / 86400000)
                : null;
              const urgency = getDeadlineUrgency(daysLeftVal);
              const urgencyColor = getUrgencyColor(urgency);
              const progress = getCaseProgress(page.id);

              return (
                <TableRow
                  key={page.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onPageClick(page)}
                >
                  <TableCell className="font-medium max-w-[200px]">
                    <span className="line-clamp-2 text-sm">{p[F.名稱] || "—"}</span>
                  </TableCell>
                  <TableCell className="text-xs">{p[F.進程] ?? "—"}</TableCell>
                  <TableCell className="text-xs whitespace-nowrap">
                    {fmtDate(p[F.截標])}
                  </TableCell>
                  <TableCell>
                    {daysLeftVal !== null ? (
                      <Badge className={`text-[10px] ${urgencyColor}`}>
                        {daysLeftVal > 0 ? `${daysLeftVal}天` : "逾期"}
                      </Badge>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-right font-mono text-sm">
                    {p[F.預算] ? fmt(p[F.預算]) : "—"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm max-w-[140px] truncate">
                    {p[F.招標機關] || "—"}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <StageProgressBar
                      stages={progress.stages}
                      editable
                      onStageChange={(stageId, status) =>
                        handleStageChange(page.id, stageId, status)
                      }
                    />
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
