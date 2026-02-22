"use client";

import { useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { WorkbenchChapter } from "@/lib/output/types";

interface ChapterEditorProps {
  chapter: WorkbenchChapter;
  index: number;
  guideText?: string;
  suggestedLength?: string;
  onUpdate: (id: string, patch: Partial<Omit<WorkbenchChapter, "id" | "charCount">>) => void;
}

export function ChapterEditor({
  chapter,
  index,
  guideText,
  suggestedLength,
  onUpdate,
}: ChapterEditorProps) {
  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onUpdate(chapter.id, { title: e.target.value });
    },
    [chapter.id, onUpdate]
  );

  const handleContentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onUpdate(chapter.id, { content: e.target.value });
    },
    [chapter.id, onUpdate]
  );

  const charCount = chapter.charCount;
  let charCountColor = "text-muted-foreground";
  if (suggestedLength) {
    const [minStr, maxStr] = suggestedLength.split("-");
    const min = parseInt(minStr ?? "0");
    const max = parseInt(maxStr ?? "99999");
    if (charCount > 0 && charCount < min) charCountColor = "text-amber-500";
    else if (charCount > max) charCountColor = "text-red-500";
    else if (charCount >= min) charCountColor = "text-green-600";
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs shrink-0">
          第 {index + 1} 章
        </Badge>
        <Input
          value={chapter.title}
          onChange={handleTitleChange}
          className="font-medium h-8"
          placeholder="章節標題"
        />
      </div>

      {guideText && (
        <p className="text-xs text-muted-foreground px-1">{guideText}</p>
      )}

      <Textarea
        value={chapter.content}
        onChange={handleContentChange}
        placeholder="貼入或輸入 Markdown 內容..."
        className="min-h-[200px] font-mono text-sm resize-y"
      />

      <div className={`text-xs flex items-center gap-2 ${charCountColor}`}>
        <span>{charCount.toLocaleString()} 字</span>
        {suggestedLength && (
          <span className="text-muted-foreground">（建議 {suggestedLength} 字）</span>
        )}
      </div>
    </div>
  );
}
