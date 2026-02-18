"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
  AreaChart, Area,
} from "recharts";
import { ChartTooltip, CumulativeTooltip } from "./ChartTooltips";
import { StatusInsights } from "./StatusInsights";
import { getStatusHex } from "@/lib/chart-config";
import type { MonthStat, WeekStat, WriterStat, CumulativeStat, AnalyticsTotals } from "@/lib/dashboard/useAnalyticsMetrics";

// ====== 共用 Y 軸 formatter ======
const budgetFormatter = (v: number) =>
  v >= 1e8 ? `${(v / 1e8).toFixed(1)}億` : v >= 1e4 ? `${(v / 1e4).toFixed(0)}萬` : String(v);

// ====== 無資料佔位 ======
function EmptyChart({ text = "尚無資料", height = "h-64" }: { text?: string; height?: string }) {
  return (
    <div className={`${height} flex items-center justify-center text-sm text-muted-foreground`}>
      {text}
    </div>
  );
}

// ====== 趨勢折線圖 ======
export function TrendLineChart({
  data, timeGranularity,
}: {
  data: (MonthStat | WeekStat)[];
  timeGranularity: "month" | "week";
}) {
  return (
    <Card>
      <CardHeader className="pb-2 px-3 sm:px-6">
        <CardTitle className="text-sm">
          {timeGranularity === "month" ? "月份" : "每週"}投標 vs 得標趨勢
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        {data.length === 0 ? <EmptyChart /> : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <RTooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="submitted" name="投標件數" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="won" name="得標件數" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ====== 企劃人員績效長條圖 ======
export function WriterBarChart({ data }: { data: WriterStat[] }) {
  return (
    <Card>
      <CardHeader className="pb-2 px-3 sm:px-6">
        <CardTitle className="text-sm">企劃人員績效</CardTitle>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        {data.length === 0 ? <EmptyChart text="尚無企劃人員資料" /> : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" width={70} tick={{ fontSize: 11 }} />
                <RTooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="submitted" name="投標" fill="#6366f1" radius={[0, 4, 4, 0]} />
                <Bar dataKey="won" name="得標" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ====== 成敗分布圓餅圖 + 洞見 ======
export function StatusPieWithInsights({
  breakdown, totals, monthCount,
}: {
  breakdown: { name: string; value: number }[];
  totals: AnalyticsTotals;
  monthCount: number;
}) {
  return (
    <Card className="md:col-span-2">
      <CardHeader className="pb-2 px-3 sm:px-6">
        <CardTitle className="text-sm">案件成敗分布與洞見分析</CardTitle>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        {breakdown.length === 0 ? <EmptyChart /> : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={breakdown}
                    dataKey="value"
                    nameKey="name"
                    cx="50%" cy="50%"
                    outerRadius={90} innerRadius={40}
                    label={({ name, percent }: { name?: string; percent?: number }) =>
                      (percent ?? 0) < 0.04 ? null : `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                    fontSize={11}
                  >
                    {breakdown.map((entry, i) => (
                      <Cell key={entry.name} fill={getStatusHex(entry.name, i)} />
                    ))}
                  </Pie>
                  <RTooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              <StatusInsights breakdown={breakdown} totals={totals} monthCount={monthCount} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ====== 得標金額長條圖 ======
export function WonBudgetBarChart({
  data, timeGranularity,
}: {
  data: (MonthStat | WeekStat)[];
  timeGranularity: "month" | "week";
}) {
  return (
    <Card>
      <CardHeader className="pb-2 px-3 sm:px-6">
        <CardTitle className="text-sm">
          {timeGranularity === "month" ? "月份" : "每週"}得標金額
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        {data.length === 0 ? <EmptyChart /> : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={budgetFormatter} />
                <RTooltip content={<ChartTooltip isCurrency />} />
                <Bar dataKey="wonBudget" name="得標金額" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ====== 累計趨勢圖 ======
export function CumulativeChart({
  data, timeGranularity,
}: {
  data: CumulativeStat[];
  timeGranularity: "month" | "week";
}) {
  return (
    <Card className="md:col-span-2">
      <CardHeader className="pb-2 px-3 sm:px-6">
        <CardTitle className="text-sm">
          {timeGranularity === "month" ? "月份" : "每週"}累計趨勢
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        {data.length === 0 ? <EmptyChart height="h-72" /> : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
                <defs>
                  <linearGradient id="gradCumSubmitted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="gradCumWon" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="gradCumBudget" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={50} />
                <YAxis yAxisId="count" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis yAxisId="budget" orientation="right" tick={{ fontSize: 10 }} tickFormatter={budgetFormatter} />
                <RTooltip content={<CumulativeTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area yAxisId="count" type="monotone" dataKey="cumSubmitted" name="累計投標" stroke="#6366f1" strokeWidth={2} fill="url(#gradCumSubmitted)" />
                <Area yAxisId="count" type="monotone" dataKey="cumWon" name="累計得標" stroke="#10b981" strokeWidth={2} fill="url(#gradCumWon)" />
                <Area yAxisId="budget" type="monotone" dataKey="cumWonBudget" name="累計得標金額" stroke="#f59e0b" strokeWidth={2} fill="url(#gradCumBudget)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
