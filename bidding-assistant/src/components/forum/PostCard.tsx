"use client";

import dynamic from "next/dynamic";
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
}

// react-markdown 在 Turbopack SSR 下有 useRef hooks 相容問題，用 next/dynamic ssr:false 避開
const ReactMarkdown = dynamic(
  () => import("react-markdown").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => <div className="animate-pulse h-4 bg-muted rounded" />,
  },
);

function MarkdownContent({ children }: { children: string }) {
  return <ReactMarkdown>{children}</ReactMarkdown>;
}

export function PostCard({ post }: PostCardProps) {
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
      </div>

      {/* Ref 引用 */}
      {post.ref && post.ref !== "none" && (
        <div className="text-xs text-muted-foreground mb-2">
          引用：{post.ref}
        </div>
      )}

      {/* 內容 */}
      <div className="prose prose-sm max-w-none dark:prose-invert">
        <MarkdownContent>{post.content}</MarkdownContent>
      </div>
    </div>
  );
}
