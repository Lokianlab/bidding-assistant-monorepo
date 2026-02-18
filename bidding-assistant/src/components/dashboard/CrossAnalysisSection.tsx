"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer,
} from "recharts";
import type { ResultBreakdown, CrossAnalysisResult, Insight, CostAnalysisResult } from "@/lib/dashboard/useCrossAnalysis";
import {
  computeCrossMatrix, buildPersonReport,
  DIMENSION_OPTIONS,
} from "@/lib/dashboard/useCrossAnalysis";
import type { DimensionKey } from "@/lib/dashboard/useCrossAnalysis";
import type { NotionPage } from "@/lib/dashboard/types";
import { formatCurrency } from "@/lib/chart-config";
import { STACK_COLORS_HEX } from "@/lib/constants/bid-status";

// ====== 共用：勝率色塊 ======
function WinRateBar({ rate, total }: { rate: number; total: number }) {
  if (total === 0) return <span className="text-xs text-muted-foreground">—</span>;
  const bg = rate >= 50 ? "bg-emerald-500" : rate >= 30 ? "bg-amber-500" : rate > 0 ? "bg-rose-400" : "bg-gray-300";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden max-w-[80px]">
        <div className={`h-full rounded-full ${bg}`} style={{ width: `${Math.max(rate, 3)}%` }} />
      </div>
      <span className="text-xs font-mono w-10 text-right">{rate}%</span>
    </div>
  );
}

// ====== 共用：洞見卡片 ======
function InsightCard({ insight }: { insight: Insight }) {
  const colors: Record<string, string> = {
    good: "bg-emerald-50 border-emerald-200 text-emerald-800",
    warn: "bg-amber-50 border-amber-200 text-amber-800",
    bad: "bg-rose-50 border-rose-200 text-rose-800",
    info: "bg-blue-50 border-blue-200 text-blue-800",
    discovery: "bg-purple-50 border-purple-200 text-purple-800",
  };
  return (
    <div className={`flex items-start gap-2 p-2.5 rounded-md border text-xs leading-relaxed ${colors[insight.type]}`}>
      <span className="shrink-0 mt-0.5">{insight.icon}</span>
      <span>{insight.text}</span>
    </div>
  );
}

// ====== 結果分布堆疊長條圖 ======

