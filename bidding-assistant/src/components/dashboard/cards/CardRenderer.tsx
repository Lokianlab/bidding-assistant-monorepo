"use client";

import React from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer, Cell,
  LineChart, Line, Legend,
} from "recharts";
import { CHART_PALETTE } from "@/lib/chart-config";
import { fmt } from "@/lib/dashboard/helpers";
import type {
  CardConfig,
  CustomCardConfig,
  CardSizePreset,
} from "@/lib/dashboard/card-layout/types";
import type { DashboardMetrics } from "@/lib/dashboard/useDashboardMetrics";
import { CustomCard } from "./CustomCard";

interface CardRendererProps {
  type: string;
  config: CardConfig | CustomCardConfig;
  metrics: DashboardMetrics;
  size: CardSizePreset;
}

// ── Shared chart tooltip ─────────────────────────────────────

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

// ── Circle progress ring (SVG) ───────────────────────────────

function CircleProgress({ value, size = 44, stroke = 3.5 }: { value: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(Math.max(value, 0), 100);
  const offset = circ - (pct / 100) * circ;

  return (
    <svg width={size} height={size} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-muted/30" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="currentColor" strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        className="text-emerald-500 transition-all duration-500"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className="text-[10px] font-bold fill-current">
        {pct}%
      </text>
    </svg>
  );
}

/**
 * Factory component that maps a card type string to the corresponding
 * card visualization. Renders real metrics data for all preset card types,
 * and delegates to CustomCard for the "custom" type.
 */
export function CardRenderer({ type, config, metrics, size }: CardRendererProps) {
  // ── Custom card ────────────────────────────────────────────
  if (type === "custom") {
    return (
      <CustomCard
        config={config as CustomCardConfig}
        metrics={metrics}
      />
    );
  }

  // ── Stat cards ─────────────────────────────────────────────
  switch (type) {
    case "stat-projects":
      return (
        <div className="flex flex-col gap-1">
          <div className="text-xl sm:text-2xl font-bold">{metrics.activeProjects.length}</div>
          <p className="text-[10px] sm:text-xs text-muted-foreground">
            {config.title ?? "當前標案數"}
          </p>
        </div>
      );

    case "stat-budget":
      return (
        <div className="flex flex-col gap-1">
          <div className="text-lg sm:text-xl font-bold truncate">${fmt(metrics.totalBudget)}</div>
          <p className="text-[10px] sm:text-xs text-muted-foreground">
            {config.title ?? "預算總額"}
          </p>
        </div>
      );

    case "stat-won":
      return (
        <div className="flex flex-col gap-1">
          <div className="text-lg sm:text-xl font-bold text-emerald-600 truncate">
            ${fmt(metrics.wonBudget)}
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground">
            {config.title ?? "得標金額"}
          </p>
          <p className="text-[10px] text-muted-foreground/60">
            {metrics.wonProjects.length} 件
          </p>
        </div>
      );

    case "stat-winrate":
      return (
        <div className="flex items-center gap-3">
          <CircleProgress value={metrics.winRate} />
          <div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              {config.title ?? "得標率"}
            </p>
            <p className="text-[10px] text-muted-foreground/60">
              已投標 {metrics.submittedProjects.length} 件
            </p>
          </div>
        </div>
      );

    case "stat-bidding":
      return (
        <div className="flex flex-col gap-1">
          <div className="text-lg sm:text-xl font-bold text-purple-600 truncate">
            ${fmt(metrics.biddingBudget)}
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground">
            {config.title ?? "競標中金額"}
          </p>
          <p className="text-[10px] text-muted-foreground/60">
            {metrics.biddingProjects.length + metrics.presentedProjects.length} 件（含已出席簡報）
          </p>
        </div>
      );

    case "stat-year-submitted":
      return (
        <div className="flex flex-col gap-1">
          <div className="text-xl sm:text-2xl font-bold text-indigo-600">
            {metrics.yearSubmittedCount}
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground">
            {config.title ?? `${new Date().getFullYear()} 年度投標件數`}
          </p>
          <p className="text-[10px] text-muted-foreground/60">
            得標 {metrics.yearWonCount} 件
            （{metrics.yearSubmittedCount > 0
              ? Math.round((metrics.yearWonCount / metrics.yearSubmittedCount) * 100)
              : 0}%）
          </p>
        </div>
      );

    case "stat-goal":
      return (
        <div className="flex flex-col gap-1">
          <div className="text-xl sm:text-2xl font-bold text-amber-600">—</div>
          <p className="text-[10px] sm:text-xs text-muted-foreground">
            {config.title ?? "年度目標達成率"}
          </p>
          <p className="text-[10px] text-muted-foreground/60">
            請於舊版儀表板設定目標
          </p>
        </div>
      );

    case "stat-monthly-target":
      return (
        <div className="flex items-center gap-3">
          <CircleProgress
            value={metrics.monthSubmittedCount > 0
              ? Math.min(Math.round((metrics.monthSubmittedCount / Math.max(metrics.monthSubmittedCount, 1)) * 100), 100)
              : 0}
          />
          <div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              {config.title ?? "月投標達成率"}
            </p>
            <p className="text-[10px] text-muted-foreground/60">
              本月投標 {metrics.monthSubmittedCount} 件
            </p>
          </div>
        </div>
      );
  }

  // ── Chart cards ────────────────────────────────────────────
  const chartHeight = size === "small" ? 120 : size === "medium" ? 200 : 260;

  switch (type) {
    case "chart-team-workload":
      return (
        <div className="w-full" style={{ minHeight: chartHeight }}>
          {metrics.teamWorkload.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground" style={{ minHeight: chartHeight }}>
              尚無企劃人員資料
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={chartHeight}>
              <BarChart data={metrics.teamWorkload} layout="vertical" margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 11 }} />
                <RTooltip content={<ChartTooltip />} />
                <Bar dataKey="count" name="件數" radius={[0, 4, 4, 0]}>
                  {metrics.teamWorkload.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={entry.count > 5 ? "#ef4444" : entry.count > 3 ? "#f59e0b" : "#10b981"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      );

    case "chart-monthly-trend":
      return (
        <div className="w-full" style={{ minHeight: chartHeight }}>
          {metrics.monthlyTrend.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground" style={{ minHeight: chartHeight }}>
              尚無截標時間資料
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={chartHeight}>
              <LineChart data={metrics.monthlyTrend} margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} domain={[0, "auto"]} />
                <RTooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="投標件數" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="得標件數" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      );

    case "chart-type-analysis":
      return (
        <div className="w-full" style={{ minHeight: chartHeight }}>
          {metrics.typeAnalysis.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground" style={{ minHeight: chartHeight }}>
              尚無標案類型資料
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={chartHeight}>
              <BarChart data={metrics.typeAnalysis} layout="vertical" margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                <RTooltip content={<ChartTooltip />} />
                <Bar dataKey="件數" name="件數" radius={[0, 4, 4, 0]}>
                  {metrics.typeAnalysis.map((_, i) => (
                    <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      );
  }

  // ── Gauge cards ────────────────────────────────────────────
  switch (type) {
    case "gauge-weekly-bid":
      return (
        <div className="flex flex-col gap-1">
          <div className="text-xl sm:text-2xl font-bold text-sky-600">
            {metrics.weekSubmittedCount}
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground">
            {config.title ?? "本週投標件數"}
          </p>
        </div>
      );

    case "gauge-cost":
      return (
        <div className="flex flex-col gap-1">
          <div className="text-lg sm:text-xl font-bold truncate">
            ${fmt(metrics.totalCost.total)}
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground">
            {config.title ?? "投入成本"}
          </p>
          <p className="text-[10px] text-muted-foreground/60">
            押標金 ${fmt(metrics.totalCost.bidDeposit)} / 領標費 ${fmt(metrics.totalCost.procurementFee)}
          </p>
        </div>
      );
  }

  // ── Unknown type fallback ──────────────────────────────────
  return (
    <div className="text-sm text-muted-foreground">
      unknown type: {type}
    </div>
  );
}

export default CardRenderer;
