"use client";

import { useState } from "react";
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
import { useMarketTrend } from "@/lib/pcc/useMarketTrend";
import type { MarketTrend as MarketTrendData, YearlyMarketData } from "@/lib/pcc/types";

export function MarketTrend() {
  const [keyword, setKeyword] = useState("");
  const { data, loading, progress, error, run } = useMarketTrend();

  const handleRun = () => {
    if (keyword.trim()) run(keyword.trim());
  };

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        輸入標案關鍵字，分析該領域的案件數、投標家數、競爭程度趨勢
      </p>

      <div className="flex gap-2">
        <Input
          placeholder="輸入領域關鍵字（如：食農教育、走讀、導覽）..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleRun()}
          className="flex-1"
        />
        <Button onClick={handleRun} disabled={loading || !keyword.trim()}>
          {loading
            ? progress
              ? `載入中 ${progress.loaded}/${progress.total}`
              : "分析中..."
            : "分析趨勢"}
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
          {error}
        </div>
      )}

      {data && <TrendResults data={data} />}
    </div>
  );
}

// ====== 趨勢分析結果 ======

function TrendResults({ data }: { data: MarketTrendData }) {
  return (
    <div className="space-y-4">
      {/* 總覽卡片 */}
      <TrendOverview data={data} />

      {/* 趨勢圖表 */}
      {data.yearlyData.length >= 2 && <TrendChart yearlyData={data.yearlyData} />}

      {/* 年度明細表 */}
      {data.yearlyData.length > 0 && <TrendTable yearlyData={data.yearlyData} />}

      {/* 活躍機關 */}
      {data.topAgencies.length > 0 && <TopAgencies agencies={data.topAgencies} />}
    </div>
  );
}

// ====== 總覽 ======

function TrendOverview({ data }: { data: MarketTrendData }) {
  const levelColor = {
    "藍海": "default" as const,
    "一般": "secondary" as const,
    "紅海": "destructive" as const,
  };

  const trendIcon = {
    "增加": "↑",
    "持平": "→",
    "減少": "↓",
  };

  const recentYears = data.yearlyData.slice(-3);
  const recentAvgBidders = recentYears.length > 0
    ? recentYears
        .filter((y) => y.avgBidders > 0)
        .reduce((sum, y) => sum + y.avgBidders, 0) /
      Math.max(recentYears.filter((y) => y.avgBidders > 0).length, 1)
    : 0;

  return (
    <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
      <Card className="py-3">
        <CardContent className="text-center">
          <p className="text-xs text-muted-foreground">案件總數</p>
          <p className="text-2xl font-bold mt-1">{data.totalRecords}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {data.yearRange[0]}—{data.yearRange[1]}
          </p>
        </CardContent>
      </Card>

      <Card className="py-3">
        <CardContent className="text-center">
          <p className="text-xs text-muted-foreground">趨勢方向</p>
          <p className="text-2xl font-bold mt-1">
            {trendIcon[data.trendDirection]} {data.trendDirection}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {data.yearlyData.length} 年資料
          </p>
        </CardContent>
      </Card>

      <Card className="py-3">
        <CardContent className="text-center">
          <p className="text-xs text-muted-foreground">近年平均投標</p>
          <p className="text-2xl font-bold mt-1">
            {recentAvgBidders > 0 ? recentAvgBidders.toFixed(1) : "—"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">家/案</p>
        </CardContent>
      </Card>

      <Card className="py-3">
        <CardContent className="text-center">
          <p className="text-xs text-muted-foreground">競爭程度</p>
          <div className="mt-2">
            <Badge variant={levelColor[data.competitionLevel]} className="text-lg px-3 py-1">
              {data.competitionLevel}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ====== 趨勢圖表 ======

function TrendChart({ yearlyData }: { yearlyData: YearlyMarketData[] }) {
  const chartData = yearlyData.map((y) => ({
    year: String(y.year),
    決標案件: y.awardCases,
    招標公告: y.tenderCases,
    平均投標家數: y.avgBidders,
  }));

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-base">案件數與投標家數趨勢</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
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
              />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="決標案件" fill="#10b981" radius={[0, 0, 0, 0]} />
              <Bar yAxisId="left" dataKey="招標公告" fill="#60a5fa" radius={[4, 4, 0, 0]} />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="平均投標家數"
                stroke="#f59e0b"
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

// ====== 年度明細表 ======

function TrendTable({ yearlyData }: { yearlyData: YearlyMarketData[] }) {
  // 反轉：最近的年度在上面
  const sorted = [...yearlyData].reverse();

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
                <th className="pb-2 pr-4">案件數</th>
                <th className="pb-2 pr-4">決標</th>
                <th className="pb-2 pr-4">投標家數</th>
                <th className="pb-2">活躍機關</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((y) => (
                <tr key={y.year} className="border-b last:border-0">
                  <td className="py-2 pr-4 font-medium">{y.year}</td>
                  <td className="py-2 pr-4">{y.totalCases}</td>
                  <td className="py-2 pr-4">{y.awardCases}</td>
                  <td className="py-2 pr-4">
                    {y.avgBidders > 0 ? (
                      <span>
                        {y.avgBidders}
                        <span className="text-muted-foreground ml-1">
                          ({y.minBidders}—{y.maxBidders})
                        </span>
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-2">
                    <div className="flex flex-wrap gap-1">
                      {y.topAgencies.map((a) => (
                        <Badge key={a} variant="outline" className="text-xs">
                          {a.length > 10 ? a.slice(0, 10) + "…" : a}
                        </Badge>
                      ))}
                    </div>
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

// ====== 活躍機關 ======

function TopAgencies({ agencies }: { agencies: { name: string; count: number }[] }) {
  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-base">最活躍機關（全期）</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {agencies.map((a, i) => (
            <Badge
              key={a.name}
              variant={i < 3 ? "default" : "secondary"}
              className="text-xs"
            >
              {a.name.length > 12 ? a.name.slice(0, 12) + "…" : a.name}
              <span className="ml-1 opacity-70">{a.count}</span>
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
