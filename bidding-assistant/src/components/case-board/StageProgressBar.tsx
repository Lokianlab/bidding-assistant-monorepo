"use client";

import { useState } from "react";
import {
  Popover, PopoverTrigger, PopoverContent,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { STAGES } from "@/data/config/stages";
import type { CaseStageProgress, StageStatus } from "@/lib/case-board/types";

const STATUS_STYLES: Record<StageStatus, string> = {
  completed: "bg-green-500",
  "in-progress": "bg-blue-500",
  "not-started": "bg-gray-200",
  skipped: "bg-gray-400",
};

const STATUS_LABELS: Record<StageStatus, string> = {
  "not-started": "未開始",
  "in-progress": "進行中",
  completed: "已完成",
  skipped: "略過",
};

const STATUS_OPTIONS: StageStatus[] = ["not-started", "in-progress", "completed", "skipped"];

interface StageProgressBarProps {
  stages: CaseStageProgress[];
  editable?: boolean;
  onStageChange?: (stageId: string, status: StageStatus) => void;
}

export function StageProgressBar({ stages, editable = false, onStageChange }: StageProgressBarProps) {
  const [openStageId, setOpenStageId] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-0.5">
      {stages.map((sp) => {
        const stageDef = STAGES.find((s) => s.id === sp.stageId);
        const label = stageDef?.name ?? sp.stageId;

        if (!editable) {
          return (
            <div
              key={sp.stageId}
              className={`w-5 h-3 rounded-sm ${STATUS_STYLES[sp.status]}`}
              title={`${sp.stageId} ${label}: ${STATUS_LABELS[sp.status]}`}
            />
          );
        }

        return (
          <Popover
            key={sp.stageId}
            open={openStageId === sp.stageId}
            onOpenChange={(v) => setOpenStageId(v ? sp.stageId : null)}
          >
            <PopoverTrigger asChild>
              <button
                className={`w-5 h-3 rounded-sm cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all ${STATUS_STYLES[sp.status]}`}
                title={`${sp.stageId} ${label}: ${STATUS_LABELS[sp.status]}`}
              />
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align="start">
              <p className="text-xs font-medium mb-1.5">
                {sp.stageId} {label}
              </p>
              <div className="flex flex-col gap-1">
                {STATUS_OPTIONS.map((s) => (
                  <Button
                    key={s}
                    variant={sp.status === s ? "default" : "ghost"}
                    size="sm"
                    className="justify-start text-xs h-7"
                    onClick={() => {
                      onStageChange?.(sp.stageId, s);
                      setOpenStageId(null);
                    }}
                  >
                    <span className={`w-2.5 h-2.5 rounded-sm mr-1.5 ${STATUS_STYLES[s]}`} />
                    {STATUS_LABELS[s]}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        );
      })}
    </div>
  );
}
