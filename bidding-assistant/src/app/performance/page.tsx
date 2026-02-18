"use client";

import { useSettings } from "@/lib/context/settings-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useEffect, useState, useMemo } from "react";
import { MobileMenuButton } from "@/components/layout/Sidebar";
import { YearSelector } from "@/components/dashboard/YearSelector";
import { useAnalyticsMetrics, computeYoY } from "@/lib/dashboard/useAnalyticsMetrics";
import type { YoYSummary } from "@/lib/dashboard/useAnalyticsMetrics";
import { useCrossAnalysis } from "@/lib/dashboard/useCrossAnalysis";
import {
  CrossAnalysisPanel, PersonReportPanel, GlobalReviewPanel, CostAnalysisPanel,
} from "@/components/dashboard/CrossAnalysisSection";
import { F, REVIEW_STATUSES } from "@/lib/dashboard/types";
import { BID_STATUS } from "@/lib/constants/bid-status";
import { filterReviewPages, extractAvailableYears, filterByYear } from "@/lib/dashboard/helpers";

// ====== 拆分後的元件 ======
import { usePerformanceData } from "@/lib/performance/usePerformanceData";
import { KpiSummary } from "@/components/performance/KpiSummary";
import {
  TrendLineChart, WriterBarChart, StatusPieWithInsights,
  WonBudgetBarChart, CumulativeChart,
} from "@/components/performance/PerformanceCharts";
import { YoYSection } from "@/components/performance/YoYSection";
import { PeriodStatusTable } from "@/components/performance/PeriodStatusTable";
import { WriterRankingTable } from "@/components/performance/WriterRankingTable";
import { CaseDetailTable } from "@/components/performance/CaseDetailTable";

