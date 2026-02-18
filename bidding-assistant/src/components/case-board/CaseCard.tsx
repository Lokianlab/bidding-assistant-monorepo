"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StageProgressBar } from "./StageProgressBar";
import type { NotionPage } from "@/lib/dashboard/types";
import { F } from "@/lib/dashboard/types";
import { fmt } from "@/lib/dashboard/helpers";
import {
  getCaseProgress,
  saveCaseProgress,
  getDeadlineUrgency,
  getUrgencyColor,
} from "@/lib/case-board/helpers";
import type { StageStatus } from "@/lib/case-board/types";
import { parseDateField } from "@/lib/dashboard/helpers";

interface CaseCardProps {
  page: NotionPage;
  onClick: () => void;
  onProgressChange?: () => void;
}

export function CaseCard({ page, onClick, onProgressChange }: CaseCardProps) {
  const p = page.properties;
  const name = (p[F.名稱] as string) ?? "";
  const agency = (p[F.招標機關] as string) ?? "";
  const budget = p[F.預算] as number | undefined;
  const deadlineTs = parseDateField(p[F.截標]);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const daysLeftVal = deadlineTs > 0
    ? Math.ceil((deadlineTs - now.getTime()) / 86400000)
    : null;

  const urgency = getDeadlineUrgency(daysLeftVal);
  const urgencyColor = getUrgencyColor(urgency);

  const progress = getCaseProgress(page.id);

  function handleStageChange(stageId: string, status: StageStatus) {
    const updated = {
      ...progress,
      stages: progress.stages.map((s) =>
        s.stageId === stageId ? { ...s, status } : s,
      ),
      lastUpdated: new Date().toISOString(),
    };
    saveCaseProgress(page.id, updated);
    onProgressChange?.();
  }

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardContent className="p-3 space-y-2">
        <p className="text-sm font-medium line-clamp-2">{name || "未命名標案"}</p>

        {agency && (
          <p className="text-xs text-muted-foreground truncate">{agency}</p>
        )}

        <div className="flex items-center justify-between">
          {budget ? (
            <span className="text-xs font-mono">${fmt(budget)}</span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
          {daysLeftVal !== null && (
            <Badge className={`text-[10px] ${urgencyColor}`}>
              {daysLeftVal > 0 ? `${daysLeftVal} 天` : daysLeftVal === 0 ? "今天截標" : "已逾期"}
            </Badge>
          )}
        </div>

        <div onClick={(e) => e.stopPropagation()}>
          <StageProgressBar
            stages={progress.stages}
            editable
            onStageChange={handleStageChange}
          />
        </div>
      </CardContent>
    </Card>
  );
}
