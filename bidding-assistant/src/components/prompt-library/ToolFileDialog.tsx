"use client";

import { useState, useEffect, useMemo } from "react";
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
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ToolFileDialogProps {
  file: PromptFile;
  open: boolean;
  onClose: () => void;
}

/** Extract h1/h2 headings from markdown content for outline navigation */
function extractHeadings(content: string): { level: number; text: string }[] {
  const headings: { level: number; text: string }[] = [];
  for (const line of content.split("\n")) {
    const match = line.match(/^(#{1,2})\s+(.+)/);
    if (match) {
      headings.push({ level: match[1].length, text: match[2].trim() });
    }
  }
  return headings;
}

export function ToolFileDialog({ file, open, onClose }: ToolFileDialogProps) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copying, setCopying] = useState(false);
  const [viewMode, setViewMode] = useState<"rendered" | "raw">("rendered");

  useEffect(() => {
    if (!open) {
      setContent(null);
      setViewMode("rendered");
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

  const headings = useMemo(
    () => (content ? extractHeadings(content) : []),
    [content]
  );

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

  function scrollToHeading(text: string) {
    const container = document.getElementById("tool-file-content");
    if (!container) return;
    const headingEls = container.querySelectorAll("h1, h2");
    for (const el of headingEls) {
      if (el.textContent?.trim() === text) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        break;
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Badge className="bg-amber-100 text-amber-800 border-amber-300">
              {file.id}
            </Badge>
            {file.label}
          </DialogTitle>
          <DialogDescription className="flex items-center justify-between">
            <span>{file.filename}</span>
            {content && (
              <span className="flex gap-1">
                <Button
                  variant={viewMode === "rendered" ? "default" : "ghost"}
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setViewMode("rendered")}
                >
                  預覽
                </Button>
                <Button
                  variant={viewMode === "raw" ? "default" : "ghost"}
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setViewMode("raw")}
                >
                  原始碼
                </Button>
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 flex flex-col gap-3">
          {/* Outline navigation */}
          {content && headings.length > 2 && viewMode === "rendered" && (
            <div className="flex flex-wrap gap-1 px-1">
              {headings.map((h, i) => (
                <button
                  key={i}
                  onClick={() => scrollToHeading(h.text)}
                  className={`text-xs px-2 py-0.5 rounded-full border hover:bg-accent transition-colors truncate max-w-[200px] ${
                    h.level === 1
                      ? "font-medium bg-muted"
                      : "text-muted-foreground"
                  }`}
                >
                  {h.text}
                </button>
              ))}
            </div>
          )}

          {/* Content area */}
          {loading && (
            <p className="text-sm text-muted-foreground py-8 text-center">
              載入中...
            </p>
          )}
          {!loading && content !== null && viewMode === "raw" && (
            <pre className="text-xs bg-muted p-4 rounded-md overflow-auto whitespace-pre-wrap break-words flex-1 min-h-0">
              {content}
            </pre>
          )}
          {!loading && content !== null && viewMode === "rendered" && (
            <div
              id="tool-file-content"
              className="prose prose-sm dark:prose-invert max-w-none overflow-y-auto flex-1 min-h-0 px-1"
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
              </ReactMarkdown>
            </div>
          )}
          {!loading && content === null && (
            <p className="text-sm text-muted-foreground py-8 text-center">
              無法載入檔案內容
            </p>
          )}

          <Button
            className="w-full shrink-0"
            onClick={handleCopy}
            disabled={copying || !content}
          >
            {copying ? "複製中..." : "複製到剪貼簿（原始文字）"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
