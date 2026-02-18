"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { RULE_MAP, FILE_MAP } from "@/data/config/prompt-assembly";
import type { StageDefinition } from "@/data/config/stages";
import { toast } from "sonner";
import { useState } from "react";

interface StageFileListProps {
  stage: StageDefinition;
  open: boolean;
  onClose: () => void;
}

export function StageFileList({ stage, open, onClose }: StageFileListProps) {
  const [copying, setCopying] = useState(false);
  const rule = RULE_MAP[stage.id];

  if (!rule) return null;

  // 系統核心
  const coreFiles = rule.alwaysLoad.map((id) => FILE_MAP[id]).filter(Boolean);
  // 階段提示詞 + 額外規範
  const stageFiles = [
    FILE_MAP[rule.stageFile],
    ...rule.extraSpecs.map((id) => FILE_MAP[id]),
  ].filter(Boolean);
  // 知識庫
  const kbEntries = Object.entries(rule.kb).map(([id, ref]) => ({
    file: FILE_MAP[id],
    ref,
  })).filter((e) => e.file);

  const allRequiredFiles = [
    ...coreFiles,
    ...stageFiles,
    ...kbEntries.filter((e) => e.ref === "required").map((e) => e.file),
  ];

  async function handleCopyAll() {
    setCopying(true);
    try {
      const parts: string[] = [];
      for (const f of allRequiredFiles) {
        if (!f) continue;
        const res = await fetch(`/api/prompts?file=${encodeURIComponent(f.filename)}`);
        if (!res.ok) {
          toast.error(`無法載入 ${f.label}`);
          continue;
        }
        const text = await res.text();
        parts.push(`${"=".repeat(60)}\n${f.label}\n${"=".repeat(60)}\n\n${text}`);
      }
      const assembled = parts.join("\n\n");
      await navigator.clipboard.writeText(assembled);
      toast.success(`已複製 ${parts.length} 個必要檔案到剪貼簿`);
    } catch {
      toast.error("複製失敗，請手動選取複製");
    } finally {
      setCopying(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{stage.id} {stage.name} — 檔案清單</DialogTitle>
          <DialogDescription>
            觸發指令：{stage.triggerCommand}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* 系統核心 */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">
              系統核心（永遠載入）
            </p>
            <div className="space-y-1">
              {coreFiles.map((f) => (
                <div key={f.id} className="flex items-center gap-2 text-sm">
                  <Badge variant="secondary" className="text-[10px] shrink-0">
                    {f.id}
                  </Badge>
                  <span>{f.label}</span>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* 階段提示詞 */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">
              階段提示詞
            </p>
            <div className="space-y-1">
              {stageFiles.map((f) => (
                <div key={f.id} className="flex items-center gap-2 text-sm">
                  <Badge className="bg-blue-100 text-blue-800 text-[10px] shrink-0">
                    {f.id}
                  </Badge>
                  <span>{f.label}</span>
                </div>
              ))}
            </div>
          </div>

          {kbEntries.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  知識庫
                </p>
                <div className="space-y-1">
                  {kbEntries.map(({ file: f, ref }) => (
                    <div key={f.id} className="flex items-center gap-2 text-sm">
                      <span className={ref === "required" ? "text-green-600" : "text-blue-500"}>
                        {ref === "required" ? "●" : "○"}
                      </span>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {f.id}
                      </Badge>
                      <span>{f.label}</span>
                      <span className="text-[10px] text-muted-foreground">
                        ({ref === "required" ? "必要" : "選擇性"})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <Separator />

          <Button
            className="w-full"
            onClick={handleCopyAll}
            disabled={copying}
          >
            {copying ? "組裝中..." : `一鍵複製必要檔案（${allRequiredFiles.length} 個）`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
