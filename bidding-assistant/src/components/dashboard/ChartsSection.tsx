"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, Cell, LineChart, Line, Legend,
} from "recharts";
import { CHART_PALETTE } from "@/lib/chart-config";
import type {
  MonthlyPoint, TypeStat, TeamMember,
} from "@/lib/dashboard/useDashboardMetrics";

interface ChartsSectionProps {
  monthlyTrend: MonthlyPoint[];
  typeAnalysis: TypeStat[];
  teamWorkload: TeamMember[];
}

/** 自訂 tooltip 樣式 */
interface ChartTooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<{ color?: string; name?: string; value?: string | number }>;
  label?: string | number;
}

function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background border rounded-lg shadow-lg p-2.5 text-sm">
      <p className="font-medium mb-1 text-xs">{label}</p>
      {payload.map((entry, idx) => (
        <div key={idx} className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-mono">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export function ChartsSection({
  monthlyTrend,
  typeAnalysis,
  teamWorkload,
}: ChartsSectionProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
      {/* 1. 企劃人員工作量 */}
      <Card>
        <CardHeader className="pb-2 px-3 sm:px-6">
          <CardTitle className="text-sm">企劃人員工作量</CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          {teamWorkload.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
              尚無企劃人員資料
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={teamWorkload} layout="vertical" margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 11 }} />
                  <RTooltip content={<ChartTooltip />} />
                  <Bar dataKey="count" name="件數" radius={[0, 4, 4, 0]}>
                    {teamWorkload.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={entry.count > 5 ? "#ef4444" : entry.count > 3 ? "#f59e0b" : "#10b981"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. 月份趨勢 */}
      <Card>
        <CardHeader className="pb-2 px-3 sm:px-6">
          <CardTitle className="text-sm">月份趨勢（近 12 個月）</CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          {monthlyTrend.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
              尚無截標時間資料
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyTrend} margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} domain={[0, 'auto']} />
                  <RTooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="投標件數" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="得標件數" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. 標案類型分析 */}
      <Card className="md:col-span-2">
        <CardHeader className="pb-2 px-3 sm:px-6">
          <CardTitle className="text-sm">標案類型分析</CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          {typeAnalysis.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
              尚無標案類型資料
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={typeAnalysis} layout="vertical" margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                  <RTooltip content={<ChartTooltip />} />
                  <Bar dataKey="件數" name="件數" radius={[0, 4, 4, 0]}>
                    {typeAnalysis.map((_, i) => (
                      <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
