"use client";

import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  THREAD_STATUS_CONFIG,
  MACHINE_BG_COLORS,
  POST_TYPE_CONFIG,
} from "@/lib/forum/constants";
import type { ThreadStatus, PostType } from "@/lib/forum/types";

export interface ForumFilterState {
  status: ThreadStatus | null;
  machine: string | null;
  type: PostType | null;
  search: string;
}

interface ForumFiltersProps {
  filters: ForumFilterState;
  onChange: (filters: ForumFilterState) => void;
  availableMachines: string[];
}

export function ForumFilters({
  filters,
  onChange,
  availableMachines,
}: ForumFiltersProps) {
  const statuses = Object.keys(THREAD_STATUS_CONFIG) as ThreadStatus[];
  const postTypes: PostType[] = ["discuss", "reply", "feedback", "score"];

  const toggle = <T extends string>(
    field: keyof ForumFilterState,
    value: T,
  ) => {
    onChange({
      ...filters,
      [field]: filters[field] === value ? null : value,
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {/* 搜尋 */}
      <Input
        placeholder="搜尋討論串..."
        value={filters.search}
        onChange={(e) => onChange({ ...filters, search: e.target.value })}
        className="max-w-sm"
      />

      <div className="flex flex-wrap gap-2">
        {/* 狀態篩選 */}
        {statuses.map((s) => {
          const config = THREAD_STATUS_CONFIG[s];
          const active = filters.status === s;
          return (
            <button
              key={s}
              onClick={() => toggle("status", s)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-colors",
                active
                  ? "bg-foreground text-background border-foreground"
                  : "bg-background text-foreground border-border hover:bg-accent",
              )}
            >
              <span
                className={cn("w-2 h-2 rounded-full", config.dotColor)}
              />
              {config.label}
            </button>
          );
        })}

        <span className="w-px bg-border mx-1" />

        {/* 機器篩選 */}
        {availableMachines.map((m) => {
          const active = filters.machine === m;
          const bg = MACHINE_BG_COLORS[m] || "bg-gray-100 text-gray-800";
          return (
            <button
              key={m}
              onClick={() => toggle("machine", m)}
              className={cn(
                "rounded-md px-2 py-1 text-xs font-mono font-semibold border transition-colors",
                active
                  ? "ring-2 ring-foreground"
                  : "hover:opacity-80",
                bg,
              )}
            >
              {m}
            </button>
          );
        })}

        <span className="w-px bg-border mx-1" />

        {/* 類型篩選 */}
        {postTypes.map((t) => {
          const config = POST_TYPE_CONFIG[t];
          const active = filters.type === t;
          return (
            <button
              key={t}
              onClick={() => toggle("type", t)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium border transition-colors",
                active
                  ? "ring-2 ring-foreground"
                  : "hover:opacity-80",
                config.className,
              )}
            >
              {config.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
