"use client";

import { useEffect, useState, type ComponentType } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { MachineAvatar } from "./MachineAvatar";
import {
  MACHINE_COLORS,
  DEFAULT_MACHINE_COLOR,
  POST_TYPE_CONFIG,
  PRIORITY_CONFIG,
} from "@/lib/forum/constants";
import { formatTimestamp } from "@/lib/forum/helpers";
import type { ForumPost } from "@/lib/forum/types";

interface PostCardProps {
  post: ForumPost;
}

// react-markdown 在 Turbopack SSR 下有 hooks 相容問題，用 useEffect 延遲載入
function MarkdownContent({ children }: { children: string }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [Comp, setComp] = useState<ComponentType<any> | null>(null);
  const [plugins, setPlugins] = useState<unknown[]>([]);

  useEffect(() => {
    Promise.all([import("react-markdown"), import("remark-gfm")]).then(
      ([md, gfm]) => {
        setComp(() => md.default as ComponentType<any>);
        setPlugins([gfm.default]);
      },
    );
  }, []);

  if (!Comp) {
    return <div className="whitespace-pre-wrap">{children}</div>;
  }

  return <Comp remarkPlugins={plugins}>{children}</Comp>;
}

export function PostCard({ post }: PostCardProps) {
  const borderColor = MACHINE_COLORS[post.machineCode] || DEFAULT_MACHINE_COLOR;
  const typeConfig = POST_TYPE_CONFIG[post.type];
  const priorityConfig = post.priority ? PRIORITY_CONFIG[post.priority] : null;

  return (
    <div className={cn("border-l-4 rounded-lg bg-card p-4 shadow-sm", borderColor)}>
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
