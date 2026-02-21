"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MachineAvatar } from "./MachineAvatar";
import { PostCard } from "./PostCard";
import {
  THREAD_STATUS_CONFIG,
  PRIORITY_CONFIG,
  USER_CODE,
} from "@/lib/forum/constants";
import type { ForumThread } from "@/lib/forum/types";

interface ThreadDetailProps {
  thread: ForumThread;
  onBack: () => void;
  onVote?: (threadId: string, vote: "agree" | "disagree" | "withdraw") => Promise<void>;
}

export function ThreadDetail({ thread, onBack, onVote }: ThreadDetailProps) {
  const [voting, setVoting] = useState(false);
  const [newestFirst, setNewestFirst] = useState(true);
  const statusConfig = THREAD_STATUS_CONFIG[thread.status];
  const priorityConfig = thread.priority
    ? PRIORITY_CONFIG[thread.priority]
    : null;

  const myVote = thread.agree.includes(USER_CODE)
    ? "agree"
    : thread.disagree.includes(USER_CODE)
      ? "disagree"
      : null;

  const handleVote = async (vote: "agree" | "disagree" | "withdraw") => {
    if (!onVote || voting) return;
    setVoting(true);
    try {
      await onVote(thread.id, vote);
    } finally {
      setVoting(false);
    }
  };

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

      {/* 投票區塊 */}
      {(thread.status === "進行中" || thread.status === "共識") && onVote && (
        <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
          {/* 投票狀態 */}
          <div className="flex items-center gap-4">
            {thread.agree.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-green-600 font-medium">同意</span>
                <div className="flex items-center gap-1">
                  {thread.agree.map((code) => (
                    <MachineAvatar key={code} code={code} />
                  ))}
                </div>
              </div>
            )}
            {thread.disagree.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-red-600 font-medium">反對</span>
                <div className="flex items-center gap-1">
                  {thread.disagree.map((code) => (
                    <MachineAvatar key={code} code={code} />
                  ))}
                </div>
              </div>
            )}
            {thread.agree.length === 0 && thread.disagree.length === 0 && (
              <span className="text-sm text-muted-foreground">尚無投票</span>
            )}
          </div>

          {/* 投票按鈕 */}
          <div className="flex items-center gap-2">
            {myVote === "agree" ? (
              <>
                <Badge className="bg-green-100 text-green-800">你已投同意</Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={voting}
                  onClick={() => handleVote("withdraw")}
                >
                  撤回
                </Button>
              </>
            ) : myVote === "disagree" ? (
              <>
                <Badge className="bg-red-100 text-red-800">你已投反對</Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={voting}
                  onClick={() => handleVote("withdraw")}
                >
                  撤回
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white"
                  disabled={voting}
                  onClick={() => handleVote("agree")}
                >
                  同意
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-50"
                  disabled={voting}
                  onClick={() => handleVote("disagree")}
                >
                  反對
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* 帖子流 */}
      {thread.posts.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">
          此討論串沒有關聯的帖子
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              共 {thread.posts.length} 則帖子
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={() => setNewestFirst(!newestFirst)}
            >
              {newestFirst ? "↑ 最新在前" : "↓ 最舊在前"}
            </Button>
          </div>
          {(() => {
            // discuss 帖子永遠在最前（提供上下文）
            const discussPosts = thread.posts.filter((p) => p.type === "discuss");
            const otherPosts = thread.posts.filter((p) => p.type !== "discuss");
            const sortedOthers = newestFirst ? [...otherPosts].reverse() : otherPosts;
            const displayPosts = [...discussPosts, ...sortedOthers];

            return displayPosts.map((post, i) => {
              const isDiscuss = post.type === "discuss";
              return (
                <div
                  key={`${post.timestamp}-${post.machineCode}-${i}`}
                  className={cn(
                    isDiscuss && "ring-2 ring-blue-200 dark:ring-blue-800 rounded-lg",
                    !isDiscuss && "ml-4",
                  )}
                >
                  <PostCard post={post} />
                </div>
              );
            });
          })()}
        </div>
      )}
    </div>
  );
}
