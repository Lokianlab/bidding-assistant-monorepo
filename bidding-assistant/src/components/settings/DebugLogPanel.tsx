"use client";

import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLogger } from "@/lib/logger/useLogger";
import type { LogLevel, LogCategory, DebugLogEntry } from "@/lib/logger/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LEVEL_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "debug", label: "debug" },
  { value: "info", label: "info" },
  { value: "warn", label: "warn" },
  { value: "error", label: "error" },
];

const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "api", label: "api" },
  { value: "settings", label: "settings" },
  { value: "navigation", label: "navigation" },
  { value: "cache", label: "cache" },
  { value: "render", label: "render" },
  { value: "system", label: "system" },
];

const LEVEL_BADGE_CLASS: Record<LogLevel, string> = {
  debug: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  info: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  warn: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  error: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  } catch {
    return iso;
  }
}

// ---------------------------------------------------------------------------
// Sub-component: single log entry row
// ---------------------------------------------------------------------------

function LogEntryRow({ entry }: { entry: DebugLogEntry }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="border-b py-2 px-1 cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => setExpanded((prev) => !prev)}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground font-mono shrink-0">
          {formatTimestamp(entry.timestamp)}
        </span>
        <Badge
          variant="secondary"
          className={`text-[11px] shrink-0 ${LEVEL_BADGE_CLASS[entry.level]}`}
        >
          {entry.level}
        </Badge>
        <Badge variant="outline" className="text-[11px] shrink-0">
          {entry.category}
        </Badge>
        <span className="text-sm truncate">{entry.message}</span>
      </div>

      {expanded && entry.details && (
        <pre className="mt-2 ml-1 p-2 text-xs bg-muted rounded-md overflow-auto max-h-40 whitespace-pre-wrap">
          {entry.details}
        </pre>
      )}

      {expanded && entry.source && (
        <p className="mt-1 ml-1 text-xs text-muted-foreground">
          來源：{entry.source}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function DebugLogPanel() {
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);

  const filters = useMemo(
    () => ({
      level: levelFilter === "all" ? undefined : (levelFilter as LogLevel),
      category:
        categoryFilter === "all" ? undefined : (categoryFilter as LogCategory),
      search: search.trim() || undefined,
    }),
    [levelFilter, categoryFilter, search]
  );

  const { entries, clear, exportJson } = useLogger(filters);

  // ---- Actions ----

  const handleClear = useCallback(() => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    clear();
    setConfirmClear(false);
  }, [confirmClear, clear]);

  const handleExport = useCallback(() => {
    const json = exportJson();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `debug-logs-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [exportJson]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>除錯日誌</span>
          <Badge variant="secondary" className="font-mono text-xs">
            {entries.length} 筆
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters row */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Level filter */}
          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="等級" />
            </SelectTrigger>
            <SelectContent>
              {LEVEL_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Category filter */}
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="分類" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Search input */}
          <Input
            placeholder="搜尋關鍵字..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-[200px]"
          />

          {/* Spacer */}
          <div className="flex-1" />

          {/* Actions */}
          <Button variant="outline" size="sm" onClick={handleExport}>
            匯出 JSON
          </Button>
          <Button
            variant={confirmClear ? "destructive" : "outline"}
            size="sm"
            onClick={handleClear}
            onBlur={() => setConfirmClear(false)}
          >
            {confirmClear ? "確認清除？" : "清除日誌"}
          </Button>
        </div>

        {/* Log entries */}
        <ScrollArea className="h-[500px]">
          {entries.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
              目前沒有日誌紀錄
            </div>
          ) : (
            <div>
              {entries.map((entry) => (
                <LogEntryRow key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
