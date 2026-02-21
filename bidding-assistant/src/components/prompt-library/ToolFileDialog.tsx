"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { PromptFile } from "@/data/config/prompt-assembly";
import { toast } from "sonner";

interface ToolFileDialogProps {
  file: PromptFile;
  open: boolean;
  onClose: () => void;
}

export function ToolFileDialog({ file, open, onClose }: ToolFileDialogProps) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copying, setCopying] = useState(false);

  useEffect(() => {
    if (!open) {
      setContent(null);
      return;
    }

    setLoading(true);
    fetch(`/api/prompts?file=${encodeURIComponent(file.filename)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then(setContent)
      .catch(() => {
        toast.error(`無法載入 ${file.label}`);
        setContent(null);
      })
      .finally(() => setLoading(false));
  }, [open, file.filename, file.label]);

  async function handleCopy() {
    if (!content) return;
    setCopying(true);
    try {
      await navigator.clipboard.writeText(content);
      toast.success(`已複製「${file.label}」到剪貼簿`);
    } catch {
      toast.error("複製失敗，請手動選取複製");
    } finally {
      setCopying(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Badge className="bg-amber-100 text-amber-800 border-amber-300">
              {file.id}
            </Badge>
            {file.label}
          </DialogTitle>
          <DialogDescription>{file.filename}</DialogDescription>
        </DialogHeader>

        <div className="mt-2 space-y-3">
          {loading && (
            <p className="text-sm text-muted-foreground">載入中...</p>
          )}
          {!loading && content !== null && (
            <pre className="text-xs bg-muted p-4 rounded-md overflow-x-auto whitespace-pre-wrap break-words max-h-[55vh] overflow-y-auto">
              {content}
            </pre>
          )}
          {!loading && content === null && (
            <p className="text-sm text-muted-foreground">無法載入檔案內容</p>
          )}

          <Button
            className="w-full"
            onClick={handleCopy}
            disabled={copying || !content}
          >
            {copying ? "複製中..." : "複製到剪貼簿"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
