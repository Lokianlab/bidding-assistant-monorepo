"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { StageDefinition } from "@/data/config/stages";
import type { PromptFile } from "@/data/config/prompt-assembly";

interface StageCardProps {
  stage: StageDefinition;
  fileCount: number;
  selected: boolean;
  onClick: () => void;
}

export function StageCard({ stage, fileCount, selected, onClick }: StageCardProps) {
  const phaseColor = stage.phase === "投標"
    ? "bg-blue-100 text-blue-800 border-blue-300"
    : "bg-purple-100 text-purple-800 border-purple-300";

  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${
        selected ? "ring-2 ring-primary shadow-md" : ""
      }`}
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <Badge className={phaseColor}>{stage.id}</Badge>
          <Badge variant="secondary" className="text-[10px]">
            {fileCount} 個檔案
          </Badge>
        </div>
        <p className="font-semibold text-sm">{stage.name}</p>
        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
          {stage.triggerCommand}
        </code>
        <p className="text-xs text-muted-foreground line-clamp-2">
          {stage.description}
        </p>
      </CardContent>
    </Card>
  );
}

interface ToolCardProps {
  file: PromptFile;
  selected: boolean;
  onClick: () => void;
}

export function ToolCard({ file, selected, onClick }: ToolCardProps) {
  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${
        selected ? "ring-2 ring-primary shadow-md" : ""
      }`}
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <Badge className="bg-amber-100 text-amber-800 border-amber-300">
            {file.id}
          </Badge>
          <Badge variant="secondary" className="text-[10px]">
            {file.categoryLabel}
          </Badge>
        </div>
        <p className="font-semibold text-sm">{file.label}</p>
        <p className="text-xs text-muted-foreground">
          {file.filename}
        </p>
      </CardContent>
    </Card>
  );
}
