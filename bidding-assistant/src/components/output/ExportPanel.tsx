"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AlertCircle, Download, Loader2 } from "lucide-react";
import { FORMAT_LABELS } from "@/lib/output/useExport";
import type { ExportFormat } from "@/lib/output/types";

interface ExportPanelProps {
  isExporting: boolean;
  errorMessage?: string | null;
  onExport: (options: {
    format: ExportFormat;
    coverPage: boolean;
    tableOfContents: boolean;
  }) => void;
}

export function ExportPanel({ isExporting, errorMessage, onExport }: ExportPanelProps) {
  const [format, setFormat] = useState<ExportFormat>("docx");
  const [coverPage, setCoverPage] = useState(true);
  const [tableOfContents, setTableOfContents] = useState(true);

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium mb-2 block">匯出格式</Label>
        <div className="space-y-1.5">
          {(["docx", "markdown"] as ExportFormat[]).map((f) => (
            <div key={f} className="flex items-center space-x-2">
              <input
                type="radio"
                id={`format-${f}`}
                name="export-format"
                value={f}
                checked={format === f}
                onChange={() => setFormat(f)}
                className="accent-primary"
              />
              <Label htmlFor={`format-${f}`} className="text-sm cursor-pointer">
                {FORMAT_LABELS[f]}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {format === "docx" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="cover-page" className="text-sm cursor-pointer">
              封面頁
            </Label>
            <Switch
              id="cover-page"
              checked={coverPage}
              onCheckedChange={setCoverPage}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="toc" className="text-sm cursor-pointer">
              自動目錄
            </Label>
            <Switch
              id="toc"
              checked={tableOfContents}
              onCheckedChange={setTableOfContents}
            />
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-start gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      <Button
        className="w-full"
        onClick={() => onExport({ format, coverPage, tableOfContents })}
        disabled={isExporting}
      >
        {isExporting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            匯出中...
          </>
        ) : (
          <>
            <Download className="h-4 w-4 mr-2" />
            匯出
          </>
        )}
      </Button>
    </div>
  );
}
