// ====== 建案確認對話框 ======
// 顯示 PCC 標案預覽，確認後建入 Notion 追蹤資料庫

"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/lib/context/settings-context";
import { usePatrolOrchestrator } from "@/lib/patrol";
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
  const { accepting, error, accept, reset } = usePatrolOrchestrator();

  const { token, databaseId } = settings.connections.notion;
  const hasCredentials = Boolean(token && databaseId);

  const handleCreate = async () => {
    if (!result) return;
    const acceptResult = await accept(result);
    if (acceptResult?.notion.success && acceptResult.notion.notionPageId) {
      const url = `https://www.notion.so/${acceptResult.notion.notionPageId.replace(/-/g, "")}`;
      onSuccess(url);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen && !accepting) {
      reset();
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
            <div className="flex items-start gap-2">
              <p className="text-red-600 dark:text-red-400 flex-1">{error}</p>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCreate}
                disabled={accepting}
                className="shrink-0"
              >
                🔄 重試
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={accepting}>
            取消
          </Button>
          <Button onClick={handleCreate} disabled={accepting || !hasCredentials}>
            {accepting ? "建案中..." : "✅ 建案到 Notion"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
