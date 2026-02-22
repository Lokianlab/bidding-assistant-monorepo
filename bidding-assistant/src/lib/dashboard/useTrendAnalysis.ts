"use client";

import { useMemo } from "react";
import type { NotionPage } from "./types";
import type { MonthlyMetrics, RollingMetrics, PeriodComparison } from "./analysis/trend";
import {
  computeMonthlyMetrics,
  computeRollingMetrics,
  compareQuarters,
  getRecentMonths,
} from "./analysis/trend";

// ====== 匯出型別 ======

export interface TrendAnalysis {
  /** 所有月份的度量（按時間排序） */
  monthlyMetrics: MonthlyMetrics[];
  /** 附帶 3 個月滾動勝率 */
  rollingMetrics: RollingMetrics[];
  /** 當季 vs 上季比較（無資料時為 null） */
  quarterComparison: PeriodComparison | null;
  /** 近 6 個月度量（用於圖表） */
  recentMetrics: RollingMetrics[];
  /** 近 6 個月月份標籤 */
  recentMonths: string[];
}

/**
 * 趨勢分析 hook
 * 包裝 trend.ts 純函式，提供 React 元件可直接使用的計算結果
 */
export function useTrendAnalysis(pages: NotionPage[]): TrendAnalysis {
  const monthlyMetrics = useMemo(
    () => computeMonthlyMetrics(pages),
    [pages],
  );

  const rollingMetrics = useMemo(
    () => computeRollingMetrics(monthlyMetrics, 3),
    [monthlyMetrics],
  );

  const quarterComparison = useMemo(
    () => compareQuarters(monthlyMetrics, new Date()),
    [monthlyMetrics],
  );

  const recentMonths = useMemo(
    () => getRecentMonths(new Date(), 6),
    [],
  );

  const recentMetrics = useMemo(() => {
    const recentSet = new Set(recentMonths);
    return rollingMetrics.filter((m) => recentSet.has(m.month));
  }, [rollingMetrics, recentMonths]);

  return {
    monthlyMetrics,
    rollingMetrics,
    quarterComparison,
    recentMetrics,
    recentMonths,
  };
}
