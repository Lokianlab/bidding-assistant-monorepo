"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { MachineAvatar } from "./MachineAvatar";
import {
  THREAD_STATUS_CONFIG,
  PRIORITY_CONFIG,
} from "@/lib/forum/constants";
import type { ForumThread } from "@/lib/forum/types";

interface ThreadListProps {
  threads: ForumThread[];
  onSelect: (thread: ForumThread) => void;
}

export function ThreadList({ threads, onSelect }: ThreadListProps) {
  if (threads.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-12">
        沒有符合條件的討論串
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {threads.map((thread) => {
        const statusConfig = THREAD_STATUS_CONFIG[thread.status];
        const priorityConfig = thread.priority
          ? PRIORITY_CONFIG[thread.priority]
          : null;

        return (
          <button
            key={thread.id}
            onClick={() => onSelect(thread)}
            className="w-full text-left rounded-lg border bg-card p-4 hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-start gap-3">
              {/* 狀態圓點 */}
              <span
                className={cn(
                  "mt-1.5 w-2.5 h-2.5 rounded-full shrink-0",
                  statusConfig.dotColor,
                )}
              />

              <div className="flex-1 min-w-0">
                {/* 標題列 */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{thread.title}</span>
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
                  {thread.posts.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {thread.posts.length} 則帖子
                    </span>
                  )}
                </div>

                {/* 摘要 */}
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {thread.summary}
                </p>

                {/* 投票狀態 */}
                {(thread.agree.length > 0 || thread.disagree.length > 0) && (
                  <div className="flex items-center gap-3 mt-1.5">
                    {thread.agree.length > 0 && (
                      <span className="text-xs text-green-600 flex items-center gap-1">
                        <span>&#x2713;</span>
                        {thread.agree.map((code) => (
                          <MachineAvatar key={code} code={code} />
                        ))}
                      </span>
                    )}
                    {thread.disagree.length > 0 && (
                      <span className="text-xs text-red-600 flex items-center gap-1">
                        <span>&#x2717;</span>
                        {thread.disagree.map((code) => (
                          <MachineAvatar key={code} code={code} />
                        ))}
                      </span>
                    )}
                  </div>
                )}

                {/* 底部資訊 */}
                <div className="flex items-center gap-2 mt-2">
                  <MachineAvatar code={thread.initiator} />
                  <span className="text-xs text-muted-foreground">
                    {thread.lastUpdate}
                  </span>
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
