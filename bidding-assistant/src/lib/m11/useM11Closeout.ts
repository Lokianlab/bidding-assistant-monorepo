// M11 結案飛輪 - Hook

'use client';

import { useState, useCallback } from 'react';
import type { CloseoutReport, SuccessPattern, KBBackflowEntry, PatternCategory } from './types';
import { identifyPatterns, filterByConfidence } from './successPatternMatcher';
import { buildKBEntry, validateCloseoutReport } from './helpers';

interface UseM11CloseoutOptions {
  caseId: string;
  onSuccess?: (report: CloseoutReport) => void;
  onError?: (error: Error) => void;
}

export function useM11Closeout(options: UseM11CloseoutOptions) {
  const { caseId, onSuccess, onError } = options;
  const [closeout, setCloseout] = useState<CloseoutReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 生成結案報告
   */
  const generateCloseout = useCallback(
    async (data: Partial<CloseoutReport>): Promise<CloseoutReport> => {
      setLoading(true);
      setError(null);

      try {
        // 驗證資料
        const validation = validateCloseoutReport(data);
        if (!validation.valid) {
          throw new Error(`資料驗證失敗: ${validation.errors.join(', ')}`);
        }

        // 構建完整報告
        const report: CloseoutReport = {
          id: `closeout-${caseId}-${Date.now()}`,
          caseId,
          title: data.title || '',
          sections: data.sections || {
            summary: '',
            achievements: [],
            challenges: [],
            financialSummary: {
              budget: 0,
              actual: 0,
              variance: 0,
              varianceStatus: 'on-track'
            },
            qualityScore: 0
          },
          successPatterns: data.successPatterns || [],
          createdAt: new Date()
        };

        setCloseout(report);
        onSuccess?.(report);

        return report;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('未知錯誤');
        setError(error.message);
        onError?.(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [caseId, onSuccess, onError]
  );

  /**
   * 識別成功模式
   */
  const identifySuccessPatterns = useCallback(
    async (scores: {
      performanceScore: number;
      budgetVariance: number;
      scheduleVariance: number;
    }): Promise<SuccessPattern[]> => {
      setLoading(true);
      setError(null);

      try {
        // 識別原始模式
        const allPatterns = identifyPatterns(scores);

        // 按置信度篩選
        const filtered = filterByConfidence(allPatterns);

        return filtered;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('未知錯誤');
        setError(error.message);
        onError?.(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [onError]
  );

  /**
   * 提交反思和模式回流
   */
  const submitReflection = useCallback(
    async (patterns: SuccessPattern[]): Promise<void> => {
      setLoading(true);
      setError(null);

      try {
        if (!closeout) {
          throw new Error('未找到結案報告');
        }

        // 更新結案報告中的模式
        const updated: CloseoutReport = {
          ...closeout,
          successPatterns: patterns
        };

        setCloseout(updated);
        onSuccess?.(updated);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('未知錯誤');
        setError(error.message);
        onError?.(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [closeout, onSuccess, onError]
  );

  /**
   * 將結案資料回流至知識庫
   */
  const kbBackflow = useCallback(
    async (entry: KBBackflowEntry): Promise<void> => {
      setLoading(true);
      setError(null);

      try {
        // 發送至 API
        const response = await fetch('/api/cases/closure/kb-backflow', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(entry)
        });

        if (!response.ok) {
          throw new Error(`API 錯誤: ${response.statusText}`);
        }

        const result = await response.json();
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('未知錯誤');
        setError(error.message);
        onError?.(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [onError]
  );

  /**
   * 完整工作流程：識別模式 → 提交反思 → 回流知識庫
   */
  const executeFullWorkflow = useCallback(
    async (scores: {
      performanceScore: number;
      budgetVariance: number;
      scheduleVariance: number;
    }): Promise<{ report: CloseoutReport; patterns: SuccessPattern[] }> => {
      setLoading(true);
      setError(null);

      try {
        // 1. 識別模式
        const patterns = await identifySuccessPatterns(scores);

        // 2. 更新結案報告（假設已有初始報告）
        if (!closeout) {
          throw new Error('未找到結案報告');
        }

        const updated: CloseoutReport = {
          ...closeout,
          successPatterns: patterns
        };

        // 3. 回流知識庫
        const entry = buildKBEntry(updated);
        await kbBackflow(entry);

        setCloseout(updated);
        onSuccess?.(updated);

        return { report: updated, patterns };
      } catch (err) {
        const error = err instanceof Error ? err : new Error('未知錯誤');
        setError(error.message);
        onError?.(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [closeout, identifySuccessPatterns, kbBackflow, onSuccess, onError]
  );

  return {
    closeout,
    loading,
    error,
    generateCloseout,
    identifySuccessPatterns,
    submitReflection,
    kbBackflow,
    executeFullWorkflow
  };
}
