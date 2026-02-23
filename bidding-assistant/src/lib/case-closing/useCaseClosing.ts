/**
 * M11 結案飛輪 - useCaseClosing Hook
 *
 * 管理結案流程的完整狀態：摘要生成、評分、寫入 KB、完成結案
 */

"use client";

import { useState, useCallback, useEffect } from "react";
import { logger } from "@/lib/logger";
import type {
  CaseSummary,
  CaseAssessment,
  AggregateScore,
  UseCaseClosingReturn,
} from "./types";
import {
  calculateAggregateScore,
  validateScores,
  validateCaseSummary,
  createCaseLearning,
} from "./helpers";

const CLOSING_STORAGE_KEY = "case-closing-data";

/**
 * Hook 初始化狀態
 */
function getInitialState() {
  return {
    summary: null as CaseSummary | null,
    assessment: null as CaseAssessment | null,
    aggregateScore: null as AggregateScore | null,
    savedKBItemId: null as string | null,
    isLoading: false,
    isGenerating: false,
    isSaving: false,
    error: null as string | null,
  };
}

/**
 * useCaseClosing Hook
 * 管理整個結案流程
 */
export function useCaseClosing(): UseCaseClosingReturn {
  const [state, setState] = useState(getInitialState());
  const [hydrated, setHydrated] = useState(false);

  // Hydration 檢查
  useEffect(() => {
    setHydrated(true);
    // 嘗試從 localStorage 復原之前的狀態
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(CLOSING_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          setState((prev) => ({ ...prev, ...parsed }));
        }
      } catch (err) {
        logger.warn("system", "結案資料復原失敗", String(err));
      }
    }
  }, []);

  // 當狀態改變時自動保存到 localStorage（只在有資料時保存）
  useEffect(() => {
    if (!hydrated) return;
    try {
      // 只有在有摘要或評分時才保存，避免保存空狀態
      if (state.summary || state.assessment) {
        localStorage.setItem(CLOSING_STORAGE_KEY, JSON.stringify(state));
      } else {
        // 如果沒有資料，清空 localStorage
        localStorage.removeItem(CLOSING_STORAGE_KEY);
      }
    } catch (err) {
      logger.warn("system", "結案資料保存失敗", String(err));
    }
  }, [state, hydrated]);

  /**
   * 生成結案摘要（調用 AI API）
   */
  const generateSummary = useCallback(async (caseId: string, caseName: string) => {
    setState((prev) => ({ ...prev, isGenerating: true, error: null }));

    try {
      const response = await fetch("/api/cases/close/generate-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ case_id: caseId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "摘要生成失敗");
      }

      const data = await response.json();

      const summary: CaseSummary = {
        caseId,
        caseName,
        sections: {
          whatWeDid: data.what_we_did || "",
          whatWeLearned: data.what_we_learned || "",
          nextTimeNotes: data.next_time_notes || "",
        },
        suggestedTags: data.suggested_tags || [],
      };

      if (!validateCaseSummary(summary)) {
        throw new Error("生成的摘要內容不完整");
      }

      setState((prev) => ({
        ...prev,
        summary,
        isGenerating: false,
        error: null,
      }));

      logger.info("system", "結案摘要生成成功", JSON.stringify({ caseId }));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "未知錯誤";
      setState((prev) => ({
        ...prev,
        isGenerating: false,
        error: errorMsg,
      }));
      logger.error("system", "結案摘要生成失敗", errorMsg);
    }
  }, []);

  /**
   * 更新評分與標籤
   */
  const updateAssessment = useCallback((updates: Partial<CaseAssessment>) => {
    setState((prev) => {
      const newAssessment = {
        ...(prev.assessment || {
          strategyScore: 5,
          executionScore: 5,
          satisfactionScore: 5,
          tags: [],
        }),
        ...updates,
      } as CaseAssessment;

      // 驗證評分
      if (!validateScores(newAssessment)) {
        logger.warn("system", "評分超出有效範圍");
        return prev;
      }

      // 重新計算聚合評分
      const aggregateScore = calculateAggregateScore(newAssessment);

      return {
        ...prev,
        assessment: newAssessment,
        aggregateScore,
      };
    });
  }, []);

  /**
   * 計算總評分
   */
  const calculateTotal = useCallback((): number => {
    if (!state.aggregateScore) return 0;
    return state.aggregateScore.total;
  }, [state.aggregateScore]);

  /**
   * 寫入知識庫
   */
  const saveToKB = useCallback(async (): Promise<string> => {
    if (!state.summary || !state.assessment) {
      throw new Error("摘要或評分未完成");
    }

    setState((prev) => ({ ...prev, isSaving: true, error: null }));

    try {
      // 創建結案學習記錄（準備寫入 DB）
      const learning = createCaseLearning(state.summary, state.assessment, state.assessment.tags);

      // 呼叫寫入 KB 的 API
      const response = await fetch(
        `/api/cases/${state.summary.caseId}/close/write-to-kb`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: learning.title,
            content: [learning.whatWeDid, learning.whatWeLearned, learning.nextTimeNotes]
              .filter(Boolean)
              .join("\n\n"),
            tags: state.assessment.tags,
            metadata: {
              strategyScore: learning.strategyScore,
              executionScore: learning.executionScore,
              satisfactionScore: learning.satisfactionScore,
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "知識庫寫入失敗");
      }

      const data = await response.json();
      const kbItemId = data.kb_item_id;

      setState((prev) => ({
        ...prev,
        savedKBItemId: kbItemId,
        isSaving: false,
        error: null,
      }));

      logger.info("system", "結案摘要已寫入知識庫", JSON.stringify({ kbItemId }));
      return kbItemId;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "未知錯誤";
      setState((prev) => ({
        ...prev,
        isSaving: false,
        error: errorMsg,
      }));
      logger.error("system", "知識庫寫入失敗", errorMsg);
      throw err;
    }
  }, [state.summary, state.assessment]);

  /**
   * 完成結案
   */
  const complete = useCallback(async () => {
    if (!state.summary) {
      throw new Error("尚未生成摘要");
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // 如果還沒寫入 KB，先寫入
      if (!state.savedKBItemId) {
        await saveToKB();
      }

      // 更新案件狀態為「已結案」
      const response = await fetch(
        `/api/cases/${state.summary.caseId}/close/complete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "結案完成失敗");
      }

      // 重設狀態（useEffect 會自動清空 localStorage）
      setState(getInitialState());
      logger.info("system", "案件結案成功", JSON.stringify({ caseId: state.summary.caseId }));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "未知錯誤";
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMsg,
      }));
      logger.error("system", "結案完成失敗", errorMsg);
      throw err;
    }
  }, [state.summary, state.savedKBItemId, saveToKB]);

  return {
    // 資料
    summary: state.summary,
    assessment: state.assessment,
    aggregateScore: state.aggregateScore,
    savedKBItemId: state.savedKBItemId,

    // 狀態
    isLoading: state.isLoading,
    isGenerating: state.isGenerating,
    isSaving: state.isSaving,
    error: state.error,

    // 操作
    generateSummary,
    updateAssessment,
    saveToKB,
    complete,

    // 工具函式
    calculateTotal,
  };
}
