"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { MobileMenuButton } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSettings } from "@/lib/context/settings-context";
import { FIELDS_DASHBOARD } from "@/lib/constants/notion-fields";
import type { NotionPage } from "@/lib/dashboard/types";
import { F, BOARD_COLUMNS_ORDER } from "@/lib/dashboard/types";
import { filterPages, loadCache, saveCache } from "@/lib/dashboard/helpers";
import { applyBoardFilters } from "@/lib/case-board/helpers";
import type { BoardViewMode, BoardFilters } from "@/lib/case-board/types";
import { ProjectDetailSheet } from "@/components/dashboard/ProjectDetailSheet";
import { CaseKanbanView } from "@/components/case-board/CaseKanbanView";
import { CaseListView } from "@/components/case-board/CaseListView";
import { CaseCalendarView } from "@/components/case-board/CaseCalendarView";
import { logger } from "@/lib/logger";

// 模擬資料（未連線時顯示）
const MOCK_PAGES: NotionPage[] = [
  {
    id: "mock-1", url: "#",
    properties: {
      [F.名稱]: "113年度台中市公園綠地景觀規劃設計委託技術服務案",
      [F.進程]: "備標中", [F.決策]: "參與投標",
      [F.截標]: "2025-08-15", [F.預算]: 3500000,
      [F.招標機關]: "台中市政府建設局", [F.投遞序位]: "第一順位",
      [F.確定協作]: true,
    },
  },
  {
    id: "mock-2", url: "#",
    properties: {
      [F.名稱]: "高雄市鳳山區自行車道系統整體規劃案",
      [F.進程]: "投標完成", [F.決策]: "參與投標",
      [F.截標]: "2025-07-22", [F.預算]: 2800000,
      [F.招標機關]: "高雄市政府工務局", [F.投遞序位]: "第一順位",
      [F.確定協作]: true,
    },
  },
  {
    id: "mock-3", url: "#",
    properties: {
      [F.名稱]: "台南市安南區社區營造輔導計畫",
      [F.進程]: "備標中", [F.決策]: "參與投標",
      [F.截標]: "2025-08-28", [F.預算]: 1500000,
      [F.招標機關]: "台南市政府", [F.投遞序位]: "第二順位",
      [F.確定協作]: true,
    },
  },
];

const VIEW_OPTIONS: { id: BoardViewMode; label: string }[] = [
  { id: "kanban", label: "看板" },
  { id: "list", label: "列表" },
  { id: "calendar", label: "行事曆" },
];

const DEADLINE_OPTIONS = [
  { value: "all", label: "全部期限" },
  { value: "week", label: "7 天內" },
  { value: "2weeks", label: "14 天內" },
  { value: "month", label: "30 天內" },
] as const;

