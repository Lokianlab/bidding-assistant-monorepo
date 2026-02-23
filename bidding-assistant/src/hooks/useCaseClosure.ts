// M11 結案飛輪 Hook

import { useState, useCallback } from 'react';
import { CaseClosureRequest, CaseClosureResponse } from '@/lib/closure/types';

export interface UseCaseClosureReturn {
  loading: boolean;
  error: string | null;
  closure: CaseClosureResponse | null;
  submitClosure: (caseId: string, data: CaseClosureRequest) => Promise<void>;
  getClosure: (caseId: string) => Promise<void>;
  resetError: () => void;
}

export function useCaseClosure(): UseCaseClosureReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [closure, setClosure] = useState<CaseClosureResponse | null>(null);

  const submitClosure = useCallback(async (caseId: string, data: CaseClosureRequest) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/cases/${caseId}/closure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('案件結案失敗');
      }

      const result = await response.json();
      setClosure(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '結案過程中發生錯誤');
    } finally {
      setLoading(false);
    }
  }, []);

  const getClosure = useCallback(async (caseId: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/cases/${caseId}/closure`);

      if (!response.ok) {
        throw new Error('查詢失敗');
      }

      const result = await response.json();
      setClosure(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '查詢結案記錄失敗');
    } finally {
      setLoading(false);
    }
  }, []);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  return {
    loading,
    error,
    closure,
    submitClosure,
    getClosure,
    resetError,
  };
}
