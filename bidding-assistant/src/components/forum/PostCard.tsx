"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { MachineAvatar } from "./MachineAvatar";
import {
  MACHINE_COLORS,
  DEFAULT_MACHINE_COLOR,
  POST_TYPE_CONFIG,
  PRIORITY_CONFIG,
  USER_CODE,
} from "@/lib/forum/constants";
import { formatTimestamp } from "@/lib/forum/helpers";
import type { ForumPost } from "@/lib/forum/types";

interface PostCardProps {
  post: ForumPost;
  onReply?: (post: ForumPost) => void;
}

// forum/page.tsx 已有 !mounted return null，PostCard 在 SSR 時不會渲染。
// 用 mounted guard 取代 next/dynamic ssr:false，避免後者在模組層級建立動態邊界
// 觸發 Next.js MetadataOutlet hydration mismatch。
function MarkdownContent({ children }: { children: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="animate-pulse h-4 bg-muted rounded" />;
  return <ReactMarkdown>{children}</ReactMarkdown>;
}

/** 把 ref 字串格式化成人類可讀：JDNE:20260223-0830 → "JDNE 在 02/23 08:30 的發言" */
function formatRef(ref: string): string {
  // 支援多引用，逗號分隔
  return ref.split(",").map((r) => {
    const trimmed = r.trim();
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) return trimmed;
    const code = trimmed.slice(0, colonIdx);
    const ts = trimmed.slice(colonIdx + 1);
    const formatted = formatTimestamp(ts);
    return formatted !== ts ? `${code} 在 ${formatted} 的發言` : `${code}:${ts}`;
  }).join("、");
}

export function PostCard({ post, onReply }: PostCardProps) {
  const isUser = post.machineCode === USER_CODE;
  const borderColor = MACHINE_COLORS[post.machineCode] || DEFAULT_MACHINE_COLOR;
  const typeConfig = POST_TYPE_CONFIG[post.type];
  const priorityConfig = post.priority ? PRIORITY_CONFIG[post.priority] : null;
  const isApprovalReport = post.content.includes("[申請審核]") || post.type === "approval";

  return (
    <div className={cn(
      "border-l-4 rounded-lg p-4 shadow-sm",
      isUser ? "bg-yellow-50 dark:bg-yellow-950/30 ring-1 ring-yellow-300 dark:ring-yellow-700"
        : isApprovalReport ? "bg-amber-50 dark:bg-amber-950/30 ring-2 ring-amber-400 dark:ring-amber-600"
        : "bg-card",
      borderColor,
    )}>
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <MachineAvatar code={post.machineCode} />
        <Badge variant="outline" className={cn("text-xs", typeConfig.className)}>
          {typeConfig.label}
        </Badge>
        {priorityConfig && (
          <Badge variant="outline" className={cn("text-xs", priorityConfig.className)}>
            {priorityConfig.label}
          </Badge>
        )}
        {isApprovalReport && (
          <Badge className="bg-amber-400 text-amber-900 text-xs font-bold">
            申請審核
          </Badge>
        )}
        <span className="text-xs text-muted-foreground ml-auto">
          {formatTimestamp(post.timestamp)}
        </span>
        {onReply && (
          <button
            onClick={() => onReply(post)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded hover:bg-muted"
          >
            回覆
          </button>
        )}
      </div>

      {/* Ref 引用 */}
      {post.ref && post.ref !== "none" && (
        <div className="text-xs text-muted-foreground mb-2">
          ↩ 回覆 {formatRef(post.ref)}
        </div>
      )}

      {/* 內容 */}
      <div className="prose prose-sm max-w-none dark:prose-invert">
        <MarkdownContent>{post.content}</MarkdownContent>
      </div>
    </div>
  );
}
