"use client";

/**
 * 交叉分析 React Hook
 * 實際邏輯已拆分至 ./analysis/ 目錄下的純函式模組
 * 這個檔案只做 useMemo 組合 + re-export 型別
 */

import { useMemo } from "react";
import type { NotionPage } from "./types";
import {
  analyzeByWriter, analyzeByAgency, analyzeByType,
  analyzeByMethod, analyzeByBudgetRange, analyzeByPriority,
  analyzeByDecision,
} from "./analysis/breakdown";
import { generateGlobalInsights } from "./analysis/global-insights";
import { computeCostAnalysis } from "./analysis/cost-analysis";
import type { ResultBreakdown, Insight } from "./analysis/breakdown";
import type { CostAnalysisResult } from "./analysis/cost-analysis";

// ====== Re-export 所有型別與函式（保持向後相容） ======
export type {
  ResultBreakdown, Insight,
  CrossCell, CrossMatrix, DimensionKey,
  PersonReport,
  CostAnalysisResult,
} from "./analysis";

export {
  buildBreakdown, groupByField, getBudgetRange, BUDGET_RANGES,
  analyzeByWriter, analyzeByAgency, analyzeByType,
  analyzeByMethod, analyzeByBudgetRange, analyzeByPriority,
  analyzeByDecision,
  computeCrossMatrix, DIMENSION_OPTIONS,
  buildPersonReport,
  generateGlobalInsights,
  computeCostAnalysis,
} from "./analysis";

// ====== Hook 整合結果型別 ======

export interface CrossAnalysisResult {
  byWriter: ResultBreakdown[];
  byAgency: ResultBreakdown[];
  byType: ResultBreakdown[];
  byMethod: ResultBreakdown[];
  byBudgetRange: ResultBreakdown[];
  byPriority: ResultBreakdown[];
  byDecision: ResultBreakdown[];
  globalInsights: Insight[];
  costAnalysis: CostAnalysisResult;
  writerNames: string[];
}

// ====== React Hook ======

export function useCrossAnalysis(pages: NotionPage[]): CrossAnalysisResult {
  const byWriter = useMemo(() => analyzeByWriter(pages), [pages]);
  const byAgency = useMemo(() => analyzeByAgency(pages), [pages]);
  const byType = useMemo(() => analyzeByType(pages), [pages]);
  const byMethod = useMemo(() => analyzeByMethod(pages), [pages]);
  const byBudgetRange = useMemo(() => analyzeByBudgetRange(pages), [pages]);
  const byPriority = useMemo(() => analyzeByPriority(pages), [pages]);
  const byDecision = useMemo(() => analyzeByDecision(pages), [pages]);
  const globalInsights = useMemo(() => generateGlobalInsights(pages), [pages]);
  const costAnalysis = useMemo(() => computeCostAnalysis(pages), [pages]);
  const writerNames = useMemo(() =>
    byWriter.map((w) => w.key).sort(), [byWriter]);

  return {
    byWriter, byAgency, byType, byMethod,
    byBudgetRange, byPriority, byDecision,
    globalInsights, costAnalysis, writerNames,
  };
}
