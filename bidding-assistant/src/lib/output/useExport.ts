"use client";

import { useState, useCallback } from "react";
import { exportDocument } from "./export-engine";
import type { ExportOptions, ExportFormat, ExportResult } from "./types";

export interface UseExportReturn {
  isExporting: boolean;
  lastError: string | null;
  doExport: (options: ExportOptions) => Promise<ExportResult | null>;
  downloadBlob: (blob: Blob, filename: string) => void;
}

export function useExport(): UseExportReturn {
  const [isExporting, setIsExporting] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const doExport = useCallback(
    async (options: ExportOptions): Promise<ExportResult | null> => {
      setIsExporting(true);
      setLastError(null);
      try {
        const result = await exportDocument(options);
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "匯出失敗，請稍後再試";
        setLastError(msg);
        return null;
      } finally {
        setIsExporting(false);
      }
    },
    []
  );

  const downloadBlob = useCallback((blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  return { isExporting, lastError, doExport, downloadBlob };
}

// ── 格式顯示名稱 ──────────────────────────────────────────────

export const FORMAT_LABELS: Record<ExportFormat, string> = {
  docx: "Word (.docx)",
  markdown: "Markdown (.md)",
  print: "列印（PDF）",
};
