"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useKnowledgeBase } from "@/lib/knowledge-base/useKnowledgeBase";
import { KB_CATEGORIES } from "@/lib/knowledge-base/constants";
import type { KBId } from "@/lib/knowledge-base/types";

interface KBInsertDialogProps {
  /** 插入佔位符時的回呼函式 */
  onInsert: (placeholder: string) => void;
}

type KBEntry = { id: string; label: string; placeholder: string };

/** 從各知識庫條目產生可插入的佔位符清單 */
function buildInsertOptions(category: KBId, kbData: ReturnType<typeof useKnowledgeBase>["data"]): KBEntry[] {
  const entries = (kbData[category] as unknown) as Array<Record<string, string>>;
  const active = entries.filter((e) => e.entryStatus === "active");

  switch (category) {
    case "00A":
      return active.flatMap((e) => {
        const roles: KBEntry[] = [];
        if (e.title) {
          roles.push({
            id: `00A-${e.id}-title`,
            label: `${e.name}（${e.title}）`,
            placeholder: `{{kb:00A:${e.title}}}`,
          });
        }
        return roles;
      });

    case "00B":
      return [
        { id: "00B-recent-3", label: "最近 3 筆實績", placeholder: "{{kb:00B:recent:3}}" },
        { id: "00B-recent-5", label: "最近 5 筆實績", placeholder: "{{kb:00B:recent:5}}" },
        ...active.map((e) => ({
          id: `00B-${e.id}`,
          label: e.projectName,
          placeholder: `{{kb:00B:${e.projectName}}}`,
        })),
      ];

    case "00C":
      return active.map((e) => ({
        id: `00C-${e.id}`,
        label: `${e.templateName}（${e.applicableType}）`,
        placeholder: `{{kb:00C:${e.applicableType}}}`,
      }));

    case "00D":
      return active.map((e) => ({
        id: `00D-${e.id}`,
        label: `${e.riskName}（${e.riskLevel}）`,
        placeholder: `{{kb:00D:${e.riskName}}}`,
      }));

    case "00E":
      return active.map((e) => ({
        id: `00E-${e.id}`,
        label: `${e.projectName}（${e.result}）`,
        placeholder: `{{kb:00E:${e.projectName}}}`,
      }));

    default:
      return [];
  }
}

const BRAND_OPTIONS: KBEntry[] = [
  { id: "brand-company-name", label: "公司名稱", placeholder: "{{company:name}}" },
  { id: "brand-company-tax", label: "統一編號", placeholder: "{{company:taxId}}" },
  { id: "brand-project-name", label: "案件名稱", placeholder: "{{project:name}}" },
  { id: "brand-date-roc", label: "今日日期（民國）", placeholder: "{{date:roc}}" },
];

export function KBInsertDialog({ onInsert }: KBInsertDialogProps) {
  const { data: kbData, hydrated } = useKnowledgeBase();
  const [open, setOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<KBId | "brand">("brand");

  const handleInsert = (placeholder: string) => {
    onInsert(placeholder);
    setOpen(false);
  };

  const options =
    selectedCategory === "brand"
      ? BRAND_OPTIONS
      : hydrated
        ? buildInsertOptions(selectedCategory, kbData)
        : [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          插入知識庫
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>插入知識庫內容</DialogTitle>
        </DialogHeader>

        {/* 類別選擇 */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setSelectedCategory("brand")}
            className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
              selectedCategory === "brand"
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            }`}
          >
            品牌 / 日期
          </button>
          {KB_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id as KBId)}
              className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                selectedCategory === cat.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80"
              }`}
            >
              {cat.icon} {cat.id}
            </button>
          ))}
        </div>

        {/* 選項清單 */}
        <div className="max-h-60 overflow-y-auto space-y-1">
          {options.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {!hydrated ? "載入中…" : "此類別目前沒有啟用的條目"}
            </p>
          ) : (
            options.map((opt) => (
              <button
                key={opt.id}
                onClick={() => handleInsert(opt.placeholder)}
                className="w-full flex items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-accent text-left"
              >
                <span className="truncate">{opt.label}</span>
                <Badge variant="outline" className="ml-2 shrink-0 font-mono text-xs">
                  {opt.placeholder}
                </Badge>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
