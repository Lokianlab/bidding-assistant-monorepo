"use client";

import { useSettings } from "@/lib/context/settings-context";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { MobileMenuButton } from "@/components/layout/Sidebar";
import { FIELDS_DASHBOARD, FIELDS_DASHBOARD_KPI } from "@/lib/constants/notion-fields";

// ====== 新元件 ======
import { StatsGrid } from "@/components/dashboard/StatsGrid";
import { ChartsSection } from "@/components/dashboard/ChartsSection";
import { DashboardGrid } from "@/components/dashboard/DashboardGrid";
import { SearchBar, useDebouncedValue } from "@/components/dashboard/SearchBar";
import { ProjectDetailSheet } from "@/components/dashboard/ProjectDetailSheet";
import { useDashboardMetrics } from "@/lib/dashboard/useDashboardMetrics";
import { isFeatureEnabled } from "@/lib/modules/feature-registry";
import { logger } from "@/lib/logger";

// ====== 共用類型 & 常數 ======
import type { NotionPage, SortKey, SortDir } from "@/lib/dashboard/types";
import { F, DEFAULT_STATUS_COLORS, DEFAULT_PRIORITY_COLORS, buildColorMap, BOARD_COLUMNS_ORDER, SUBMITTED_STATUSES, buildStatusFilter } from "@/lib/dashboard/types";
import {
  fmt, fmtDate, fmtDateTime, daysLeft,
  filterPages, sortPages,
  loadCache, saveCache,
} from "@/lib/dashboard/helpers";

// ====== 主要分頁 ======
const PRIORITY_TABS = [
  { id: "first",  label: "第一順位", icon: "🥇" },
  { id: "second", label: "第二順位", icon: "🥈" },
  { id: "third",  label: "第三順位", icon: "🥉" },
  { id: "other",  label: "其他", icon: "📂" },
  { id: "bidding", label: "競標階段", icon: "⚔️" },
  { id: "presented", label: "已出席簡報", icon: "🎤" },
  { id: "all",    label: "全部標案", icon: "📋" },
  { id: "board",  label: "看板",     icon: "📌" },
  { id: "deadline", label: "備標期限", icon: "📅" },
];

// ====== 模擬資料 ======
const MOCK_PROJECTS: NotionPage[] = [
  {
    id: "1", url: "#",
    properties: {
      [F.名稱]: "113年度台中市公園綠地景觀規劃設計委託技術服務案",
      [F.進程]: "備標中", [F.決策]: "參與投標",
      [F.截標]: "2025-08-15", [F.預算]: 3500000,
      [F.招標機關]: "台中市政府建設局", [F.投遞序位]: "第一順位",
      [F.評審方式]: "評分及格最低標", [F.案號]: "113-A-001",
    },
  },
  {
    id: "2", url: "#",
    properties: {
      [F.名稱]: "高雄市鳳山區自行車道系統整體規劃案",
      [F.進程]: "投標完成", [F.決策]: "參與投標",
      [F.截標]: "2025-07-22", [F.預算]: 2800000,
      [F.招標機關]: "高雄市政府工務局", [F.投遞序位]: "第一順位",
      [F.評審方式]: "最有利標", [F.案號]: "113-B-002",
    },
  },
  {
    id: "3", url: "#",
    properties: {
      [F.名稱]: "台南市安南區社區營造輔導計畫",
      [F.進程]: "備標中", [F.決策]: "參與投標",
      [F.截標]: "2025-08-28", [F.預算]: 1500000,
      [F.招標機關]: "台南市政府", [F.投遞序位]: "第二順位",
      [F.評審方式]: "評分及格最低標", [F.案號]: "113-C-003",
    },
  },
];

