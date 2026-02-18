"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { STAGES } from "@/data/config/stages";
import { RULE_MAP, FILE_MAP } from "@/data/config/prompt-assembly";
import { toast } from "sonner";

export function EmergencyCopyPanel() {
  const [selectedStage, setSelectedStage] = useState<string>("L1");
  const [copying, setCopying] = useState(false);

  const rule = RULE_MAP[selectedStage];
  const stage = STAGES.find((s) => s.id === selectedStage);

  const filesToLoad = rule
    ? [
        ...rule.alwaysLoad.map((id) => FILE_MAP[id]),
        FILE_MAP[rule.stageFile],
        ...rule.extraSpecs.map((id) => FILE_MAP[id]),
        ...Object.entries(rule.kb)
          .filter(([, ref]) => ref === "required")
          .map(([id]) => FILE_MAP[id]),
      ].filter(Boolean)
    : [];

  async function handleAssembleAndCopy() {
    setCopying(true);
    try {
      const parts: string[] = [];
      for (const f of filesToLoad) {
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
      toast.success(`已組裝 ${parts.length} 個檔案並複製到剪貼簿`);
    } catch {
      toast.error("複製失敗，請手動選取複製");
    } finally {
      setCopying(false);
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-4">
      {/* 左側：階段選擇 */}
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground mb-2">
          選擇階段
        </p>
        {STAGES.map((s) => (
          <Button
            key={s.id}
            variant={selectedStage === s.id ? "default" : "ghost"}
            size="sm"
            className="w-full justify-start text-sm"
            onClick={() => setSelectedStage(s.id)}
          >
            <Badge
              className={`mr-2 text-[10px] ${
                s.phase === "投標"
                  ? "bg-blue-100 text-blue-800"
                  : "bg-purple-100 text-purple-800"
              }`}
            >
              {s.id}
            </Badge>
            {s.name}
          </Button>
        ))}
      </div>

      {/* 右側：檔案清單 + 複製按鈕 */}
      <Card>
        <CardContent className="p-4 space-y-3">
          {stage && (
            <div>
              <p className="font-semibold text-sm">
                {stage.id} {stage.name}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {stage.description}
              </p>
            </div>
          )}

          <Separator />

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">
              將載入的檔案（{filesToLoad.length} 個）
            </p>
            <div className="space-y-1">
              {filesToLoad.map((f) => f && (
                <div key={f.id} className="flex items-center gap-2 text-sm">
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {f.id}
                  </Badge>
                  <span>{f.label}</span>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <Button
            className="w-full"
            size="lg"
            onClick={handleAssembleAndCopy}
            disabled={copying}
          >
            {copying ? "組裝中..." : "組裝並複製到剪貼簿"}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            複製後請到 Claude.ai 貼上使用
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
