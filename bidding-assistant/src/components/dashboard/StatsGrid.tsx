"use client";

import { Card, CardContent } from "@/components/ui/card";
import { fmt } from "@/lib/dashboard/helpers";
import type { CostBreakdown, CostPeriod } from "@/lib/dashboard/useDashboardMetrics";
import { useState } from "react";

interface StatsGridProps {
  projectCount: number;
  totalBudget: number;
  biddingBudget: number;
  biddingCount: number;
  wonBudget: number;
  wonCount: number;
  winRate: number;
  submittedCount: number;
  totalCost: CostBreakdown;
  totalCostByPeriod: Record<CostPeriod, CostBreakdown>;
  yearlyGoal: number;
  goalRate: number;
  onGoalEdit: (newGoal: number) => void;
  monthSubmitted: number;
  weekSubmitted: number;
  monthlyTarget: number;
  onMonthlyTargetEdit: (newTarget: number) => void;
  weeklyTarget: number;
  onWeeklyTargetEdit: (newTarget: number) => void;
  yearSubmitted: number;
  yearWon: number;
  showSkeleton: boolean;
}

const COST_PERIOD_LABELS: Record<CostPeriod, string> = {
  all: "全部",
  year: "本年度",
  month: "本月",
  week: "本週",
};

/** 圓形進度環（SVG） */
function CircleProgress({ value, size = 48, stroke = 4 }: { value: number; size?: number; stroke?: number }) {
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
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className="text-xs font-bold fill-current">
        {pct}%
      </text>
    </svg>
  );
}

function SkeletonCard() {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mb-2" />
        <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
      </CardContent>
    </Card>
  );
}

