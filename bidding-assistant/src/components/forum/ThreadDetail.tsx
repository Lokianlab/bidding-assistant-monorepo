"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MachineAvatar } from "./MachineAvatar";
import { PostCard } from "./PostCard";
import {
  THREAD_STATUS_CONFIG,
  PRIORITY_CONFIG,
} from "@/lib/forum/constants";
import type { ForumThread } from "@/lib/forum/types";

interface ThreadDetailProps {
  thread: ForumThread;
  onBack: () => void;
}

export function ThreadDetail({ thread, onBack }: ThreadDetailProps) {
  const statusConfig = THREAD_STATUS_CONFIG[thread.status];
  const priorityConfig = thread.priority
    ? PRIORITY_CONFIG[thread.priority]
    : null;

  return (
    <div className="space-y-4">
      {/* 返回按鈕 + 標題 */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="shrink-0">
          ← 返回
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-semibold">{thread.title}</h2>
            {priorityConfig && (
              <Badge
                variant="outline"
                className={cn("text-xs", priorityConfig.className)}
              >
                {priorityConfig.label}
              </Badge>
            )}
            <Badge
              variant="outline"
              className={cn("text-xs", statusConfig.className)}
            >
              {statusConfig.label}
            </Badge>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-muted-foreground">發起人：</span>
            <MachineAvatar code={thread.initiator} />
            <span className="text-sm text-muted-foreground">
              {thread.summary}
            </span>
          </div>
        </div>
      </div>

      {/* 帖子流：帖主在上，回覆依序排下 */}
      {thread.posts.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">
          此討論串沒有關聯的帖子
        </div>
      ) : (
        <div className="space-y-3">
          {/* 帖主（原始帖） */}
          {thread.posts[0] && (
            <div className="ring-2 ring-blue-200 dark:ring-blue-800 rounded-lg">
              <PostCard post={thread.posts[0]} />
            </div>
          )}
          {/* 回覆 */}
          {thread.posts.length > 1 && (
            <div className="text-xs text-muted-foreground pl-4 border-l-2 border-muted">
              以下 {thread.posts.length - 1} 則回覆，由舊到新
            </div>
          )}
          {thread.posts.slice(1).map((post, i) => (
            <div key={`${post.timestamp}-${post.machineCode}-${i}`} className="ml-4">
              <PostCard post={post} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
