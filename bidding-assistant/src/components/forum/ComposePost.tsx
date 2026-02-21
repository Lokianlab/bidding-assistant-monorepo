"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PRIORITY_CONFIG } from "@/lib/forum/constants";
import type { Priority } from "@/lib/forum/types";

interface ComposePostProps {
  /** 回覆模式：指定 threadId */
  threadId?: string;
  /** 回覆模式：顯示的討論串標題 */
  threadTitle?: string;
  /** 回覆特定帖子：ref 字串（如 "JDNE:20260223-0830"） */
  replyToRef?: string;
  /** 回覆特定帖子：被回覆帖子的摘要（給用戶看） */
  replyToPreview?: string;
  /** 清除回覆對象 */
  onClearReplyTo?: () => void;
  /** 發帖後回呼（重新整理資料） */
  onPosted: () => void;
  /** 取消回呼（摺疊輸入框） */
  onCancel?: () => void;
}

const PRIORITIES: Priority[] = ["P0", "P1", "P2", "P3"];

export function ComposePost({
  threadId,
  threadTitle,
  replyToRef,
  replyToPreview,
  onClearReplyTo,
  onPosted,
  onCancel,
}: ComposePostProps) {
  const isNewThread = !threadId;

  const [content, setContent] = useState("");
  const [newThreadTitle, setNewThreadTitle] = useState("");
  const [newThreadId, setNewThreadId] = useState("");
  const [priority, setPriority] = useState<Priority>("P0");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<"idle" | "synced" | "failed">("idle");

  // 自動從標題生成 thread ID（英文小寫+連字號）
  const handleTitleChange = (title: string) => {
    setNewThreadTitle(title);
    // 如果用戶沒手動改過 ID，自動生成
    if (!newThreadId || newThreadId === slugify(newThreadTitle)) {
      setNewThreadId(slugify(title));
    }
  };

  const handleSubmit = async () => {
    if (!content.trim()) return;
    if (isNewThread && !newThreadTitle.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const body: Record<string, string> = {
        content: content.trim(),
        priority,
        type: isNewThread ? "discuss" : "reply",
      };

      if (isNewThread) {
        // 新話題：帶標題和 thread ID
        const tid = newThreadId.trim() || slugify(newThreadTitle);
        body.threadId = tid;
        body.threadTitle = newThreadTitle.trim();
      } else {
        body.threadId = threadId;
      }

      // 引用特定帖子
      if (replyToRef) {
        body.ref = replyToRef;
      }

      const res = await fetch("/api/forum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "發帖失敗");
      }

      const data = await res.json();
      setSyncStatus(data.synced ? "synced" : "failed");

      // 成功，清空表單
      setContent("");
      setNewThreadTitle("");
      setNewThreadId("");
      onPosted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "發帖失敗");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-lg border-2 border-yellow-400 bg-yellow-50 dark:bg-yellow-950/20 p-4 space-y-3">
      {/* 標頭 */}
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center justify-center rounded-md px-2 py-0.5 text-sm font-bold bg-yellow-400 text-yellow-900">
          Jin
        </span>
        <span className="text-sm font-medium">
          {isNewThread ? "開新話題" : `回覆：${threadTitle}`}
        </span>
      </div>

      {/* 回覆特定帖子的引用預覽 */}
      {replyToRef && replyToPreview && (
        <div className="flex items-center gap-2 text-sm bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded px-3 py-1.5">
          <span className="text-blue-700 dark:text-blue-300">↩ {replyToPreview}</span>
          {onClearReplyTo && (
            <button
              onClick={onClearReplyTo}
              className="text-blue-400 hover:text-blue-600 ml-auto"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* 新話題：標題 + ID */}
      {isNewThread && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Input
            placeholder="話題標題（中文）"
            value={newThreadTitle}
            onChange={(e) => handleTitleChange(e.target.value)}
          />
          <Input
            placeholder="話題 ID（英文，自動生成）"
            value={newThreadId}
            onChange={(e) => setNewThreadId(e.target.value)}
            className="font-mono text-sm"
          />
        </div>
      )}

      {/* 優先級 */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">急迫程度：</span>
        {PRIORITIES.map((p) => {
          const config = PRIORITY_CONFIG[p];
          const active = priority === p;
          return (
            <button
              key={p}
              onClick={() => setPriority(p)}
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors",
                active ? "ring-2 ring-yellow-500" : "opacity-60 hover:opacity-100",
                config.className,
              )}
            >
              {config.label}
            </button>
          );
        })}
      </div>

      {/* 內容 */}
      <textarea
        className="w-full min-h-[120px] rounded-md border bg-background px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-yellow-400"
        placeholder={isNewThread ? "話題內容..." : "回覆內容..."}
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />

      {/* 錯誤 */}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* 同步狀態 */}
      {syncStatus === "synced" && (
        <p className="text-xs text-green-700">✓ 已同步到所有機器</p>
      )}
      {syncStatus === "failed" && (
        <p className="text-xs text-orange-600">⚠ 帖子已存檔，但 git 同步失敗——機器需手動 pull</p>
      )}

      {/* 按鈕 */}
      <div className="flex items-center gap-2">
        <Button
          onClick={handleSubmit}
          disabled={submitting || !content.trim() || (isNewThread && !newThreadTitle.trim())}
          className="bg-yellow-500 hover:bg-yellow-600 text-yellow-950"
        >
          {submitting ? "同步中..." : isNewThread ? "發起話題" : "送出回覆"}
        </Button>
        {onCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel}>
            取消
          </Button>
        )}
        <Badge variant="outline" className="ml-auto text-xs bg-yellow-100 text-yellow-800">
          最高位階
        </Badge>
      </div>
    </div>
  );
}

/** 中文標題 → 英文小寫 ID（保留英文和數字，其他變連字號） */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 25);
}
