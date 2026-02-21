"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MachineAvatar } from "./MachineAvatar";
import { PostCard } from "./PostCard";
import {
  THREAD_STATUS_CONFIG,
  POST_TYPE_CONFIG,
} from "@/lib/forum/constants";
import type { ForumStats, ThreadStatus, PostType } from "@/lib/forum/types";

interface ForumOverviewProps {
  stats: ForumStats;
}

export function ForumOverview({ stats }: ForumOverviewProps) {
  const statuses = Object.keys(THREAD_STATUS_CONFIG) as ThreadStatus[];

  // 機器活躍度，按帖子數降序
  const machineEntries = Object.entries(stats.byMachine).sort(
    (a, b) => b[1] - a[1],
  );

  // 帖子類型統計
  const typeEntries = Object.entries(stats.byType)
    .filter(([type]) => type in POST_TYPE_CONFIG)
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      {/* 統計卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              討論串總數
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalThreads}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              帖子總數
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPosts}</div>
          </CardContent>
        </Card>
        {statuses.slice(0, 2).map((status) => {
          const config = THREAD_STATUS_CONFIG[status];
          return (
            <Card key={status}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {config.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.byStatus[status]}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 機器活躍度 + 帖子類型 */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">機器活躍度</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {machineEntries.map(([code, count]) => {
                const maxCount = machineEntries[0]?.[1] || 1;
                const pct = Math.round((count / maxCount) * 100);
                return (
                  <div key={code} className="flex items-center gap-3">
                    <MachineAvatar code={code} className="w-14 text-center" />
                    <div className="flex-1">
                      <div
                        className="h-5 rounded bg-blue-100 dark:bg-blue-900/30 flex items-center"
                        style={{ width: `${pct}%` }}
                      >
                        <span className="px-2 text-xs font-medium">
                          {count}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">帖子類型分佈</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {typeEntries.map(([type, count]) => {
                const config = POST_TYPE_CONFIG[type as PostType];
                if (!config) return null;
                return (
                  <div key={type} className="flex items-center justify-between">
                    <span className="text-sm">{config.label}</span>
                    <span className="text-sm font-medium">{count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 近期動態 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">近期動態</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.recentPosts.map((post, i) => (
              <PostCard
                key={`${post.timestamp}-${post.machineCode}-${i}`}
                post={post}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
