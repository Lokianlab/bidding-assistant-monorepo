"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from "recharts";
import { useCompetitorAnalysis } from "@/lib/pcc/useCompetitorAnalysis";
import { useAgencyIntel } from "@/lib/pcc/useAgencyIntel";
import { formatPCCDate } from "@/lib/pcc/helpers";
import { useSettings } from "@/lib/context/settings-context";
import type { SelfAnalysis, CompetitorStats, AgencyStats } from "@/lib/pcc/types";
import { pccApiFetch } from "@/lib/pcc/api";
import type { PCCSearchResponse } from "@/lib/pcc/types";

const FALLBACK_COMPANY = "大員洛川";

interface CompetitorAnalysisProps {
  targetCompany?: string | null;
  onTargetConsumed?: () => void;
  onViewCommittee?: (unitId: string, unitName: string) => void;
}

export function CompetitorAnalysis({ targetCompany, onTargetConsumed, onViewCommittee }: CompetitorAnalysisProps = {}) {
  const { settings } = useSettings();
  const defaultCompany = settings.company?.brand || FALLBACK_COMPANY;
  const [companyName, setCompanyName] = useState<string>(defaultCompany);
  const { data, loading, progress, error, run } = useCompetitorAnalysis();
  const consumedRef = useRef<string | null>(null);
  const [disambigOptions, setDisambigOptions] = useState<{ name: string; id: string }[]>([]);
  const [disambigLoading, setDisambigLoading] = useState(false);

  // 外部跳轉：自動帶入公司名並觸發分析
  useEffect(() => {
    if (targetCompany && targetCompany !== consumedRef.current) {
      consumedRef.current = targetCompany;
      setCompanyName(targetCompany);
      run(targetCompany);
      onTargetConsumed?.();
    }
  }, [targetCompany, run, onTargetConsumed]);

  const handleRun = async () => {
    if (!companyName.trim()) return;
    setDisambigLoading(true);
    setDisambigOptions([]);
    try {
      const data = await pccApiFetch<PCCSearchResponse>("searchByCompany", {
        query: companyName.trim(),
        page: 1,
      });
      const seen = new Map<string, { name: string; id: string }>();
      for (const r of data.records ?? []) {
        const c = r.brief.companies;
        if (!c) continue;
        for (let i = 0; i < (c.names ?? []).length; i++) {
          const name = c.names[i];
          const id = c.ids?.[i] ?? "";
          if (name?.includes(companyName.trim()) && id && !seen.has(id)) {
            seen.set(id, { name, id });
          }
        }
      }
      const options = Array.from(seen.values());
      if (options.length > 1) {
        setDisambigOptions(options);
      } else if (options.length === 1) {
        run(options[0].name);
      } else {
        run(companyName.trim());
      }
    } catch {
      run(companyName.trim());
    } finally {
      setDisambigLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 輸入區 */}
      <div className="flex gap-2">
        <Input
          placeholder="輸入公司名稱..."
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleRun()}
          className="flex-1"
        />
        <Button onClick={handleRun} disabled={loading || disambigLoading || !companyName.trim()}>
          {loading
            ? progress
              ? `載入中 ${progress.loaded}/${progress.total}`
              : "分析中..."
            : disambigLoading
            ? "搜尋廠商..."
            : "開始分析"}
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
          {error}
        </div>
      )}

      {disambigOptions.length > 0 && (
        <div className="border rounded-lg divide-y">
          <div className="px-3 py-2 text-xs text-muted-foreground bg-muted">
            找到多家相符廠商，請選擇要分析的：
          </div>
          {disambigOptions.map((o) => (
            <button
              key={o.id}
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center justify-between gap-2"
              onClick={() => { setDisambigOptions([]); run(o.name); }}
            >
              <span className="truncate">{o.name}</span>
              <span className="text-xs text-muted-foreground shrink-0">{o.id}</span>
            </button>
          ))}
        </div>
      )}

      {data && <AnalysisResults data={data} myCompany={companyName} onViewCommittee={onViewCommittee} />}
    </div>
  );
}

// ====== 分析結果 ======

