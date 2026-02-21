"use client";

import { useState, useMemo } from "react";
import { useForum } from "@/lib/forum/useForum";
import { ForumOverview } from "@/components/forum/ForumOverview";
import { ForumFilters, type ForumFilterState } from "@/components/forum/ForumFilters";
import { ThreadList } from "@/components/forum/ThreadList";
import { ThreadDetail } from "@/components/forum/ThreadDetail";
import { Button } from "@/components/ui/button";
import type { ForumThread } from "@/lib/forum/types";

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

  // 從所有帖子收集活躍機器清單
  const availableMachines = useMemo(() => {
    if (!data) return [];
    const set = new Set<string>();
    for (const p of data.posts) {
      set.add(p.machineCode);
    }
    return Array.from(set).sort();
  }, [data]);

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
      <div className="p-6">
        <ThreadDetail
          thread={selectedThread}
          onBack={() => setSelectedThread(null)}
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

      {/* 統計總覽（可摺疊） */}
      {showOverview && <ForumOverview stats={data.stats} />}

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
