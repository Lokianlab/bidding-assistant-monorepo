"use client";

import { Button } from "@/components/ui/button";
import type { StackEntry } from "@/lib/explore/types";

interface BreadcrumbProps {
  stack: StackEntry[];
  onJump: (index: number) => void;
}

const TYPE_ICONS: Record<StackEntry["type"], string> = {
  search: "Q",
  tender: "T",
  company: "C",
  agency: "A",
};

export function ExplorerBreadcrumb({ stack, onJump }: BreadcrumbProps) {
  if (stack.length <= 1) return null;

  return (
    <nav className="flex items-center gap-1 text-sm overflow-x-auto pb-1" aria-label="導航路徑">
      {stack.map((entry, i) => {
        const isLast = i === stack.length - 1;
        return (
          <span key={`${entry.type}-${entry.id}-${i}`} className="flex items-center gap-1 shrink-0">
            {i > 0 && <span className="text-muted-foreground mx-0.5">/</span>}
            {isLast ? (
              <span className="font-medium text-foreground truncate max-w-[200px]" title={entry.label}>
                <span className="text-muted-foreground text-xs mr-1">{TYPE_ICONS[entry.type]}</span>
                {entry.label}
              </span>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-1.5 text-sm text-muted-foreground hover:text-foreground"
                onClick={() => onJump(i)}
              >
                <span className="text-xs mr-1">{TYPE_ICONS[entry.type]}</span>
                <span className="truncate max-w-[120px]">{entry.label}</span>
              </Button>
            )}
          </span>
        );
      })}
    </nav>
  );
}
