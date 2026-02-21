"use client";

// ====== M03 戰略分析引擎：適配度評分 Hook ======

import { useMemo } from "react";
import { useSettings } from "@/lib/context/settings-context";
import { calculateFitScore } from "./fit-scoring";
import { matchKB } from "./kb-matcher";
import { DEFAULT_FIT_WEIGHTS } from "./constants";
import type {
  FitScore,
  FitScoreInput,
  KBMatchResult,
  IntelligenceInputs,
} from "./types";
import type { KnowledgeBaseData } from "@/lib/knowledge-base/types";

export interface UseFitScoreResult {
  fitScore: FitScore | null;
  kbMatch: KBMatchResult | null;
}

/**
 * 計算投標適配度評分
 *
 * @param caseName 案件名稱（必填）
 * @param agency 機關名稱
 * @param budget 預算金額（null = 未知）
 * @param intelligence M01 情報資料（可為空）
 * @param kb 知識庫資料
 */
export function useFitScore(
  caseName: string,
  agency: string,
  budget: number | null,
  intelligence: IntelligenceInputs,
  kb: KnowledgeBaseData,
): UseFitScoreResult {
  const { settings } = useSettings();

  return useMemo(() => {
    if (!caseName.trim()) {
      return { fitScore: null, kbMatch: null };
    }

    const input: FitScoreInput = {
      caseName,
      agency,
      budget,
      intelligence,
      kb,
    };

    const weights = settings.strategy?.fitWeights ?? DEFAULT_FIT_WEIGHTS;

    return {
      fitScore: calculateFitScore(input, weights),
      kbMatch: matchKB(caseName, agency, kb),
    };
  }, [caseName, agency, budget, intelligence, kb, settings.strategy?.fitWeights]);
}