// ====== 排序箭頭按鈕 ======
function SortButton({
  label, sortKey, currentKey, currentDir, onSort,
}: {
  label: string; sortKey: SortKey;
  currentKey: SortKey | null; currentDir: SortDir;
  onSort: (key: SortKey) => void;
}) {
  const isActive = currentKey === sortKey;
  return (
    <button
      className="inline-flex items-center gap-0.5 hover:text-foreground transition-colors group"
      onClick={() => onSort(sortKey)}
    >
      {label}
      <span className={`inline-flex flex-col text-[8px] leading-none ${isActive ? "text-foreground" : "text-muted-foreground/40 group-hover:text-muted-foreground"}`}>
        <span className={isActive && currentDir === "asc" ? "text-primary" : ""}>▲</span>
        <span className={isActive && currentDir === "desc" ? "text-primary" : ""}>▼</span>
      </span>
    </button>
  );
}

// ====== 骨架載入 ======
function SkeletonRow() {
  return (
    <TableRow>
      {Array.from({ length: 8 }).map((_, i) => (
        <TableCell key={i}>
          <div className="h-4 bg-gray-200 rounded animate-pulse" style={{ width: i === 1 ? "80%" : "60%" }} />
        </TableCell>
      ))}
    </TableRow>
  );
}

// ====== 主元件 ======
export default function DashboardPage() {
  const { settings, hydrated, updateSettings } = useSettings();
  const [pages, setPages] = useState<NotionPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  // schema 動態偵測
  const [statusOptions, setStatusOptions] = useState<string[]>([]);
  const [decisionOptions, setDecisionOptions] = useState<string[]>([]);

  // 搜尋
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebouncedValue(searchTerm, 200);

  // 詳細面板
  const [detailPage, setDetailPage] = useState<NotionPage | null>(null);

  // 歷史已投標案件（用於 KPI 計算，不顯示在列表）
  const [historicalPages, setHistoricalPages] = useState<NotionPage[]>([]);

  // 圖表區收合
  const [chartsOpen, setChartsOpen] = useState(true);

  const { token, databaseId } = settings.connections.notion;

  // 動態顏色表
  const STATUS_COLORS = useMemo(
    () => buildColorMap(statusOptions, DEFAULT_STATUS_COLORS),
    [statusOptions]
  );
  const PRIORITY_COLORS = useMemo(
    () => buildColorMap(decisionOptions, DEFAULT_PRIORITY_COLORS),
    [decisionOptions]
  );

  // 備標決策 → 分頁 id 對照
  const PRIORITY_MAP = useMemo(() => {
    const map: Record<string, string> = {};
    for (const opt of decisionOptions) {
      if (opt.includes("第一") || opt.includes("一順位")) map[opt] = "first";
      else if (opt.includes("第二") || opt.includes("二順位")) map[opt] = "second";
      else if (opt.includes("第三") || opt.includes("三順位")) map[opt] = "third";
    }
    if (Object.keys(map).length === 0) {
      map["第一順位"] = "first";
      map["第二順位"] = "second";
      map["第三順位"] = "third";
    }
    return map;
  }, [decisionOptions]);

  // 不參與的備標決策值
  const INACTIVE_DECISIONS = useMemo(() => {
    const inactive = new Set<string>();
    for (const opt of decisionOptions) {
      if (opt.includes("不參與") || opt.includes("放棄") || opt.includes("取消") || opt.includes("未決定")) {
        inactive.add(opt);
      }
    }
    if (inactive.size === 0) inactive.add("不參與投標");
    return inactive;
  }, [decisionOptions]);

  // 套用 schema
  const applySchema = useCallback((schema: Record<string, { type: string; options?: string[]; id?: string }>) => {
    const sOpts = schema[F.進程]?.options ?? [];
    const dOpts = schema[F.決策]?.options ?? [];
    if (sOpts.length) setStatusOptions(sOpts);
    if (dOpts.length) setDecisionOptions(dOpts);
  }, []);

  // ====== 主要資料載入 ======
  const fetchData = useCallback(async (isRefresh = false) => {
    if (!token || !databaseId) {
      setPages(MOCK_PROJECTS);
      setConnected(false);
      setLoading(false);
      setInitialLoad(false);
      return;
    }

    let hasCached = false;
    if (!isRefresh) {
      const cached = loadCache();
      if (cached && cached.pages.length > 0) {
        setPages(filterPages(cached.pages));
        setConnected(true);
        setInitialLoad(false);
        setLoading(false);
        applySchema(cached.schema);
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
          token, databaseId,
          action: "schema_and_query",
          data: { filter: notionFilter, fields: FIELDS_DASHBOARD },
        }),
      });
      clearTimeout(timeout);
      const result = await res.json();

      if (result.schema) applySchema(result.schema);

      if (result.pages?.length) {
        const filtered = filterPages(result.pages);
        setPages(filtered);
        setConnected(true);
        if (result.schema) saveCache(result.schema, result.pages);
        logger.info("api", "Notion 同步完成", `${result.pages.length} 筆（過濾後 ${filtered.length} 筆）`, "page.tsx");
      } else if (result.pages) {
        setPages([]);
        setConnected(true);
        if (result.schema) saveCache(result.schema, []);
        logger.info("api", "Notion 同步完成", "0 筆", "page.tsx");
      } else if (!hasCached) {
        setPages(MOCK_PROJECTS);
        setConnected(false);
        logger.warn("api", "Notion 回傳無資料，使用模擬資料", undefined, "page.tsx");
      }
    } catch (err) {
      logger.error("api", "Notion 同步失敗", String(err), "page.tsx");
      if (!hasCached) {
        const cached = loadCache();
        if (!cached || cached.pages.length === 0) {
          setPages(MOCK_PROJECTS);
          setConnected(false);
        }
      }
    }
    setLoading(false);
    setInitialLoad(false);
  }, [token, databaseId, applySchema]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetchData is an async API call; setting state after await is the intended pattern
    if (hydrated) fetchData();
  }, [hydrated, fetchData]);

  // ====== 背景載入歷史已投標案件（用於 KPI 統計） ======
  useEffect(() => {
    if (!connected || !token || !databaseId) return;
    // 只需抓今年度的已投標案件即可
    const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0];
    const historicalFilter = {
      and: [
        buildStatusFilter(SUBMITTED_STATUSES, F.進程),
        { property: F.截標, date: { on_or_after: yearStart } },
      ],
    };
    const ctrl = new AbortController();
    fetch("/api/notion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: ctrl.signal,
      body: JSON.stringify({
        token, databaseId,
        action: "schema_and_query",
        data: { filter: historicalFilter, fields: FIELDS_DASHBOARD_KPI },
      }),
    })
      .then((res) => res.json())
      .then((result) => {
        if (result.pages?.length) setHistoricalPages(result.pages);
      })
      .catch((err) => {
        if (err?.name !== "AbortError") {
          logger.warn("api", "歷史已投標案件載入失敗（KPI 統計可能不完整）", String(err));
        }
      });
    return () => ctrl.abort();
  }, [connected, token, databaseId]);

  // ====== 搜尋過濾 ======
  const filteredPages = useMemo(() => {
    if (!debouncedSearch) return pages;
    const kw = debouncedSearch.toLowerCase();
    return pages.filter((p) => {
      const props = p.properties;
      return (
        (props[F.名稱] ?? "").toLowerCase().includes(kw) ||
        (props[F.招標機關] ?? "").toLowerCase().includes(kw) ||
        (props[F.案號] ?? "").toLowerCase().includes(kw) ||
        String(props[F.唯一碼] ?? "").toLowerCase().includes(kw)
      );
    });
  }, [pages, debouncedSearch]);

  // ====== useDashboardMetrics（用搜尋前的全部 pages 算 KPI，搜尋後的 filteredPages 用於表格） ======
  const metrics = useDashboardMetrics(pages, PRIORITY_MAP, historicalPages);

  // 年度目標
  const yearlyGoal = settings.yearlyGoal ?? 0;
  const goalRate = yearlyGoal > 0 ? Math.round((metrics.wonBudget / yearlyGoal) * 100) : 0;

  // 月度投標目標
  const monthlyBidTarget = settings.monthlyBidTarget ?? 0;

  // 週投標目標
  const weeklyBidTarget = settings.weeklyBidTarget ?? 0;

  // 自訂儀表板功能開關
  const customDashboardEnabled = isFeatureEnabled(
    "custom-dashboard",
    settings.featureToggles ?? {},
  );

  // 看板欄位
  const boardColumns = useMemo(() => {
    if (statusOptions.length > 0) return statusOptions;
    return BOARD_COLUMNS_ORDER;
  }, [statusOptions]);

  // ====== 排序 ======
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const handleSort = useCallback((key: SortKey) => {
    setSortKey((prev) => {
      if (prev === key) {
        if (sortDir === "asc") { setSortDir("desc"); return key; }
        setSortDir("asc");
        return null;
      }
      setSortDir("asc");
      return key;
    });
  }, [sortDir]);

  // ====== 搜尋後的分頁資料（表格用） ======
  const searchedByPriority = useMemo(() => {
    const result: Record<string, NotionPage[]> = { first: [], second: [], third: [], other: [] };
    const specialIds = new Set([
      ...filteredPages.filter((p) => p.properties[F.進程] === "競標階段").map((p) => p.id),
      ...filteredPages.filter((p) => p.properties[F.進程] === "已出席簡報").map((p) => p.id),
    ]);
    for (const p of filteredPages) {
      if (specialIds.has(p.id)) continue;
      const decision = p.properties[F.決策] ?? "";
      const tab = PRIORITY_MAP[decision];
      if (tab) result[tab].push(p);
      else result.other.push(p);
    }
    return result;
  }, [filteredPages, PRIORITY_MAP]);

  const searchedBidding = useMemo(() => filteredPages.filter((p) => p.properties[F.進程] === "競標階段"), [filteredPages]);
  const searchedPresented = useMemo(() => filteredPages.filter((p) => p.properties[F.進程] === "已出席簡報"), [filteredPages]);

  // ====== 表格渲染函式 ======
  const renderProjectTable = (items: NotionPage[], showSkeleton?: boolean) => {
    const sorted = sortPages(items, sortKey, sortDir);
    return (
      <div className="overflow-x-auto -mx-3 sm:mx-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="hidden sm:table-cell w-20">
                <SortButton label="唯一碼" sortKey="唯一碼" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
              </TableHead>
              <TableHead>
                <SortButton label="標案名稱" sortKey="名稱" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
              </TableHead>
              <TableHead className="w-28 sm:w-36">
                <SortButton label="截標時間" sortKey="截標" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
              </TableHead>
              <TableHead className="w-16 sm:w-20">
                <SortButton label="剩餘" sortKey="剩餘" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
              </TableHead>
              <TableHead className="hidden sm:table-cell w-28 text-right">
                <SortButton label="預算金額" sortKey="預算" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
              </TableHead>
              <TableHead className="hidden lg:table-cell w-28">
                <SortButton label="招標機關" sortKey="招標機關" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
              </TableHead>
              <TableHead className="hidden lg:table-cell w-24">
                <SortButton label="投遞序位" sortKey="投遞序位" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
              </TableHead>
              <TableHead className="hidden lg:table-cell w-24">
                <SortButton label="評審方式" sortKey="評審方式" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {showSkeleton ? (
              Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
            ) : sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  {debouncedSearch ? "沒有符合搜尋條件的標案" : "沒有標案資料"}
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((page) => {
                const p = page.properties;
                const prepDays = daysLeft(p[F.截標], p[F.電子投標]);
                return (
                  <TableRow
                    key={page.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setDetailPage(page)}
                  >
                    <TableCell className="hidden sm:table-cell text-xs font-mono text-muted-foreground whitespace-nowrap">
                      {p[F.唯一碼] ?? "-"}
                    </TableCell>
                    <TableCell className="font-medium max-w-[180px] sm:max-w-xs">
                      <span className="line-clamp-2 text-sm sm:text-base">{p[F.名稱] || "-"}</span>
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm whitespace-nowrap">{fmtDateTime(p[F.截標])}</TableCell>
                    <TableCell>
                      {prepDays === "應交寄" ? (
                        <Badge className="text-[10px] sm:text-xs bg-amber-100 text-amber-800 hover:bg-amber-200">
                          應交寄
                        </Badge>
                      ) : prepDays !== null ? (
                        <Badge
                          variant={prepDays <= 0 ? "destructive" : prepDays <= 7 ? "destructive" : prepDays <= 14 ? "secondary" : "outline"}
                          className="text-[10px] sm:text-xs"
                        >
                          {prepDays > 0 ? `${prepDays}天` : "已逾期"}
                        </Badge>
                      ) : "-"}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-right font-mono text-sm">
                      {p[F.預算] ? fmt(p[F.預算]) : "-"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm max-w-[140px] truncate">
                      {p[F.招標機關] || "-"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">{p[F.投遞序位] ?? "-"}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">{p[F.評審方式] ?? "-"}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    );
  };

  const showFullSkeleton = initialLoad && pages.length === 0;

  return (
    <div className="p-3 sm:p-6">
      {/* ====== 頁面標題 ====== */}
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MobileMenuButton />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">企劃備標指揮部</h1>
            <p className="text-muted-foreground text-sm mt-0.5 hidden sm:block">監控進行中案件即時動態</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {connected && (
            <Badge variant="outline" className="text-xs text-green-600 border-green-300">
              Notion 已連線
            </Badge>
          )}
          {!connected && !showFullSkeleton && (
            <Badge variant="secondary" className="text-xs">展示模式</Badge>
          )}
          {loading && (
            <span className="text-xs text-muted-foreground animate-pulse">同步中…</span>
          )}
          <Button variant="outline" size="sm" onClick={() => fetchData(true)} disabled={loading}>
            {loading ? "同步中..." : "重新整理"}
          </Button>
        </div>
      </div>

      {/* ====== 儀表板區域（自訂 or 固定佈局） ====== */}
      {customDashboardEnabled ? (
        <DashboardGrid
          metrics={metrics}
          yearlyGoal={yearlyGoal}
          onGoalEdit={(val) => updateSettings({ yearlyGoal: val })}
          monthlyTarget={monthlyBidTarget}
          onMonthlyTargetEdit={(val) => updateSettings({ monthlyBidTarget: val })}
          weeklyTarget={weeklyBidTarget}
          onWeeklyTargetEdit={(val) => updateSettings({ weeklyBidTarget: val })}
          showSkeleton={showFullSkeleton}
        />
      ) : (
        <>
          {/* ====== 統計卡片（8 張） ====== */}
          <StatsGrid
            projectCount={pages.length}
            totalBudget={metrics.totalBudget}
            biddingBudget={metrics.biddingBudget}
            biddingCount={metrics.biddingProjects.length + metrics.presentedProjects.length}
            wonBudget={metrics.wonBudget}
            wonCount={metrics.wonProjects.length}
            winRate={metrics.winRate}
            submittedCount={metrics.submittedProjects.length}
            totalCost={metrics.totalCost}
            totalCostByPeriod={metrics.totalCostByPeriod}
            yearlyGoal={yearlyGoal}
            goalRate={goalRate}
            onGoalEdit={(val) => updateSettings({ yearlyGoal: val })}
            monthSubmitted={metrics.monthSubmittedCount}
            weekSubmitted={metrics.weekSubmittedCount}
            monthlyTarget={monthlyBidTarget}
            onMonthlyTargetEdit={(val) => updateSettings({ monthlyBidTarget: val })}
            weeklyTarget={weeklyBidTarget}
            onWeeklyTargetEdit={(val) => updateSettings({ weeklyBidTarget: val })}
            yearSubmitted={metrics.yearSubmittedCount}
            yearWon={metrics.yearWonCount}
            showSkeleton={showFullSkeleton}
          />

          {/* ====== 圖表區（可收合） ====== */}
          {!showFullSkeleton && pages.length > 0 && (
            <div className="mb-4 sm:mb-6">
              <button
                className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground mb-3 transition-colors"
                onClick={() => setChartsOpen((v) => !v)}
              >
                <span className={`transition-transform ${chartsOpen ? "rotate-90" : ""}`}>▶</span>
                績效圖表
              </button>
              {chartsOpen && (
                <ChartsSection
                  monthlyTrend={metrics.monthlyTrend}
                  typeAnalysis={metrics.typeAnalysis}
                  teamWorkload={metrics.teamWorkload}
                />
              )}
            </div>
          )}
        </>
      )}

      {/* ====== 搜尋列 ====== */}
      {!showFullSkeleton && pages.length > 0 && (
        <div className="mb-3 sm:mb-4 max-w-sm">
          <SearchBar value={searchTerm} onChange={setSearchTerm} />
        </div>
      )}

      {/* ====== 分頁表格 ====== */}
      <Tabs defaultValue="first">
        <TabsList className="flex overflow-x-auto gap-0.5 sm:gap-1 sm:flex-wrap h-auto p-1 w-full">
          {PRIORITY_TABS.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="text-[10px] sm:text-xs px-2 sm:px-3 shrink-0">
              <span className="mr-0.5 sm:mr-1">{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.replace("順位", "").replace("標案", "")}</span>
              {tab.id === "first" && <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5">{searchedByPriority.first.length}</Badge>}
              {tab.id === "second" && <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5">{searchedByPriority.second.length}</Badge>}
              {tab.id === "third" && <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5">{searchedByPriority.third.length}</Badge>}
              {tab.id === "other" && <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5">{searchedByPriority.other.length}</Badge>}
              {tab.id === "bidding" && <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5">{searchedBidding.length}</Badge>}
              {tab.id === "presented" && <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5">{searchedPresented.length}</Badge>}
              {tab.id === "all" && <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5">{filteredPages.length}</Badge>}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* 第一順位 */}
        <TabsContent value="first" className="mt-3 sm:mt-4">
          <Card>
            <CardHeader className="pb-2 sm:pb-6 px-3 sm:px-6">
              <CardTitle className="text-base sm:text-lg">🥇 第一順位標案</CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              {renderProjectTable(searchedByPriority.first, showFullSkeleton)}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 第二順位 */}
        <TabsContent value="second" className="mt-3 sm:mt-4">
          <Card>
            <CardHeader className="pb-2 sm:pb-6 px-3 sm:px-6">
              <CardTitle className="text-base sm:text-lg">🥈 第二順位標案</CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              {renderProjectTable(searchedByPriority.second, showFullSkeleton)}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 第三順位 */}
        <TabsContent value="third" className="mt-3 sm:mt-4">
          <Card>
            <CardHeader className="pb-2 sm:pb-6 px-3 sm:px-6">
              <CardTitle className="text-base sm:text-lg">🥉 第三順位標案</CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              {renderProjectTable(searchedByPriority.third, showFullSkeleton)}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 其他 */}
        <TabsContent value="other" className="mt-3 sm:mt-4">
          <Card>
            <CardHeader className="pb-2 sm:pb-6 px-3 sm:px-6">
              <CardTitle className="text-base sm:text-lg">📂 其他標案</CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              {renderProjectTable(searchedByPriority.other, showFullSkeleton)}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 競標階段 */}
        <TabsContent value="bidding" className="mt-3 sm:mt-4">
          <Card>
            <CardHeader className="pb-2 sm:pb-6 px-3 sm:px-6">
              <CardTitle className="text-base sm:text-lg">⚔️ 競標階段</CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              {renderProjectTable(searchedBidding, showFullSkeleton)}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 已出席簡報 */}
        <TabsContent value="presented" className="mt-3 sm:mt-4">
          <Card>
            <CardHeader className="pb-2 sm:pb-6 px-3 sm:px-6">
              <CardTitle className="text-base sm:text-lg">🎤 已出席簡報</CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              {renderProjectTable(searchedPresented, showFullSkeleton)}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 全部標案 */}
        <TabsContent value="all" className="mt-3 sm:mt-4">
          <Card>
            <CardHeader className="pb-2 sm:pb-6 px-3 sm:px-6">
              <CardTitle className="text-base sm:text-lg">📋 全部標案</CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              {renderProjectTable(filteredPages, showFullSkeleton)}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 看板 */}
        <TabsContent value="board" className="mt-3 sm:mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {boardColumns.map((status) => {
              const colPages = filteredPages.filter((p) => p.properties[F.進程] === status);
              return (
                <div key={status} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm flex items-center gap-1.5">
                      <span
                        className={`inline-block w-2.5 h-2.5 rounded-full ${
                          (STATUS_COLORS[status] ?? "bg-gray-300").split(" ")[0]
                        }`}
                      />
                      {status}
                    </h3>
                    <Badge variant="secondary" className="text-xs">{colPages.length}</Badge>
                  </div>
                  <Separator />
                  <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                    {colPages.map((page) => (
                      <Card
                        key={page.id}
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => setDetailPage(page)}
                      >
                        <CardContent className="p-3">
                          {page.properties[F.唯一碼] && (
                            <p className="text-[10px] font-mono text-muted-foreground mb-1">{page.properties[F.唯一碼]}</p>
                          )}
                          <p className="text-sm font-medium line-clamp-2">{page.properties[F.名稱]}</p>
                          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                            {page.properties[F.投遞序位] && (
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${PRIORITY_COLORS[page.properties[F.投遞序位]] ?? "bg-gray-100 text-gray-600"}`}>
                                {page.properties[F.投遞序位]}
                              </span>
                            )}
                            <span>{fmtDate(page.properties[F.截標])}</span>
                          </div>
                          {page.properties[F.預算] && (
                            <p className="text-xs font-mono mt-1">${fmt(page.properties[F.預算])}</p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                    {colPages.length === 0 && (
                      <div className="text-center text-xs text-muted-foreground py-8 border border-dashed rounded-lg">
                        無標案
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* 備標期限 */}
        <TabsContent value="deadline" className="mt-3 sm:mt-4">
          <Card>
            <CardHeader className="pb-2 sm:pb-6 px-3 sm:px-6">
              <CardTitle className="text-base sm:text-lg">📅 備標期限</CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              {renderProjectTable(filteredPages.filter((p) => p.properties[F.截標]), showFullSkeleton)}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ====== 詳細資訊面板 ====== */}
      <ProjectDetailSheet
        page={detailPage}
        open={!!detailPage}
        onClose={() => setDetailPage(null)}
      />

      {/* ====== schema 偵測（Debug） ====== */}
      {connected && (statusOptions.length > 0 || decisionOptions.length > 0) && (
        <details className="mt-4 text-xs text-muted-foreground">
          <summary className="cursor-pointer hover:text-foreground">偵測到的欄位選項</summary>
          <div className="mt-2 p-3 bg-muted rounded-lg space-y-1">
            <p><strong>標案進程：</strong>{statusOptions.join("、") || "（未偵測到）"}</p>
            <p><strong>備標決策：</strong>{decisionOptions.join("、") || "（未偵測到）"}</p>
            <p><strong>不參與判定：</strong>[{[...INACTIVE_DECISIONS].join("、")}]</p>
            <p><strong>順位對照：</strong>{JSON.stringify(PRIORITY_MAP)}</p>
          </div>
        </details>
      )}

      {/* ====== 未連線提示 ====== */}
      {!connected && !showFullSkeleton && (
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