function AnalysisResults({ data, myCompany, onViewCommittee }: { data: SelfAnalysis; myCompany: string; onViewCommittee?: (unitId: string, unitName: string) => void }) {
  return (
    <div className="space-y-6">
      {/* 總覽 */}
      <OverviewCards data={data} />

      {/* 年度趨勢 */}
      {data.yearlyStats.length > 0 && <YearlyTrendChart stats={data.yearlyStats} />}
      {data.yearlyStats.length > 0 && <YearlyTable stats={data.yearlyStats} />}

      {/* 競爭對手排行 */}
      {data.competitors.length > 0 && <CompetitorTable competitors={data.competitors} />}

      {/* 機關分析 */}
      {data.agencies.length > 0 && <AgencyTable agencies={data.agencies} myCompany={myCompany} onViewCommittee={onViewCommittee} />}
    </div>
  );
}

// ====== 總覽卡片 ======

function OverviewCards({ data }: { data: SelfAnalysis }) {
  return (
    <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
      <StatCard label="投標紀錄" value={`${data.totalRecords} 筆`} />
      <StatCard label="決標案件" value={`${data.awardRecords} 件`} />
      <StatCard
        label="得標率"
        value={`${(data.winRate * 100).toFixed(0)}%`}
        sub={`${data.wins} 勝 / ${data.losses} 敗`}
      />
      <StatCard
        label="常遇對手"
        value={`${data.competitors.length} 家`}
        sub="撞案 ≥ 2 次"
      />
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="py-3">
      <CardContent className="text-center">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ====== 年度趨勢 ======

function YearlyTrendChart({ stats }: { stats: SelfAnalysis["yearlyStats"] }) {
  // 按年份正序排列（圖表左到右）
  const chartData = [...stats]
    .sort((a, b) => a.year - b.year)
    .map((s) => ({
      year: String(s.year),
      得標: s.wins,
      未得標: s.total - s.wins,
      得標率: s.total > 0 ? Math.round((s.wins / s.total) * 100) : 0,
    }));

  if (chartData.length < 2) return null;

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-base">年度趨勢</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="year" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis yAxisId="left" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
                tickFormatter={(v: number) => `${v}%`}
              />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="得標" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
              <Bar yAxisId="left" dataKey="未得標" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="得標率"
                stroke="#6366f1"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function YearlyTable({ stats }: { stats: SelfAnalysis["yearlyStats"] }) {
  const [expandedYear, setExpandedYear] = useState<number | null>(null);

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-base">年度明細</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4">年度</th>
                <th className="pb-2 pr-4">決標</th>
                <th className="pb-2 pr-4">得標</th>
                <th className="pb-2">得標率</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => (
                <>
                  <tr
                    key={s.year}
                    className="border-b cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => setExpandedYear(expandedYear === s.year ? null : s.year)}
                  >
                    <td className="py-2 pr-4 font-medium">
                      <span className="text-xs text-muted-foreground mr-1">{expandedYear === s.year ? "▼" : "▶"}</span>
                      {s.year}
                    </td>
                    <td className="py-2 pr-4">{s.total}</td>
                    <td className="py-2 pr-4">{s.wins}</td>
                    <td className="py-2">
                      <Badge variant={s.total > 0 && s.wins / s.total >= 0.5 ? "default" : "secondary"}>
                        {s.total > 0 ? `${((s.wins / s.total) * 100).toFixed(0)}%` : "—"}
                      </Badge>
                    </td>
                  </tr>
                  {expandedYear === s.year && (
                    <tr key={`${s.year}-cases`}>
                      <td colSpan={4} className="bg-muted/30 px-4 py-3">
                        <div className="space-y-1 text-xs">
                          {s.cases.map((c, i) => (
                            <div key={`${c.date}-${c.jobNumber}-${i}`} className="flex items-center gap-2">
                              <Badge variant={c.won ? "default" : "destructive"} className="text-xs shrink-0">
                                {c.won ? "得標" : "未得標"}
                              </Badge>
                              <span className="truncate flex-1" title={c.title}>{c.title}</span>
                              <span className="text-muted-foreground shrink-0">{c.unitName.length > 8 ? c.unitName.slice(0, 8) + "…" : c.unitName}</span>
                              <span className="text-muted-foreground shrink-0">{formatPCCDate(c.date)}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ====== 競爭對手排行 ======

function CompetitorTable({ competitors }: { competitors: CompetitorStats[] }) {
  const [showAll, setShowAll] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const display = showAll ? competitors : competitors.slice(0, 10);

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-base">常遇對手排行</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4">對手</th>
                <th className="pb-2 pr-4">撞案</th>
                <th className="pb-2 pr-4">對手勝</th>
                <th className="pb-2 pr-4">我方勝</th>
                <th className="pb-2">常碰機關</th>
              </tr>
            </thead>
            <tbody>
              {display.map((c) => (
                <>
                  <tr
                    key={c.id}
                    className="border-b cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                  >
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">{expandedId === c.id ? "▼" : "▶"}</span>
                        <div>
                          <div className="max-w-[180px] truncate" title={c.name}>
                            {c.name.replace(/\s*\(.*\)\s*$/, "")}
                          </div>
                          <div className="text-xs text-muted-foreground">{c.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2 pr-4 font-medium">{c.encounters}</td>
                    <td className="py-2 pr-4">
                      <Badge variant="destructive" className="text-xs">{c.theirWins}</Badge>
                    </td>
                    <td className="py-2 pr-4">
                      <Badge variant="default" className="text-xs">{c.myWins}</Badge>
                    </td>
                    <td className="py-2">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {c.agencies.slice(0, 3).map((a) => (
                          <Badge key={a} variant="outline" className="text-xs">
                            {a.length > 8 ? a.slice(0, 8) + "…" : a}
                          </Badge>
                        ))}
                        {c.agencies.length > 3 && (
                          <Badge variant="outline" className="text-xs">+{c.agencies.length - 3}</Badge>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expandedId === c.id && (
                    <tr key={`${c.id}-cases`}>
                      <td colSpan={5} className="bg-muted/30 px-4 py-3">
                        <div className="space-y-1 text-xs">
                          {c.sharedCases.map((sc, i) => (
                            <div key={`${sc.date}-${sc.jobNumber}-${i}`} className="flex items-center gap-2">
                              <Badge variant={sc.won ? "default" : "destructive"} className="text-xs shrink-0">
                                {sc.won ? "我勝" : "我敗"}
                              </Badge>
                              <span className="truncate flex-1" title={sc.title}>{sc.title}</span>
                              <span className="text-muted-foreground shrink-0">{sc.unitName.length > 8 ? sc.unitName.slice(0, 8) + "…" : sc.unitName}</span>
                              <span className="text-muted-foreground shrink-0">{formatPCCDate(sc.date)}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
        {competitors.length > 10 && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 w-full"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? "收合" : `顯示全部 ${competitors.length} 家`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ====== 機關分析 ======

function AgencyTable({ agencies, myCompany, onViewCommittee }: { agencies: AgencyStats[]; myCompany: string; onViewCommittee?: (unitId: string, unitName: string) => void }) {
  const [showAll, setShowAll] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const display = showAll ? agencies : agencies.slice(0, 10);

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-base">機關分析</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4">機關</th>
                <th className="pb-2 pr-4">案件</th>
                <th className="pb-2 pr-4">我方勝</th>
                <th className="pb-2 pr-4">我方敗</th>
                <th className="pb-2">平均投標</th>
              </tr>
            </thead>
            <tbody>
              {display.map((a) => (
                <AgencyRow
                  key={a.unitId}
                  agency={a}
                  expanded={expandedId === a.unitId}
                  onToggle={() => setExpandedId(expandedId === a.unitId ? null : a.unitId)}
                  myCompany={myCompany}
                  onViewCommittee={onViewCommittee}
                />
              ))}
            </tbody>
          </table>
        </div>
        {agencies.length > 10 && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 w-full"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? "收合" : `顯示全部 ${agencies.length} 個機關`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

/** 可展開的機關行 */
function AgencyRow({
  agency,
  expanded,
  onToggle,
  myCompany,
  onViewCommittee,
}: {
  agency: AgencyStats;
  expanded: boolean;
  onToggle: () => void;
  myCompany: string;
  onViewCommittee?: (unitId: string, unitName: string) => void;
}) {
  const intel = useAgencyIntel(expanded ? agency.unitId : null, expanded, myCompany);

  return (
    <>
      <tr
        className="border-b last:border-0 cursor-pointer hover:bg-accent/50 transition-colors"
        onClick={onToggle}
      >
        <td className="py-2 pr-4">
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">{expanded ? "▼" : "▶"}</span>
            <div className="max-w-[180px] truncate" title={agency.unitName}>
              {agency.unitName}
            </div>
          </div>
        </td>
        <td className="py-2 pr-4 font-medium">{agency.totalCases}</td>
        <td className="py-2 pr-4">
          <Badge variant="default" className="text-xs">{agency.myWins}</Badge>
        </td>
        <td className="py-2 pr-4">
          <Badge variant="destructive" className="text-xs">{agency.myLosses}</Badge>
        </td>
        <td className="py-2 text-muted-foreground">
          {agency.avgBidders.toFixed(1)} 家
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={5} className="bg-muted/30 px-4 py-3">
            <AgencyIntelInline
              intel={intel}
              unitId={agency.unitId}
              unitName={agency.unitName}
              onViewCommittee={onViewCommittee}
            />
          </td>
        </tr>
      )}
    </>
  );
}

/** 機關情報內嵌顯示 */
function AgencyIntelInline({
  intel,
  unitId,
  unitName,
  onViewCommittee,
}: {
  intel: { data: ReturnType<typeof useAgencyIntel>["data"]; loading: boolean; error: string | null };
  unitId: string;
  unitName: string;
  onViewCommittee?: (unitId: string, unitName: string) => void;
}) {
  if (intel.loading) {
    return <div className="text-xs text-muted-foreground py-2">載入 {unitName} 情報中...</div>;
  }

  if (intel.error) {
    return <div className="text-xs text-muted-foreground py-2">無法載入：{intel.error}</div>;
  }

  if (!intel.data) return null;

  const { data } = intel;

  return (
    <div className="space-y-3 text-xs">
      {/* 在位者 */}
      {data.incumbents.length > 0 && (
        <div>
          <p className="text-muted-foreground mb-1 font-medium">在位者（得標 ≥ 2 次）</p>
          <div className="flex flex-wrap gap-2">
            {data.incumbents.map((inc) => (
              <span key={inc.name} className="inline-flex items-center gap-1">
                <span className="truncate max-w-[150px]">{inc.name}</span>
                <Badge variant="secondary" className="text-xs">{inc.wins}次</Badge>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 我方紀錄 */}
      <div>
        <p className="text-muted-foreground mb-1 font-medium">
          我方紀錄（{data.myHistory.filter((h) => h.won).length}/{data.myHistory.length} 得標）
        </p>
        {data.myHistory.length > 0 ? (
          <div className="space-y-1">
            {data.myHistory.slice(0, 5).map((h) => (
              <div key={`${h.date}-${h.title}`} className="flex items-center gap-2">
                <Badge variant={h.won ? "default" : "destructive"} className="text-xs shrink-0">
                  {h.won ? "勝" : "敗"}
                </Badge>
                <span className="truncate flex-1">{h.title}</span>
                <span className="text-muted-foreground shrink-0">{formatPCCDate(h.date)}</span>
              </div>
            ))}
            {data.myHistory.length > 5 && (
              <span className="text-muted-foreground">...還有 {data.myHistory.length - 5} 筆</span>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground">無投標紀錄</span>
        )}
      </div>

      {/* 近期案件 */}
      {data.recentCases.length > 0 && (
        <details>
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground font-medium">
            近期案件（{data.recentCases.length} 筆）
          </summary>
          <div className="mt-1 space-y-1">
            {data.recentCases.map((c) => (
              <div key={`${c.date}-${c.title}`} className="flex items-center gap-2">
                <span className="text-muted-foreground shrink-0">{formatPCCDate(c.date)}</span>
                <span className="truncate flex-1">{c.title}</span>
                <span className="text-muted-foreground shrink-0">{c.bidders}家</span>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* 跳到評委分析 */}
      {onViewCommittee && (
        <Button
          variant="outline"
          size="sm"
          className="text-xs h-7"
          onClick={(e) => {
            e.stopPropagation();
            onViewCommittee(unitId, unitName);
          }}
        >
          分析此機關的評委
        </Button>
      )}
    </div>
  );
}