function BreakdownChart({ data }: { data: ResultBreakdown[]; title: string }) {
  const chartData = data.slice(0, 15).map((d) => ({
    name: d.key.length > 8 ? d.key.slice(0, 8) + "…" : d.key,
    fullName: d.key,
    "得標": d.won,
    "未獲青睞": d.lost,
    "流標/廢標": d.cancelled,
    "資格不符": d.disqualified,
    "領標後未參與": d.withdrawn,
    "進行中": d.active,
    winRate: d.winRate,
  }));

  if (chartData.length === 0) return (
    <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
      尚無資料
    </div>
  );

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 10 }} />
          <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 10 }} />
          <RTooltip
            content={({ active, payload, label }: {
              active?: boolean;
              payload?: ReadonlyArray<{ color?: string; name?: string; value?: string | number; payload?: Record<string, unknown> }>;
              label?: string | number;
            }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0]?.payload as Record<string, unknown> | undefined;
              return (
                <div className="bg-background border rounded-lg shadow-lg p-2.5 text-sm">
                  <p className="font-medium mb-1 text-xs">{(row?.fullName as string) ?? label}</p>
                  {payload.filter((e) => (Number(e.value) ?? 0) > 0).map((entry, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                      <span className="text-muted-foreground">{entry.name}:</span>
                      <span className="font-mono">{entry.value} 件</span>
                    </div>
                  ))}
                  {row?.winRate !== undefined && (
                    <div className="mt-1 pt-1 border-t text-xs font-medium">
                      得標率：{row.winRate as number}%
                    </div>
                  )}
                </div>
              );
            }}
          />
          {Object.entries(STACK_COLORS_HEX).map(([status, color]) => (
            <Bar key={status} dataKey={status} stackId="a" fill={color} name={status} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ====== 結果分布排行表 ======
function BreakdownTable({ data, label }: { data: ResultBreakdown[]; label: string }) {
  if (data.length === 0) return (
    <div className="py-8 text-center text-sm text-muted-foreground">尚無資料</div>
  );

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{label}</TableHead>
            <TableHead className="text-right w-16">投標</TableHead>
            <TableHead className="text-right w-16">得標</TableHead>
            <TableHead className="w-32">勝率</TableHead>
            <TableHead className="text-right w-16 hidden sm:table-cell">未獲</TableHead>
            <TableHead className="text-right w-16 hidden sm:table-cell">不符</TableHead>
            <TableHead className="text-right w-16 hidden md:table-cell">棄標</TableHead>
            <TableHead className="text-right w-28 hidden lg:table-cell">得標金額</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((d) => (
            <TableRow key={d.key}>
              <TableCell className="font-medium text-xs max-w-[120px] truncate" title={d.key}>{d.key}</TableCell>
              <TableCell className="text-right font-mono text-xs">{d.total}</TableCell>
              <TableCell className="text-right font-mono text-xs">{d.won}</TableCell>
              <TableCell><WinRateBar rate={d.winRate} total={d.total} /></TableCell>
              <TableCell className="text-right font-mono text-xs hidden sm:table-cell">{d.lost || "-"}</TableCell>
              <TableCell className="text-right font-mono text-xs hidden sm:table-cell">
                {d.disqualified > 0 ? (
                  <span className="text-rose-600 font-semibold">{d.disqualified}</span>
                ) : "-"}
              </TableCell>
              <TableCell className="text-right font-mono text-xs hidden md:table-cell">{d.withdrawn || "-"}</TableCell>
              <TableCell className="text-right font-mono text-xs hidden lg:table-cell">
                {d.wonBudget > 0 ? formatCurrency(d.wonBudget) : "-"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ====== 區塊一：多維交叉分析 ======
export function CrossAnalysisPanel({
  analysis,
  pages,
}: {
  analysis: CrossAnalysisResult;
  pages: NotionPage[];
}) {
  const [dimA, setDimA] = useState<DimensionKey>("writer");
  const [dimB, setDimB] = useState<DimensionKey>("agency");

  // 一維分析：根據 dimA 選擇對應數據
  const primaryData = useMemo(() => {
    switch (dimA) {
      case "writer": return analysis.byWriter;
      case "agency": return analysis.byAgency;
      case "type": return analysis.byType;
      case "method": return analysis.byMethod;
      case "budgetRange": return analysis.byBudgetRange;
      case "decision": return analysis.byDecision;
      case "priority": return analysis.byPriority;
      default: return [];
    }
  }, [dimA, analysis]);

  const primaryLabel = DIMENSION_OPTIONS.find((o) => o.key === dimA)?.label ?? "";

  // 交叉矩陣
  const matrix = useMemo(() => {
    if (dimA === dimB) return null;
    return computeCrossMatrix(pages, dimA, dimB);
  }, [pages, dimA, dimB]);

  return (
    <Card>
      <CardHeader className="pb-2 px-3 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <CardTitle className="text-sm">多維交叉分析</CardTitle>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">維度 A：</span>
            <Select value={dimA} onValueChange={(v) => setDimA(v as DimensionKey)}>
              <SelectTrigger className="w-[100px] h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DIMENSION_OPTIONS.map((o) => (
                  <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-muted-foreground">×</span>
            <span className="text-muted-foreground">維度 B：</span>
            <Select value={dimB} onValueChange={(v) => setDimB(v as DimensionKey)}>
              <SelectTrigger className="w-[100px] h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DIMENSION_OPTIONS.map((o) => (
                  <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-3 sm:px-6 space-y-4">
        {/* 一維：主維度結果分布 */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">
            📊 {primaryLabel}結果分布
          </p>
          <BreakdownChart data={primaryData} title={primaryLabel} />
          <BreakdownTable data={primaryData} label={primaryLabel} />
        </div>

        {/* 二維：交叉熱力表 */}
        {matrix && dimA !== dimB && matrix.rows.length > 0 && matrix.cols.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">
              🔥 {matrix.rowLabel} × {matrix.colLabel} 交叉勝率
            </p>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">{matrix.rowLabel} ＼ {matrix.colLabel}</TableHead>
                    {matrix.cols.slice(0, 10).map((c) => (
                      <TableHead key={c} className="text-xs text-center max-w-[60px] truncate" title={c}>
                        {c.length > 4 ? c.slice(0, 4) + "…" : c}
                      </TableHead>
                    ))}
                    <TableHead className="text-xs text-center font-semibold">合計</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matrix.rows.slice(0, 15).map((rk) => {
                    const rowTotal = matrix.rowTotals[rk];
                    return (
                      <TableRow key={rk}>
                        <TableCell className="text-xs font-medium max-w-[80px] truncate" title={rk}>
                          {rk.length > 6 ? rk.slice(0, 6) + "…" : rk}
                        </TableCell>
                        {matrix.cols.slice(0, 10).map((ck) => {
                          const cell = matrix.cells.find(
                            (c) => c.rowKey === rk && c.colKey === ck
                          );
                          if (!cell || cell.total === 0) {
                            return <TableCell key={ck} className="text-center text-xs text-muted-foreground">—</TableCell>;
                          }
                          const bg = cell.winRate >= 50
                            ? "bg-emerald-100 text-emerald-800"
                            : cell.winRate > 0
                              ? "bg-amber-100 text-amber-800"
                              : cell.won === 0 && cell.total >= 2
                                ? "bg-rose-100 text-rose-700"
                                : "";
                          return (
                            <TableCell key={ck} className={`text-center text-xs font-mono ${bg}`}
                              title={`${rk} × ${ck}：${cell.won}/${cell.total} 件，勝率 ${cell.winRate}%`}>
                              {cell.winRate > 0 ? `${cell.winRate}%` : `0/${cell.total}`}
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-center text-xs font-mono font-semibold">
                          {rowTotal ? `${rowTotal.winRate}%` : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              綠底 = 勝率 ≥ 50%　黃底 = 有贏過　紅底 = 投 2+ 件全敗　點擊格子可看詳情
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ====== 區塊二：個人績效報告卡 ======
export function PersonReportPanel({
  pages,
  writerNames,
}: {
  pages: NotionPage[];
  writerNames: string[];
}) {
  const [selectedPerson, setSelectedPerson] = useState("");

  const report = useMemo(() => {
    if (!selectedPerson) return null;
    return buildPersonReport(selectedPerson, pages, pages);
  }, [selectedPerson, pages]);

  return (
    <Card>
      <CardHeader className="pb-2 px-3 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <CardTitle className="text-sm">個人績效報告卡</CardTitle>
          <Select value={selectedPerson} onValueChange={setSelectedPerson}>
            <SelectTrigger className="w-[140px] h-7 text-xs">
              <SelectValue placeholder="選擇人員" />
            </SelectTrigger>
            <SelectContent>
              {writerNames.map((w) => (
                <SelectItem key={w} value={w}>{w}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        {!report ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            請從上方選擇企劃人員查看個人報告
          </div>
        ) : (
          <div className="space-y-4">
            {/* 總覽 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold">{report.total}</p>
                <p className="text-[10px] text-muted-foreground">投標件數</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-emerald-600">{report.won}</p>
                <p className="text-[10px] text-muted-foreground">得標件數</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className={`text-2xl font-bold ${report.winRate >= 40 ? "text-emerald-600" : report.winRate >= 25 ? "text-amber-600" : "text-rose-600"}`}>
                  {report.winRate}%
                </p>
                <p className="text-[10px] text-muted-foreground">得標率</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-lg font-bold font-mono">{formatCurrency(report.wonBudget)}</p>
                <p className="text-[10px] text-muted-foreground">得標金額合計</p>
              </div>
            </div>

            {/* 結果分布 */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
              {[
                { label: "得標", value: report.breakdown.won, color: "text-emerald-600" },
                { label: "未獲青睞", value: report.breakdown.lost, color: "text-rose-600" },
                { label: "資格不符", value: report.breakdown.disqualified, color: "text-red-600" },
                { label: "流標/廢標", value: report.breakdown.cancelled, color: "text-pink-600" },
                { label: "領標後棄標", value: report.breakdown.withdrawn, color: "text-gray-500" },
                { label: "進行中", value: report.breakdown.active, color: "text-indigo-600" },
              ].map((item) => (
                <div key={item.label} className="bg-muted/30 rounded p-2">
                  <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
                  <p className="text-[10px] text-muted-foreground">{item.label}</p>
                </div>
              ))}
            </div>

            {/* 需改善 */}
            {report.warnings.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-rose-600 mb-2">⚠️ 需要改善</p>
                <div className="space-y-1.5">
                  {report.warnings.map((w, i) => (
                    <InsightCard key={i} insight={w} />
                  ))}
                </div>
              </div>
            )}

            {/* 做得好 */}
            {report.strengths.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-emerald-600 mb-2">✅ 做得好的</p>
                <div className="space-y-1.5">
                  {report.strengths.map((s, i) => (
                    <InsightCard key={i} insight={s} />
                  ))}
                </div>
              </div>
            )}

            {/* 季度趨勢 */}
            {report.quarterTrend.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">📈 季度趨勢</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {report.quarterTrend.slice(-8).map((q) => {
                    const color = q.winRate >= 40 ? "border-emerald-300 bg-emerald-50"
                      : q.winRate > 0 ? "border-amber-300 bg-amber-50"
                        : q.submitted > 0 ? "border-rose-300 bg-rose-50"
                          : "border-gray-200 bg-gray-50";
                    return (
                      <div key={q.quarter} className={`border rounded-md p-2 text-center ${color}`}>
                        <p className="text-[10px] font-medium text-muted-foreground">{q.quarter}</p>
                        <p className="text-xs">投 {q.submitted} / 贏 {q.won}</p>
                        <p className="text-sm font-bold">{q.winRate}%</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 機關戰績 */}
            {report.agencyStats.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">🏛 機關戰績</p>
                <BreakdownTable data={report.agencyStats} label="招標機關" />
              </div>
            )}

            {/* 類型戰績 */}
            {report.typeStats.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">📂 類型戰績</p>
                <BreakdownTable data={report.typeStats} label="標案類型" />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ====== 區塊三：全局檢討看板 ======
export function GlobalReviewPanel({
  insights,
}: {
  insights: Insight[];
}) {
  const [filterType, setFilterType] = useState<string>("all");

  const filteredInsights = useMemo(() => {
    if (filterType === "all") return insights;
    return insights.filter((ins) => ins.type === filterType);
  }, [insights, filterType]);

  const counts = useMemo(() => {
    const c = { bad: 0, warn: 0, discovery: 0, good: 0, info: 0 };
    for (const ins of insights) c[ins.type] = (c[ins.type] ?? 0) + 1;
    return c;
  }, [insights]);

  return (
    <Card>
      <CardHeader className="pb-2 px-3 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <CardTitle className="text-sm">全局檢討看板</CardTitle>
          <div className="flex flex-wrap gap-1.5">
            {[
              { key: "all", label: "全部", count: insights.length },
              { key: "bad", label: "🔴 嚴重", count: counts.bad },
              { key: "warn", label: "🟡 注意", count: counts.warn },
              { key: "discovery", label: "💡 發現", count: counts.discovery },
              { key: "good", label: "🟢 正向", count: counts.good },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setFilterType(item.key)}
                className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                  filterType === item.key
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/50 hover:bg-muted border-transparent"
                }`}
              >
                {item.label} ({item.count})
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        {filteredInsights.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            {insights.length === 0 ? "資料不足，暫無檢討項目" : "此類別暫無項目"}
          </div>
        ) : (
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {filteredInsights.map((ins, i) => (
              <InsightCard key={i} insight={ins} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ====== 區塊四：成本效益分析 ======
export function CostAnalysisPanel({
  costAnalysis,
}: {
  costAnalysis: CostAnalysisResult;
}) {
  return (
    <Card>
      <CardHeader className="pb-2 px-3 sm:px-6">
        <CardTitle className="text-sm">成本效益分析</CardTitle>
      </CardHeader>
      <CardContent className="px-3 sm:px-6 space-y-4">
        {/* 全局概覽 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-lg font-bold font-mono">{formatCurrency(costAnalysis.totalInvested)}</p>
            <p className="text-[10px] text-muted-foreground">總投入成本</p>
            <p className="text-[9px] text-muted-foreground">（押標金+領標費）</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-lg font-bold font-mono text-emerald-600">{formatCurrency(costAnalysis.totalWonBudget)}</p>
            <p className="text-[10px] text-muted-foreground">得標金額合計</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className={`text-2xl font-bold ${costAnalysis.overallROI >= 10 ? "text-emerald-600" : "text-amber-600"}`}>
              {costAnalysis.overallROI}x
            </p>
            <p className="text-[10px] text-muted-foreground">投資報酬率</p>
            <p className="text-[9px] text-muted-foreground">（得標金額÷投入成本）</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-lg font-bold font-mono text-rose-600">{formatCurrency(costAnalysis.sunkCostTotal)}</p>
            <p className="text-[10px] text-muted-foreground">沉沒成本</p>
            <p className="text-[9px] text-muted-foreground">（領標後未參與）</p>
          </div>
        </div>

        {/* 沉沒成本明細 */}
        {costAnalysis.sunkCostPages.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-rose-600 mb-2">
              💸 沉沒成本明細（領標後未參與：{costAnalysis.sunkCostPages.length} 件）
            </p>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">標案名稱</TableHead>
                    <TableHead className="text-xs hidden sm:table-cell">招標機關</TableHead>
                    <TableHead className="text-xs text-right">押標金</TableHead>
                    <TableHead className="text-xs text-right">領標費</TableHead>
                    <TableHead className="text-xs text-right hidden sm:table-cell">原預算</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {costAnalysis.sunkCostPages.map((p, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs max-w-[150px] truncate" title={p.name}>{p.name}</TableCell>
                      <TableCell className="text-xs hidden sm:table-cell">{p.agency || "-"}</TableCell>
                      <TableCell className="text-xs text-right font-mono">
                        {p.costBid > 0 ? formatCurrency(p.costBid) : "-"}
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono">
                        {p.costFee > 0 ? formatCurrency(p.costFee) : "-"}
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono hidden sm:table-cell">
                        {p.budget > 0 ? formatCurrency(p.budget) : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* 機關 ROI 排行 */}
        {costAnalysis.agencyROI.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">🏛 機關投資報酬率排行</p>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">招標機關</TableHead>
                    <TableHead className="text-xs text-right">投入成本</TableHead>
                    <TableHead className="text-xs text-right">得標金額</TableHead>
                    <TableHead className="text-xs text-right">ROI</TableHead>
                    <TableHead className="text-xs text-right hidden sm:table-cell">投/贏</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {costAnalysis.agencyROI.slice(0, 15).map((r) => (
                    <TableRow key={r.key}>
                      <TableCell className="text-xs max-w-[120px] truncate" title={r.key}>{r.key}</TableCell>
                      <TableCell className="text-xs text-right font-mono">{formatCurrency(r.costTotal)}</TableCell>
                      <TableCell className="text-xs text-right font-mono text-emerald-600">
                        {r.wonBudget > 0 ? formatCurrency(r.wonBudget) : "-"}
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono font-bold">
                        <span className={r.roi > 0 ? "text-emerald-600" : "text-rose-600"}>
                          {r.roi > 0 ? `${r.roi}x` : "0x"}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono hidden sm:table-cell">{r.total}/{r.won}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* 類型 ROI 排行 */}
        {costAnalysis.typeROI.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">📂 標案類型投資報酬率排行</p>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">標案類型</TableHead>
                    <TableHead className="text-xs text-right">投入成本</TableHead>
                    <TableHead className="text-xs text-right">得標金額</TableHead>
                    <TableHead className="text-xs text-right">ROI</TableHead>
                    <TableHead className="text-xs text-right hidden sm:table-cell">投/贏</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {costAnalysis.typeROI.slice(0, 15).map((r) => (
                    <TableRow key={r.key}>
                      <TableCell className="text-xs">{r.key}</TableCell>
                      <TableCell className="text-xs text-right font-mono">{formatCurrency(r.costTotal)}</TableCell>
                      <TableCell className="text-xs text-right font-mono text-emerald-600">
                        {r.wonBudget > 0 ? formatCurrency(r.wonBudget) : "-"}
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono font-bold">
                        <span className={r.roi > 0 ? "text-emerald-600" : "text-rose-600"}>
                          {r.roi > 0 ? `${r.roi}x` : "0x"}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono hidden sm:table-cell">{r.total}/{r.won}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
