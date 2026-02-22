"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";

interface DocumentPreviewProps {
  html: string;
  projectName: string;
  open: boolean;
  onClose: () => void;
}

/**
 * 列印預覽對話框。
 * 將 HTML 注入 iframe，點「列印 / 儲存為 PDF」後觸發 iframe 內的列印對話框。
 */
export function DocumentPreview({ html, projectName, open, onClose }: DocumentPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // 當 html 更新時將內容寫入 iframe
  useEffect(() => {
    if (!open || !html) return;
    const iframe = iframeRef.current;
    if (!iframe) return;

    const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(html);
    doc.close();
  }, [html, open]);

  const handlePrint = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
  }, []);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="flex flex-row items-center justify-between px-4 py-3 border-b shrink-0">
          <DialogTitle className="text-sm font-medium">
            列印預覽 — {projectName}
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handlePrint} className="h-7 text-xs">
              <Printer className="h-3.5 w-3.5 mr-1.5" />
              列印 / 儲存為 PDF
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onClose}
              className="h-7 w-7 p-0"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">關閉</span>
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden bg-gray-100 p-4">
          <iframe
            ref={iframeRef}
            title="列印預覽"
            className="w-full h-full bg-white shadow-md rounded"
            sandbox="allow-same-origin allow-modals"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
