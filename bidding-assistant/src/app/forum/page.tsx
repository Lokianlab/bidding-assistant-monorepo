"use client";

import { useState, useMemo } from "react";
import { useForum } from "@/lib/forum/useForum";
import { ForumOverview } from "@/components/forum/ForumOverview";
import { ForumFilters, type ForumFilterState } from "@/components/forum/ForumFilters";
import { ThreadList } from "@/components/forum/ThreadList";
import { ThreadDetail } from "@/components/forum/ThreadDetail";
import { ComposePost } from "@/components/forum/ComposePost";
import { PendingApprovals } from "@/components/forum/PendingApprovals";
import { Button } from "@/components/ui/button";
import { formatTimestamp } from "@/lib/forum/helpers";
import type { ForumThread, ForumPost } from "@/lib/forum/types";

const DEFAULT_FILTERS: ForumFilterState = {
  status: null,
  machine: null,
  type: null,
  search: "",
};

export default function ForumPage() {
  const { data, loading, error, refresh } = useForum();
  const [filters, setFilters] = useState<ForumFilterState>(DEFAULT_FILTERS);
  const [selectedThread, setSelectedThread] = useState<ForumThread | null>(null);
  const [showOverview, setShowOverview] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ForumPost | null>(null);

  // 篩選討論串
  const filteredThreads = useMemo(() => {
    if (!data) return [];
    let threads = data.threads;

    if (filters.status) {
      threads = threads.filter((t) => t.status === filters.status);
    }
    if (filters.machine) {
      threads = threads.filter(
        (t) =>
          t.initiator === filters.machine ||
          t.posts.some((p) => p.machineCode === filters.machine),
      );
    }
    if (filters.type) {
      threads = threads.filter((t) =>
        t.posts.some((p) => p.type === filters.type),
      );
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      threads = threads.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.id.toLowerCase().includes(q) ||
          t.summary.toLowerCase().includes(q),
      );
    }

    return threads;
  }, [data, filters]);

  // 批准/退回：以 Jin 身分發帖，POST 帶 updateStatus 會同時更新 _threads.md 狀態並 git push
  const handleApprove = async (threadId: string, message: string) => {
    await fetch("/api/forum", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: `✅ 批准：${message}`,
        threadId,
        type: "reply",
        priority: "P0",
        updateStatus: "已結案",
      }),
    });
    refresh();
  };

  const handleReject = async (threadId: string, message: string) => {
    await fetch("/api/forum", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: `❌ 退回：${message}`,
        threadId,
        type: "reply",
        priority: "P0",
        updateStatus: "進行中",
      }),
    });
    refresh();
  };

  // 批量批准所有待核准的 thread
  const handleBatchApprove = async (threadIds: string[]) => {
    for (const threadId of threadIds) {
      await fetch("/api/forum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "✅ 批量批准",
          threadId,
          type: "reply",
          priority: "P0",
          updateStatus: "已結案",
        }),
      });
    }
    refresh();
  };

  // 批量退回所有待核准的 thread
  const handleBatchReject = async (threadIds: string[], message: string) => {
    for (const threadId of threadIds) {
      await fetch("/api/forum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: `❌ 退回：${message}`,
          threadId,
          type: "reply",
          priority: "P0",
          updateStatus: "進行中",
        }),
      });
    }
    refresh();
  };

  // 投票
  const handleVote = async (threadId: string, vote: "agree" | "disagree" | "withdraw") => {
    await fetch("/api/forum", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ threadId, vote }),
    });
    refresh();
    // 更新 selectedThread 的投票狀態
    if (selectedThread?.id === threadId) {
      const res = await fetch("/api/forum");
      const updated = await res.json();
      const updatedThread = updated.threads?.find((t: ForumThread) => t.id === threadId);
      if (updatedThread) setSelectedThread(updatedThread);
    }
  };

  // 從所有帖子收集活躍機器清單
  const availableMachines = useMemo(() => {
    if (!data) return [];
    const set = new Set<string>();
    for (const p of data.posts) {
      set.add(p.machineCode);
    }
    return Array.from(set).sort();
  }, [data]);

  // loading.tsx 提供 Suspense fallback，這裡只處理 data loading
  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">載入論壇資料中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold">機器論壇</h1>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-destructive">{error}</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={refresh}>
            重試
          </Button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // 討論串詳情視圖
  if (selectedThread) {
    return (
      <div className="p-6 space-y-4">
        <ThreadDetail
          thread={selectedThread}
          onBack={() => setSelectedThread(null)}
          onVote={handleVote}
          onReplyTo={(post) => setReplyingTo(post)}
        />
        {/* 在討論串詳情底部放回覆框 */}
        <ComposePost
          threadId={selectedThread.id}
          threadTitle={selectedThread.title}
          replyToRef={replyingTo ? `${replyingTo.machineCode}:${replyingTo.timestamp}` : undefined}
          replyToPreview={replyingTo ? `${replyingTo.machineCode} ${formatTimestamp(replyingTo.timestamp)}：${replyingTo.content.slice(0, 60)}...` : undefined}
          onClearReplyTo={() => setReplyingTo(null)}
          onPosted={() => {
            refresh();
            setReplyingTo(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* 標題列 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">機器論壇</h1>
        <div className="flex gap-2">
          <Button
            className="bg-yellow-500 hover:bg-yellow-600 text-yellow-950"
            size="sm"
            onClick={() => setShowCompose(!showCompose)}
          >
            {showCompose ? "收起" : "開新話題"}
          </Button>
          <Button
            variant={showOverview ? "default" : "outline"}
            size="sm"
            onClick={() => setShowOverview(!showOverview)}
          >
            {showOverview ? "隱藏統計" : "統計總覽"}
          </Button>
          <Button variant="outline" size="sm" onClick={refresh}>
            重新整理
          </Button>
        </div>
      </div>

      {/* Jin 發言框（開新話題） */}
      {showCompose && (
        <ComposePost
          onPosted={() => {
            refresh();
            setShowCompose(false);
          }}
          onCancel={() => setShowCompose(false)}
        />
      )}

      {/* 統計總覽（可摺疊） */}
      {showOverview && <ForumOverview stats={data.stats} />}

      {/* 待批准決策 */}
      <PendingApprovals
        threads={data.threads}
        onApprove={handleApprove}
        onReject={handleReject}
        onBatchApprove={handleBatchApprove}
        onBatchReject={handleBatchReject}
        onViewThread={setSelectedThread}
      />

      {/* 篩選器 */}
      <ForumFilters
        filters={filters}
        onChange={setFilters}
        availableMachines={availableMachines}
      />

      {/* 討論串清單 */}
      <ThreadList threads={filteredThreads} onSelect={setSelectedThread} />
    </div>
  );
}

