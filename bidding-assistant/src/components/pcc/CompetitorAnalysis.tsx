"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCompetitorAnalysis } from "@/lib/pcc/useCompetitorAnalysis";
import { formatAmount } from "@/lib/pcc/helpers";
import type { SelfAnalysis, CompetitorStats, AgencyStats } from "@/lib/pcc/types";

const DEFAULT_COMPANY = "大員洛川";

export function CompetitorAnalysis() {
  const [companyName, setCompanyName] = useState(DEFAULT_COMPANY);
  const { data, loading, progress, error, run } = useCompetitorAnalysis();

  const handleRun = () => {
    if (companyName.trim()) run(companyName.trim());
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
        <Button onClick={handleRun} disabled={loading || !companyName.trim()}>
          {loading
            ? progress
              ? `載入中 ${progress.loaded}/${progress.total}`
              : "分析中..."
            : "開始分析"}
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
          {error}
        </div>
      )}

      {data && <AnalysisResults data={data} />}
    </div>
  );
}

// ====== 分析結果 ======

function AnalysisResults({ data }: { data: SelfAnalysis }) {
  return (
    <div className="space-y-6">
      {/* 總覽 */}
      <OverviewCards data={data} />

      {/* 年度趨勢 */}
      {data.yearlyStats.length > 0 && <YearlyTable stats={data.yearlyStats} />}

      {/* 競爭對手排行 */}
      {data.competitors.length > 0 && <CompetitorTable competitors={data.competitors} />}

      {/* 機關分析 */}
      {data.agencies.length > 0 && <AgencyTable agencies={data.agencies} />}
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

function YearlyTable({ stats }: { stats: SelfAnalysis["yearlyStats"] }) {
  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-base">年度趨勢</CardTitle>
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
                <tr key={s.year} className="border-b last:border-0">
                  <td className="py-2 pr-4 font-medium">{s.year}</td>
                  <td className="py-2 pr-4">{s.total}</td>
                  <td className="py-2 pr-4">{s.wins}</td>
                  <td className="py-2">
                    <Badge variant={s.total > 0 && s.wins / s.total >= 0.5 ? "default" : "secondary"}>
                      {s.total > 0 ? `${((s.wins / s.total) * 100).toFixed(0)}%` : "—"}
                    </Badge>
                  </td>
                </tr>
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
                <tr key={c.id} className="border-b last:border-0">
                  <td className="py-2 pr-4">
                    <div className="max-w-[200px] truncate" title={c.name}>
                      {c.name.replace(/\s*\(.*\)\s*$/, "")}
                    </div>
                    <div className="text-xs text-muted-foreground">{c.id}</div>
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
                        <Badge variant="outline" className="text-xs">
                          +{c.agencies.length - 3}
                        </Badge>
                      )}
                    </div>
                  </td>
                </tr>
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

function AgencyTable({ agencies }: { agencies: AgencyStats[] }) {
  const [showAll, setShowAll] = useState(false);
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
              {display.map((a) => {
                const rate = a.totalCases > 0 ? a.myWins / a.totalCases : 0;
                return (
                  <tr key={a.unitId} className="border-b last:border-0">
                    <td className="py-2 pr-4">
                      <div className="max-w-[200px] truncate" title={a.unitName}>
                        {a.unitName}
                      </div>
                    </td>
                    <td className="py-2 pr-4 font-medium">{a.totalCases}</td>
                    <td className="py-2 pr-4">
                      <Badge variant="default" className="text-xs">{a.myWins}</Badge>
                    </td>
                    <td className="py-2 pr-4">
                      <Badge variant="destructive" className="text-xs">{a.myLosses}</Badge>
                    </td>
                    <td className="py-2 text-muted-foreground">
                      {a.avgBidders.toFixed(1)} 家
                    </td>
                  </tr>
                );
              })}
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