export default function CaseBoardPage() {
  const { settings, hydrated } = useSettings();
  const [pages, setPages] = useState<NotionPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);

  // 視圖模式
  const [viewMode, setViewMode] = useState<BoardViewMode>("kanban");

  // 篩選
  const [search, setSearch] = useState("");
  const [deadline, setDeadline] = useState<BoardFilters["deadline"]>("all");

  // 詳細面板
  const [detailPage, setDetailPage] = useState<NotionPage | null>(null);

  // 進度更新 trigger（強制重渲染）
  const [progressTick, setProgressTick] = useState(0);

  // 看板欄位
  const [statusOptions, setStatusOptions] = useState<string[]>([]);
  const boardColumns = useMemo(
    () => (statusOptions.length > 0 ? statusOptions : BOARD_COLUMNS_ORDER),
    [statusOptions],
  );

  const { token, databaseId } = settings.connections.notion;

  // 資料載入
  const fetchData = useCallback(
    async (isRefresh = false) => {
      if (!token || !databaseId) {
        setPages(MOCK_PAGES);
        setConnected(false);
        setLoading(false);
        return;
      }

      let hasCached = false;
      if (!isRefresh) {
        const cached = loadCache();
        if (cached && cached.pages.length > 0) {
          setPages(filterPages(cached.pages));
          setConnected(true);
          setLoading(false);
          if (cached.schema?.[F.進程]?.options) {
            setStatusOptions(cached.schema[F.進程].options!);
          }
          hasCached = true;
        }
      }

      if (!hasCached) setLoading(true);

      try {
        const notionFilter = { property: F.確定協作, checkbox: { equals: true } };
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 120000);

        const res = await fetch("/api/notion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            token,
            databaseId,
            action: "schema_and_query",
            data: { filter: notionFilter, fields: FIELDS_DASHBOARD },
          }),
        });
        clearTimeout(timeout);
        const result = await res.json();

        if (result.schema?.[F.進程]?.options) {
          setStatusOptions(result.schema[F.進程].options);
        }

        if (result.pages?.length) {
          const filtered = filterPages(result.pages);
          setPages(filtered);
          setConnected(true);
          if (result.schema) saveCache(result.schema, result.pages);
          logger.info(
            "api",
            "案件看板 Notion 同步完成",
            `${result.pages.length} 筆`,
            "case-board/page.tsx",
          );
        } else if (result.pages) {
          setPages([]);
          setConnected(true);
        } else if (!hasCached) {
          setPages(MOCK_PAGES);
          setConnected(false);
        }
      } catch (err) {
        logger.error("api", "案件看板 Notion 同步失敗", String(err), "case-board/page.tsx");
        if (!hasCached) {
          const cached = loadCache();
          if (!cached || cached.pages.length === 0) {
            setPages(MOCK_PAGES);
            setConnected(false);
          }
        }
      }
      setLoading(false);
    },
    [token, databaseId],
  );

  useEffect(() => {
    if (hydrated) fetchData();
  }, [hydrated, fetchData]);

  // 篩選後的資料
  const filteredPages = useMemo(() => {
    const filters: BoardFilters = {
      search: search || undefined,
      deadline,
    };
    return applyBoardFilters(pages, filters);
  }, [pages, search, deadline]);

  return (
    <div className="p-3 sm:p-6">
      {/* Header */}
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MobileMenuButton />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">案件看板</h1>
            <p className="text-muted-foreground text-sm mt-0.5 hidden sm:block">
              AI 輔助備標進度追蹤
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {connected && (
            <Badge variant="outline" className="text-xs text-green-600 border-green-300">
              Notion 已連線
            </Badge>
          )}
          {!connected && !loading && (
            <Badge variant="secondary" className="text-xs">展示模式</Badge>
          )}
          {loading && (
            <span className="text-xs text-muted-foreground animate-pulse">同步中…</span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData(true)}
            disabled={loading}
          >
            {loading ? "同步中..." : "重新整理"}
          </Button>
        </div>
      </div>

      {/* 工具列 */}
      <div className="mb-4 flex flex-col sm:flex-row gap-2 sm:items-center">
        {/* 視圖切換 */}
        <div className="flex gap-1">
          {VIEW_OPTIONS.map((opt) => (
            <Button
              key={opt.id}
              variant={viewMode === opt.id ? "default" : "outline"}
              size="sm"
              className="text-xs"
              onClick={() => setViewMode(opt.id)}
            >
              {opt.label}
            </Button>
          ))}
        </div>

        {/* 搜尋 */}
        <Input
          placeholder="搜尋案名或機關..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs h-8 text-sm"
        />

        {/* 期限篩選 */}
        <Select
          value={deadline ?? "all"}
          onValueChange={(v) => setDeadline(v as BoardFilters["deadline"])}
        >
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DEADLINE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="text-xs text-muted-foreground ml-auto">
          {filteredPages.length} 件
        </span>
      </div>

      {/* 視圖區 */}
      {viewMode === "kanban" && (
        <CaseKanbanView
          pages={filteredPages}
          columns={boardColumns}
          onPageClick={setDetailPage}
          onProgressChange={() => setProgressTick((t) => t + 1)}
        />
      )}
      {viewMode === "list" && (
        <CaseListView
          key={progressTick}
          pages={filteredPages}
          onPageClick={setDetailPage}
          onProgressChange={() => setProgressTick((t) => t + 1)}
        />
      )}
      {viewMode === "calendar" && (
        <CaseCalendarView
          pages={filteredPages}
          onPageClick={setDetailPage}
        />
      )}

      {/* 詳細面板 */}
      <ProjectDetailSheet
        page={detailPage}
        open={!!detailPage}
        onClose={() => setDetailPage(null)}
      />

      {/* 未連線提示 */}
      {!connected && !loading && (
        <div className="mt-4 sm:mt-6 p-3 sm:p-4 border border-dashed rounded-lg text-center text-xs sm:text-sm text-muted-foreground">
          <p>目前顯示模擬資料。</p>
          <p className="mt-1">
            <Link href="/settings/connections" className="text-primary underline">
              前往設定 Notion 連線
            </Link>
            {" "}以顯示實際標案資料
          </p>
        </div>
      )}
    </div>
  );
}