// ====== 主元件 ======
export default function PerformancePage() {
  const { settings, hydrated } = useSettings();
  const { token, databaseId } = settings.connections.notion;

  // ====== 資料載入（由 hook 處理快取、背景續抓、斷點續傳） ======
  const { allPages, loading, connected, bgLoading, loadProgress, fetchData } =
    usePerformanceData(token, databaseId, hydrated);

  // ====== 篩選器狀態 ======
  const [selectedYear, setSelectedYear] = useState(0);
  const [timeGranularity, setTimeGranularity] = useState<"month" | "week">("month");
  const [selectedWriter, setSelectedWriter] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  // 同期比較狀態
  const [yoyBaseYear, setYoyBaseYear] = useState(0);
  const [yoyCompareYear, setYoyCompareYear] = useState(0);

  // ====== 資料處理管線 ======
  const reviewPages = useMemo(() => filterReviewPages(allPages), [allPages]);
  const availableYears = useMemo(() => extractAvailableYears(reviewPages), [reviewPages]);
  const yearFiltered = useMemo(() => filterByYear(reviewPages, selectedYear), [reviewPages, selectedYear]);

  // 按主筆過濾
  const writerFiltered = useMemo(() => {
    if (selectedWriter === "all") return yearFiltered;
    return yearFiltered.filter((p) => {
      const writers: string[] = p.properties[F.企劃主筆] ?? [];
      return Array.isArray(writers) && writers.includes(selectedWriter);
    });
  }, [yearFiltered, selectedWriter]);

  // 按狀態過濾
  const statusFiltered = useMemo(() => {
    if (selectedStatus === "all") return writerFiltered;
    const statusMap: Record<string, Set<string>> = {
      won: new Set([BID_STATUS.得標]),
      lost: new Set([BID_STATUS.未獲青睞, BID_STATUS.流標廢標, BID_STATUS.資格不符, BID_STATUS.領標後未參與]),
      active: new Set([BID_STATUS.已投標, BID_STATUS.競標階段, BID_STATUS.已出席簡報]),
    };
    const allowed = statusMap[selectedStatus];
    if (!allowed) return writerFiltered;
    return writerFiltered.filter((p) => allowed.has(p.properties[F.進程] ?? ""));
  }, [writerFiltered, selectedStatus]);

  // 主筆清單
  const writerList = useMemo(() => {
    const set = new Set<string>();
    for (const p of yearFiltered) {
      const writers: string[] = p.properties[F.企劃主筆] ?? [];
      if (Array.isArray(writers)) {
        for (const w of writers) { if (w) set.add(w); }
      }
    }
    return Array.from(set).sort();
  }, [yearFiltered]);

  // 計算指標 + 交叉分析
  const metrics = useAnalyticsMetrics(statusFiltered);
  const crossAnalysis = useCrossAnalysis(statusFiltered);

  // 趨勢資料 & 累加
  const trendData = timeGranularity === "month" ? metrics.monthlyStats : metrics.weeklyStats;
  const cumulativeData = timeGranularity === "month" ? metrics.monthlyCumulative : metrics.weeklyCumulative;
  const periodStatusData = timeGranularity === "month" ? metrics.monthlyStatusTable : metrics.weeklyStatusTable;

  // 同期比較：初始化年份
  useEffect(() => {
    if (availableYears.length >= 2 && yoyBaseYear === 0 && yoyCompareYear === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time initialization from async-derived availableYears
      setYoyBaseYear(availableYears[0]);
      setYoyCompareYear(availableYears[1]);
    } else if (availableYears.length === 1 && yoyBaseYear === 0) {
      setYoyBaseYear(availableYears[0]);
      setYoyCompareYear(availableYears[0]);
    }
  }, [availableYears, yoyBaseYear, yoyCompareYear]);

  // 同期比較資料
  const yoyData: YoYSummary | null = useMemo(() => {
    if (yoyBaseYear === 0 || yoyCompareYear === 0) return null;
    return computeYoY(reviewPages, yoyBaseYear, yoyCompareYear, timeGranularity);
  }, [reviewPages, yoyBaseYear, yoyCompareYear, timeGranularity]);

  // ====== 渲染 ======
  if (!hydrated) return null;

  return (
    <div className="p-3 sm:p-6">
      {/* 頁面標題 */}
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MobileMenuButton />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">標案績效檢視中心</h1>
            <p className="text-muted-foreground text-sm mt-0.5 hidden sm:block">
              統計已投出案件的績效與分析
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {connected && (
            <Badge variant="outline" className="text-xs text-green-600 border-green-300">
              Notion 已連線
            </Badge>
          )}
          {loading && (
            <span className="text-xs text-muted-foreground animate-pulse">同步中…</span>
          )}
          <Button variant="outline" size="sm" onClick={() => fetchData(true)} disabled={loading}>
            {loading ? "同步中..." : "重新整理"}
          </Button>
        </div>
      </div>

      {/* 篩選列 */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        <YearSelector years={availableYears} value={selectedYear} onChange={setSelectedYear} />
        <Select value={timeGranularity} onValueChange={(v) => setTimeGranularity(v as "month" | "week")}>
          <SelectTrigger className="w-[100px] h-8 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="month">月統計</SelectItem>
            <SelectItem value="week">週統計</SelectItem>
          </SelectContent>
        </Select>
        <Select value={selectedWriter} onValueChange={setSelectedWriter}>
          <SelectTrigger className="w-[120px] h-8 text-sm"><SelectValue placeholder="企劃人員" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部人員</SelectItem>
            {writerList.map((w) => <SelectItem key={w} value={w}>{w}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-[120px] h-8 text-sm"><SelectValue placeholder="案件狀態" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部狀態</SelectItem>
            <SelectItem value="won">得標</SelectItem>
            <SelectItem value="lost">未得標</SelectItem>
            <SelectItem value="active">進行中</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">
          共 {statusFiltered.length} 件
          {bgLoading && (
            <span className="ml-1 inline-flex items-center gap-1 text-amber-600">
              <span className="animate-pulse">●</span>
              {loadProgress || "背景載入中…"}
            </span>
          )}
          {!bgLoading && loadProgress && (
            <span className="ml-1 text-amber-600">{loadProgress}</span>
          )}
        </span>
      </div>

      {/* KPI 摘要 */}
      <KpiSummary totals={metrics.totals} />

      {/* 圖表區 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <TrendLineChart data={trendData} timeGranularity={timeGranularity} />
        <WriterBarChart data={metrics.writerStats} />
        <StatusPieWithInsights
          breakdown={metrics.statusBreakdown}
          totals={metrics.totals}
          monthCount={metrics.monthlyStats.length}
        />
        <WonBudgetBarChart data={trendData} timeGranularity={timeGranularity} />
        <CumulativeChart data={cumulativeData} timeGranularity={timeGranularity} />
      </div>

      {/* 同期比較 */}
      <YoYSection
        availableYears={availableYears}
        yoyBaseYear={yoyBaseYear}
        setYoyBaseYear={setYoyBaseYear}
        yoyCompareYear={yoyCompareYear}
        setYoyCompareYear={setYoyCompareYear}
        yoyData={yoyData}
      />

      {/* 期間×狀態統計表 */}
      <PeriodStatusTable data={periodStatusData} timeGranularity={timeGranularity} />

      {/* 企劃人員績效排行 */}
      <WriterRankingTable writerStats={metrics.writerStats} />

      {/* 多維交叉分析 */}
      <div className="mb-4 sm:mb-6">
        <CrossAnalysisPanel analysis={crossAnalysis} pages={statusFiltered} />
      </div>

      {/* 個人績效報告卡 */}
      <div className="mb-4 sm:mb-6">
        <PersonReportPanel pages={statusFiltered} writerNames={crossAnalysis.writerNames} />
      </div>

      {/* 全局檢討看板 */}
      <div className="mb-4 sm:mb-6">
        <GlobalReviewPanel insights={crossAnalysis.globalInsights} />
      </div>

      {/* 成本效益分析 */}
      <div className="mb-4 sm:mb-6">
        <CostAnalysisPanel costAnalysis={crossAnalysis.costAnalysis} />
      </div>

      {/* 案件明細表 */}
      <CaseDetailTable pages={statusFiltered} />

      {/* 未連線提示 */}
      {!connected && !loading && (
        <div className="mt-4 sm:mt-6 p-3 sm:p-4 border border-dashed rounded-lg text-center text-xs sm:text-sm text-muted-foreground">
          <p>尚未連線 Notion，無法顯示績效資料。</p>
          <p className="mt-1">
            請先到{" "}
            <a href="/settings/connections" className="text-primary underline">
              外部連線設定
            </a>
            {" "}完成 Notion 連線。
          </p>
        </div>
      )}

      {/* Debug：標案進程分布 */}
      {connected && allPages.length > 0 && (
        <details className="mt-4 text-xs text-muted-foreground">
          <summary className="cursor-pointer hover:text-foreground">🔍 Debug：標案進程分布（點擊展開）</summary>
          <div className="mt-2 p-3 bg-muted rounded-lg space-y-1">
            <p><strong>Notion 總案件數：</strong>{allPages.length}</p>
            <p><strong>符合績效統計：</strong>{reviewPages.length}</p>
            <p className="mt-2"><strong>各進程數量：</strong></p>
            {(() => {
              const counts: Record<string, number> = {};
              for (const p of allPages) {
                const s = p.properties[F.進程] ?? "(空)";
                counts[s] = (counts[s] ?? 0) + 1;
              }
              return Object.entries(counts)
                .sort(([, a], [, b]) => b - a)
                .map(([name, count]) => (
                  <p key={name} className="ml-4">
                    {name}: <strong>{count}</strong> 件
                    {REVIEW_STATUSES.has(name) ? " ✅ (計入績效)" : " ❌ (不計入績效)"}
                  </p>
                ));
            })()}
          </div>
        </details>
      )}
    </div>
  );
}
