// ====== P0 巡標：編排 Hook ======
// 包裝 orchestrateAccept，讓 UI 層直接使用

"use client";

import { useState, useCallback } from "react";
import { useSettings } from "@/lib/context/settings-context";
import type { ScanResult } from "@/lib/scan/types";
import type { AcceptResult } from "./types";
import { orchestrateAccept } from "./orchestrator";
import { scanResultToPatrolItem } from "./bridge";

interface UsePatrolOrchestratorReturn {
  /** 是否正在執行建檔流程 */
  accepting: boolean;
  /** 最近一次建檔結果 */
  result: AcceptResult | null;
  /** 錯誤訊息（接口層失敗） */
  error: string | null;
  /** 執行一鍵上新 */
  accept: (scanResult: ScanResult) => Promise<AcceptResult | null>;
  /** 清除結果 */
  reset: () => void;
}

export function usePatrolOrchestrator(): UsePatrolOrchestratorReturn {
  const { settings } = useSettings();
  const [accepting, setAccepting] = useState(false);
  const [result, setResult] = useState<AcceptResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const accept = useCallback(
    async (scanResult: ScanResult): Promise<AcceptResult | null> => {
      const { token, databaseId } = settings.connections.notion;

      if (!token || !databaseId) {
        setError("請先在設定頁面填寫 Notion token 和 databaseId");
        return null;
      }

      setAccepting(true);
      setError(null);
      setResult(null);

      try {
        const patrolItem = scanResultToPatrolItem(scanResult);
        const config = {
          notionToken: token,
          notionDatabaseId: databaseId,
          // Drive OAuth 由伺服器端環境變數自動處理，前端不需傳認證資訊
        };

        const acceptResult = await orchestrateAccept(patrolItem, config);
        setResult(acceptResult);
        return acceptResult;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "建檔流程發生錯誤";
        setError(msg);
        return null;
      } finally {
        setAccepting(false);
      }
    },
    [settings.connections.notion],
  );

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { accepting, result, error, accept, reset };
}
