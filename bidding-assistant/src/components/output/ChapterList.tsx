"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronUp, ChevronDown, Trash2, Plus } from "lucide-react";
import type { WorkbenchChapter } from "@/lib/output/types";

interface ChapterListProps {
  chapters: WorkbenchChapter[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onMove: (id: string, direction: "up" | "down") => void;
}

export function ChapterList({
  chapters,
  selectedId,
  onSelect,
  onAdd,
  onRemove,
  onMove,
}: ChapterListProps) {
  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="space-y-1 pr-1">
          {chapters.map((chapter, idx) => (
            <div
              key={chapter.id}
              className={`group flex items-center gap-1 rounded-md px-2 py-1.5 cursor-pointer text-sm transition-colors ${
                selectedId === chapter.id
                  ? "bg-accent"
                  : "hover:bg-accent/50"
              }`}
              onClick={() => onSelect(chapter.id)}
            >
              <span className="text-xs text-muted-foreground w-5 shrink-0">
                {idx + 1}.
              </span>
              <span className="flex-1 truncate" title={chapter.title}>
                {chapter.title || "（未命名）"}
              </span>
              <div className="hidden group-hover:flex items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMove(chapter.id, "up");
                  }}
                  disabled={idx === 0}
                >
                  <ChevronUp className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMove(chapter.id, "down");
                  }}
                  disabled={idx === chapters.length - 1}
                >
                  <ChevronDown className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 text-destructive hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(chapter.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
      <div className="pt-2 border-t mt-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={onAdd}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          新增章節
        </Button>
      </div>
    </div>
  );
}
