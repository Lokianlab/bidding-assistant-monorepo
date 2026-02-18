"use client";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CaseCard } from "./CaseCard";
import type { NotionPage } from "@/lib/dashboard/types";
import { F, DEFAULT_STATUS_COLORS } from "@/lib/dashboard/types";

interface CaseKanbanViewProps {
  pages: NotionPage[];
  columns: string[];
  onPageClick: (page: NotionPage) => void;
  onProgressChange: () => void;
}

export function CaseKanbanView({
  pages,
  columns,
  onPageClick,
  onProgressChange,
}: CaseKanbanViewProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
      {columns.map((status) => {
        const colPages = pages.filter(
          (p) => p.properties[F.進程] === status,
        );
        const dotColor =
          (DEFAULT_STATUS_COLORS[status] ?? "bg-gray-300").split(" ")[0];
        return (
          <div key={status} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm flex items-center gap-1.5">
                <span className={`inline-block w-2.5 h-2.5 rounded-full ${dotColor}`} />
                {status}
              </h3>
              <Badge variant="secondary" className="text-xs">
                {colPages.length}
              </Badge>
            </div>
            <Separator />
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {colPages.map((page) => (
                <CaseCard
                  key={page.id}
                  page={page}
                  onClick={() => onPageClick(page)}
                  onProgressChange={onProgressChange}
                />
              ))}
              {colPages.length === 0 && (
                <div className="text-center text-xs text-muted-foreground py-8 border border-dashed rounded-lg">
                  無標案
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
