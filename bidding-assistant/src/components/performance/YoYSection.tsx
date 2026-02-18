"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer, Legend,
} from "recharts";
import { YoYTooltip } from "./ChartTooltips";
import { formatCurrency } from "@/lib/chart-config";
import type { YoYSummary } from "@/lib/dashboard/useAnalyticsMetrics";

interface YoYSectionProps {
  availableYears: number[];
  yoyBaseYear: number;
  setYoyBaseYear: (y: number) => void;
  yoyCompareYear: number;
  setYoyCompareYear: (y: number) => void;
  yoyData: YoYSummary | null;
}

export function YoYSection({
  availableYears, yoyBaseYear, setYoyBaseYear,
  yoyCompareYear, setYoyCompareYear, yoyData,
}: YoYSectionProps) {
  if (availableYears.length < 2) return null;

  return (
    <Card className="mb-4 sm:mb-6">
      <CardHeader className="pb-2 px-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <CardTitle className="text-sm">年度同期比較</CardTitle>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-muted-foreground">基準年</span>
            <Select value={String(yoyBaseYear)} onValueChange={(v) => setYoyBaseYear(Number(v))}>
              <SelectTrigger className="w-[90px] h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {availableYears.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">vs</span>
            <Select value={String(yoyCompareYear)} onValueChange={(v) => setYoyCompareYear(Number(v))}>
              <SelectTrigger className="w-[90px] h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {availableYears.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        {yoyData && yoyData.data.length > 0 ? (
          <>
            <YoYChart yoyData={yoyData} />
            <YoYSummaryCards yoyData={yoyData} />
          </>
        ) : (
          <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">
            {yoyBaseYear === yoyCompareYear
              ? "請選擇不同的年度進行比較"
              : "所選年度無可比較的資料"}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ====== 同期比較折線圖 ======
function YoYChart({ yoyData }: { yoyData: YoYSummary }) {
  return (
    <div className="h-72 mb-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={yoyData.data} margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="period" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
          <RTooltip content={<YoYTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="baseSubmitted" name={`${yoyData.baseYear} 投標`} stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="baseWon" name={`${yoyData.baseYear} 得標`} stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="compareSubmitted" name={`${yoyData.compareYear} 投標`} stroke="#6366f1" strokeWidth={2} strokeDasharray="6 3" dot={{ r: 3 }} opacity={0.6} />
          <Line type="monotone" dataKey="compareWon" name={`${yoyData.compareYear} 得標`} stroke="#10b981" strokeWidth={2} strokeDasharray="6 3" dot={{ r: 3 }} opacity={0.6} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ====== 同期比較摘要卡片 ======
function YoYSummaryCards({ yoyData }: { yoyData: YoYSummary }) {
  const bt = yoyData.baseTotals;
  const ct = yoyData.compareTotals;
  const diffSub = bt.submitted - ct.submitted;
  const diffWon = bt.won - ct.won;
  const diffBudget = bt.wonBudget - ct.wonBudget;
  const pctSub = ct.submitted > 0 ? Math.round((diffSub / ct.submitted) * 100) : diffSub > 0 ? 100 : 0;
  const pctWon = ct.won > 0 ? Math.round((diffWon / ct.won) * 100) : diffWon > 0 ? 100 : 0;
  const pctBudget = ct.wonBudget > 0 ? Math.round((diffBudget / ct.wonBudget) * 100) : diffBudget > 0 ? 100 : 0;

  const items = [
    { label: "投標件數", base: bt.submitted, comp: ct.submitted, diff: diffSub, pct: pctSub, fmt: (v: number) => `${v} 件` },
    { label: "得標件數", base: bt.won, comp: ct.won, diff: diffWon, pct: pctWon, fmt: (v: number) => `${v} 件` },
    { label: "得標金額", base: bt.wonBudget, comp: ct.wonBudget, diff: diffBudget, pct: pctBudget, fmt: (v: number) => formatCurrency(v) },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {items.map((item) => (
        <div key={item.label} className="border rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold">{item.fmt(item.base)}</span>
            <span className="text-xs text-muted-foreground">vs {item.fmt(item.comp)}</span>
          </div>
          <div className={`text-sm font-medium mt-1 ${item.diff > 0 ? "text-emerald-600" : item.diff < 0 ? "text-rose-600" : "text-muted-foreground"}`}>
            {item.diff > 0 ? "\u2191" : item.diff < 0 ? "\u2193" : "\u2192"}{" "}
            {item.diff > 0 ? "+" : ""}{item.label === "得標金額" ? formatCurrency(Math.abs(item.diff)) : `${Math.abs(item.diff)} 件`}
            {item.pct !== 0 && ` (${item.pct > 0 ? "+" : ""}${item.pct}%)`}
          </div>
        </div>
      ))}
    </div>
  );
}
