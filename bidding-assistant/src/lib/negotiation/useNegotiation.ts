"use client";

import { useMemo, useState } from "react";
import type { CostBase, NegotiationConfig, NegotiationAnalysis, QuoteScenario } from "./types";
import { analyzeNegotiation, simulateMultiple } from "./helpers";
import { useSettings } from "@/lib/context/settings-context";

/** 議價分析 Hook */
export function useNegotiation(
  costBase: CostBase | null,
  customConfig?: Partial<NegotiationConfig>
): {
  analysis: NegotiationAnalysis | null;
  isLoading: boolean;
  scenarios: QuoteScenario[];
  addScenario: (name: string, amount: number) => void;
  removeScenario: (index: number) => void;
  clearScenarios: () => void;
} {
  const { settings } = useSettings();
  const [customScenarios, setCustomScenarios] = useState<QuoteScenario[]>([]);

  // 合並設定：用戶自訂 > 應用設定 > 預設值
  const config: NegotiationConfig = useMemo(() => {
    const defaultConfig = {
      minMargin: 0.05,
      expectedMargin: 0.15,
      idealMargin: 0.2,
      maxMargin: 0.3,
    };

    const appConfig = settings?.modules?.negotiation || defaultConfig;

    return {
      ...appConfig,
      ...customConfig,
    };
  }, [settings, customConfig]);

  // 主分析結果（底線、預案、目標、天花板）
  const analysis = useMemo(() => {
    if (!costBase) return null;
    return analyzeNegotiation(costBase, config);
  }, [costBase, config]);

  // 合併標準方案和自訂方案
  const scenarios = useMemo(() => {
    if (!analysis) return [];
    return [...[analysis.costBased, analysis.proposed, analysis.target, analysis.ceiling], ...customScenarios];
  }, [analysis, customScenarios]);

  // 新增自訂方案
  const addScenario = (name: string, amount: number) => {
    if (!costBase || !analysis) return;

    const newScenario = {
      name,
      quoteAmount: Math.max(0, amount),
      profitAmount: Math.max(0, amount - costBase.subtotal),
      profitRate: costBase.subtotal > 0 ? (amount - costBase.subtotal) / costBase.subtotal : 0,
      status: (["safe", "warning", "danger", "dream"] as const)[
        Math.floor(Math.random() * 4)
      ], // 暫用，實際由 simulateCompromise 計算
    };

    // 避免重複
    const exists = customScenarios.some((s) => s.quoteAmount === newScenario.quoteAmount);
    if (!exists) {
      setCustomScenarios((prev) => [...prev, newScenario]);
    }
  };

  // 移除自訂方案
  const removeScenario = (index: number) => {
    // scenarios = [底線, 預案, 目標, 天花板, ...customScenarios]
    // 因此 customScenarios 的 index = scenarios 的 index - 4
    const customIndex = index - 4;
    if (customIndex >= 0) {
      setCustomScenarios((prev) => prev.filter((_, i) => i !== customIndex));
    }
  };

  // 清除所有自訂方案
  const clearScenarios = () => {
    setCustomScenarios([]);
  };

  return {
    analysis,
    isLoading: costBase === null,
    scenarios,
    addScenario,
    removeScenario,
    clearScenarios,
  };
}
