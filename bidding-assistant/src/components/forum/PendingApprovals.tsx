"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PRIORITY_CONFIG } from "@/lib/forum/constants";
import type { ForumThread } from "@/lib/forum/types";

interface PendingApprovalsProps {
  threads: ForumThread[];
  onApprove: (threadId: string, message: string) => Promise<void>;
  onReject: (threadId: string, message: string) => Promise<void>;
  onBatchApprove?: (threadIds: string[]) => Promise<void>;
  onViewThread: (thread: ForumThread) => void;
}

interface ActionState {
  threadId: string | null;
  mode: "approve" | "reject" | null;
  message: string;
  submitting: boolean;
}

export function PendingApprovals({
  threads,
  onApprove,
  onReject,
  onBatchApprove,
  onViewThread,
}: PendingApprovalsProps) {
  const [action, setAction] = useState<ActionState>({
    threadId: null,
    mode: null,
    message: "",
    submitting: false,
  });
  const [batchSubmitting, setBatchSubmitting] = useState(false);

  // 篩選出需要核准的討論串：狀態是「共識」的
  const pendingThreads = threads.filter((t) => t.status === "共識");

  if (pendingThreads.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
        目前沒有等待核准的決策
      </div>
    );
  }

  const handleBatchApprove = async () => {
    if (!onBatchApprove) return;
    setBatchSubmitting(true);
    try {
      await onBatchApprove(pendingThreads.map((t) => t.id));
    } finally {
      setBatchSubmitting(false);
    }
  };

  const handleSubmit = async (threadId: string) => {
    if (!action.mode) return;
    setAction((a) => ({ ...a, submitting: true }));

    try {
      const msg = action.message.trim() || (action.mode === "approve" ? "通過" : "不通過");
      if (action.mode === "approve") {
        await onApprove(threadId, msg);
      } else {
        await onReject(threadId, msg);
      }
      setAction({ threadId: null, mode: null, message: "", submitting: false });
    } catch {
      setAction((a) => ({ ...a, submitting: false }));
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold">待核准決策</h2>
        <Badge className="bg-yellow-400 text-yellow-900">{pendingThreads.length}</Badge>
        {onBatchApprove && pendingThreads.length > 1 && (
          <Button
            size="sm"
            className="ml-auto bg-green-600 hover:bg-green-700 text-white"
            disabled={batchSubmitting}
            onClick={handleBatchApprove}
          >
            {batchSubmitting ? "批准中..." : `全部批准（${pendingThreads.length} 項）`}
          </Button>
        )}
      </div>

      {pendingThreads.map((thread) => {
        const priorityConfig = thread.priority ? PRIORITY_CONFIG[thread.priority] : null;
        const isExpanded = action.threadId === thread.id;

        return (
          <div
            key={thread.id}
            className="rounded-lg border-2 border-yellow-300 dark:border-yellow-700 bg-card p-4 space-y-3"
          >
            {/* 標題列 */}
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{thread.title}</span>
                  {priorityConfig && (
                    <Badge variant="outline" className={cn("text-xs", priorityConfig.className)}>
                      {priorityConfig.label}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs text-yellow-700">
                    待你批准
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    發起人：{thread.initiator} | {thread.posts.length} 則討論
                  </span>
                </div>
                {thread.summary && (
                  <p className="text-sm text-muted-foreground mt-1">{thread.summary}</p>
                )}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewThread(thread)}
                className="shrink-0"
              >
                查看詳情
              </Button>
            </div>

            {/* 操作按鈕 */}
            {!isExpanded ? (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() =>
                    setAction({ threadId: thread.id, mode: "approve", message: "", submitting: false })
                  }
                >
                  批准
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-50"
                  onClick={() =>
                    setAction({ threadId: thread.id, mode: "reject", message: "", submitting: false })
                  }
                >
                  退回
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge
                    className={cn(
                      "text-xs",
                      action.mode === "approve"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800",
                    )}
                  >
                    {action.mode === "approve" ? "批准" : "退回"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">可附意見（選填）</span>
                </div>
                <textarea
                  className="w-full min-h-[60px] rounded-md border bg-background px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  placeholder={
                    action.mode === "approve"
                      ? "批准意見（留空則直接通過）..."
                      : "退回理由..."
                  }
                  value={action.message}
                  onChange={(e) => setAction((a) => ({ ...a, message: e.target.value }))}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={action.submitting}
                    className={cn(
                      action.mode === "approve"
                        ? "bg-green-600 hover:bg-green-700 text-white"
                        : "bg-red-600 hover:bg-red-700 text-white",
                    )}
                    onClick={() => handleSubmit(thread.id)}
                  >
                    {action.submitting
                      ? "送出中..."
                      : action.mode === "approve"
                        ? "確認批准"
                        : "確認退回"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setAction({ threadId: null, mode: null, message: "", submitting: false })
                    }
                  >
                    取消
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
