// ====== 建案確認對話框 ======
// 顯示 PCC 標案預覽，確認後建入 Notion 追蹤資料庫

"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/lib/context/settings-context";
import type { ScanResult } from "@/lib/scan/types";

interface CreateCaseDialogProps {
  result: ScanResult | null;
  open: boolean;
  onClose: () => void;
  onSuccess: (pageUrl: string) => void;
}

const CATEGORY_LABEL: Record<string, string> = {
  must: "⭐ 推薦",
  review: "🔍 需要看",
  other: "❓ 其他",
};

export function CreateCaseDialog({
  result,
  open,
  onClose,
  onSuccess,
}: CreateCaseDialogProps) {
  const { settings } = useSettings();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { token, databaseId } = settings.connections.notion;
  const hasCredentials = Boolean(token && databaseId);

  const handleCreate = async () => {
    if (!result || !token || !databaseId) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/notion/create-case", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, databaseId, tender: result.tender }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? "建案失敗");
        return;
      }
      onSuccess(data.url ?? "");
    } catch {
      setError("網路錯誤，請稍後再試");
    } finally {
      setCreating(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !creating) {
      setError(null);
      onClose();
    }
  };

  if (!result) return null;

  const { tender, classification } = result;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent aria-describedby="create-case-desc">
        <DialogHeader>
          <DialogTitle>建立追蹤案件</DialogTitle>
        </DialogHeader>

        <div id="create-case-desc" className="space-y-3 text-sm">
          <div className="rounded-md bg-muted p-3 space-y-1.5">
            <p>
              <span className="text-muted-foreground">標案名稱：</span>
              {tender.title}
            </p>
            <p>
              <span className="text-muted-foreground">招標機關：</span>
              {tender.unit}
            </p>
            {tender.jobNumber && (
              <p>
                <span className="text-muted-foreground">案號：</span>
                {tender.jobNumber}
              </p>
            )}
            {tender.publishDate && (
              <p>
                <span className="text-muted-foreground">公告日：</span>
                {tender.publishDate}
              </p>
            )}
            <p>
              <span className="text-muted-foreground">分類：</span>
              {CATEGORY_LABEL[classification.category] ?? classification.category}
            </p>
          </div>

          {!hasCredentials && (
            <p className="text-yellow-600 dark:text-yellow-400">
              請先至設定頁面填入 Notion Token 與 Database ID 並儲存。
            </p>
          )}

          {error && (
            <p className="text-red-600 dark:text-red-400">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={creating}>
            取消
          </Button>
          <Button onClick={handleCreate} disabled={creating || !hasCredentials}>
            {creating ? "建案中..." : "✅ 建案到 Notion"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