export function StatsGrid(props: StatsGridProps) {
  const {
    projectCount, totalBudget,
    biddingBudget, biddingCount,
    wonBudget, wonCount,
    winRate, submittedCount,
    totalCost, totalCostByPeriod,
    yearlyGoal, goalRate, onGoalEdit,
    monthSubmitted, weekSubmitted,
    monthlyTarget, onMonthlyTargetEdit,
    weeklyTarget, onWeeklyTargetEdit,
    yearSubmitted, yearWon,
    showSkeleton,
  } = props;

  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState("");
  const [editingMonthly, setEditingMonthly] = useState(false);
  const [monthlyInput, setMonthlyInput] = useState("");
  const [editingWeekly, setEditingWeekly] = useState(false);
  const [weeklyInput, setWeeklyInput] = useState("");
  const [costPeriod, setCostPeriod] = useState<CostPeriod>("all");

  if (showSkeleton) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
        {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  const currentCost = totalCostByPeriod[costPeriod] ?? totalCost;

  return (
    <div className="space-y-2 sm:space-y-4 mb-4 sm:mb-6">
      {/* 第一排：核心 KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
        {/* 進行中標案 */}
        <Card>
          <CardContent className="pt-4 sm:pt-6 pb-4">
            <div className="text-xl sm:text-2xl font-bold">{projectCount}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">當前全部標案</p>
          </CardContent>
        </Card>

        {/* 全部預算總額 */}
        <Card>
          <CardContent className="pt-4 sm:pt-6 pb-4">
            <div className="text-lg sm:text-xl font-bold truncate">${fmt(totalBudget)}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">全部標案預算總額</p>
          </CardContent>
        </Card>

        {/* 得標金額 */}
        <Card>
          <CardContent className="pt-4 sm:pt-6 pb-4">
            <div className="text-lg sm:text-xl font-bold text-emerald-600 truncate">${fmt(wonBudget)}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">得標預算總額</p>
            <p className="text-[10px] text-muted-foreground/60">{wonCount} 件</p>
          </CardContent>
        </Card>

        {/* 得標率 */}
        <Card>
          <CardContent className="pt-4 sm:pt-6 pb-4">
            <div className="flex items-center gap-3">
              <CircleProgress value={winRate} />
              <div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">得標率</p>
                <p className="text-[10px] text-muted-foreground/60">
                  已投標 {submittedCount} 件
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 第二排：次要 KPI */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4">
        {/* 競標中金額 */}
        <Card>
          <CardContent className="pt-4 sm:pt-6 pb-4">
            <div className="text-lg sm:text-xl font-bold text-purple-600 truncate">${fmt(biddingBudget)}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">競標階段預算總額</p>
            <p className="text-[10px] text-muted-foreground/60">{biddingCount} 件（含已出席簡報）</p>
          </CardContent>
        </Card>

        {/* 本年度投標件數 */}
        <Card>
          <CardContent className="pt-4 sm:pt-6 pb-4">
            <div className="text-xl sm:text-2xl font-bold text-indigo-600">{yearSubmitted}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              {new Date().getFullYear()} 年度投標件數
            </p>
            <p className="text-[10px] text-muted-foreground/60">
              得標 {yearWon} 件（{yearSubmitted > 0 ? Math.round((yearWon / yearSubmitted) * 100) : 0}%）
            </p>
          </CardContent>
        </Card>

        {/* 年度目標達成率 */}
        <Card>
          <CardContent className="pt-4 sm:pt-6 pb-4">
            {editingGoal ? (
              <div className="flex flex-col gap-1">
                <input
                  type="number"
                  className="w-full border rounded px-2 py-1 text-sm"
                  placeholder="輸入年度目標金額"
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      onGoalEdit(Number(goalInput) || 0);
                      setEditingGoal(false);
                    }
                    if (e.key === "Escape") setEditingGoal(false);
                  }}
                  autoFocus
                />
                <span className="text-[10px] text-muted-foreground">Enter 儲存 / Esc 取消</span>
              </div>
            ) : (
              <>
                <div className="text-xl sm:text-2xl font-bold text-amber-600">
                  {yearlyGoal > 0 ? `${goalRate}%` : "—"}
                </div>
                <div className="flex items-center gap-1">
                  <p className="text-[10px] sm:text-xs text-muted-foreground">年度目標達成率</p>
                  <button
                    className="text-[10px] text-blue-500 hover:text-blue-700 underline"
                    onClick={() => {
                      setGoalInput(String(yearlyGoal || ""));
                      setEditingGoal(true);
                    }}
                  >
                    {yearlyGoal > 0 ? "改" : "設定"}
                  </button>
                </div>
                {yearlyGoal > 0 && (
                  <div className="mt-1.5">
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-amber-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${Math.min(goalRate, 100)}%` }}
                      />
                    </div>
                    <p className="text-[9px] text-muted-foreground mt-0.5">目標 ${fmt(yearlyGoal)}</p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* 本月投標達成率 */}
        <Card>
          <CardContent className="pt-4 sm:pt-6 pb-4">
            {editingMonthly ? (
              <div className="flex flex-col gap-1">
                <input
                  type="number"
                  className="w-full border rounded px-2 py-1 text-sm"
                  placeholder="每月目標件數"
                  value={monthlyInput}
                  onChange={(e) => setMonthlyInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      onMonthlyTargetEdit(Number(monthlyInput) || 0);
                      setEditingMonthly(false);
                    }
                    if (e.key === "Escape") setEditingMonthly(false);
                  }}
                  autoFocus
                />
                <span className="text-[10px] text-muted-foreground">Enter 儲存 / Esc 取消</span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <CircleProgress
                  value={monthlyTarget > 0 ? Math.round((monthSubmitted / monthlyTarget) * 100) : 0}
                />
                <div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    本月投標 {monthSubmitted}
                    {monthlyTarget > 0 ? ` / ${monthlyTarget} 件` : " 件"}
                  </p>
                  <button
                    className="text-[10px] text-blue-500 hover:text-blue-700 underline"
                    onClick={() => {
                      setMonthlyInput(String(monthlyTarget || ""));
                      setEditingMonthly(true);
                    }}
                  >
                    {monthlyTarget > 0 ? "改目標" : "設定目標"}
                  </button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 本週投標件數（可設定目標） */}
        <Card>
          <CardContent className="pt-4 sm:pt-6 pb-4">
            {editingWeekly ? (
              <div className="flex flex-col gap-1">
                <input
                  type="number"
                  className="w-full border rounded px-2 py-1 text-sm"
                  placeholder="每週目標件數"
                  value={weeklyInput}
                  onChange={(e) => setWeeklyInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      onWeeklyTargetEdit(Number(weeklyInput) || 0);
                      setEditingWeekly(false);
                    }
                    if (e.key === "Escape") setEditingWeekly(false);
                  }}
                  autoFocus
                />
                <span className="text-[10px] text-muted-foreground">Enter 儲存 / Esc 取消</span>
              </div>
            ) : weeklyTarget > 0 ? (
              <div className="flex items-center gap-3">
                <CircleProgress
                  value={Math.round((weekSubmitted / weeklyTarget) * 100)}
                />
                <div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    本週投標 {weekSubmitted} / {weeklyTarget} 件
                  </p>
                  <button
                    className="text-[10px] text-blue-500 hover:text-blue-700 underline"
                    onClick={() => {
                      setWeeklyInput(String(weeklyTarget));
                      setEditingWeekly(true);
                    }}
                  >
                    改目標
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="text-xl sm:text-2xl font-bold text-sky-600">{weekSubmitted}</div>
                <div className="flex items-center gap-1">
                  <p className="text-[10px] sm:text-xs text-muted-foreground">本週投標件數</p>
                  <button
                    className="text-[10px] text-blue-500 hover:text-blue-700 underline"
                    onClick={() => {
                      setWeeklyInput("");
                      setEditingWeekly(true);
                    }}
                  >
                    設定目標
                  </button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* 總投入成本（可選時段） */}
        <Card>
          <CardContent className="pt-4 sm:pt-6 pb-4">
            <div className="text-lg sm:text-xl font-bold truncate">${fmt(currentCost.total)}</div>
            <div className="flex items-center gap-1">
              <p className="text-[10px] sm:text-xs text-muted-foreground">投入成本</p>
              <select
                className="text-[10px] bg-transparent border rounded px-1 py-0 text-muted-foreground cursor-pointer hover:text-foreground"
                value={costPeriod}
                onChange={(e) => setCostPeriod(e.target.value as CostPeriod)}
              >
                {(Object.keys(COST_PERIOD_LABELS) as CostPeriod[]).map((k) => (
                  <option key={k} value={k}>{COST_PERIOD_LABELS[k]}</option>
                ))}
              </select>
            </div>
            <p className="text-[10px] text-muted-foreground/60">
              押標金 ${fmt(currentCost.bidDeposit)} / 領標費 ${fmt(currentCost.procurementFee)}
            </p>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
