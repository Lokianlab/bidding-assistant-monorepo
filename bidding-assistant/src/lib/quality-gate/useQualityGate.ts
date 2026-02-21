"use client";

import { useState, useCallback } from "react";
import { useSettings } from "@/lib/context/settings-context";
import type { QualityScore, CheckResult } from "@/lib/quality/types";
import { calculateScore } from "@/lib/quality/score";
import { runChecks } from "@/lib/quality/rules";
import { checkFacts } from "./fact-check";
import { traceRequirements } from "./requirement-trace";
import { checkFeasibility } from "./feasibility";
import { buildQualityReport } from "./report";
import type {
  KBEntry,
  Requirement,
  CostItem,
  FeasibilityContext,
  QualityReport,
} from "./types";

export interface QualityGateInput {
  /** 要檢查的文字 */
  text: string;
  /** 知識庫條目（閘門 1 來源追溯用） */
  kbEntries?: KBEntry[];
  /** 需求清單（閘門 2 用，null = 跳過） */
  requirements?: Requirement[] | null;
  /** 成本項目（閘門 3 預算用） */
  costItems?: CostItem[];
  /** 案件背景（閘門 3 常識檢查用） */
  context?: FeasibilityContext;
}

export interface UseQualityGateReturn {
  /** 品質報告結果 */
  report: QualityReport | null;
  /** 是否正在分析 */
  isAnalyzing: boolean;
  /** 執行品質檢查 */
  analyze: (input: QualityGateInput) => void;
  /** 清除結果 */
  clear: () => void;
}

export function useQualityGate(): UseQualityGateReturn {
  const { settings } = useSettings();
  const [report, setReport] = useState<QualityReport | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const gateSettings = settings.qualityGate;

  const analyze = useCallback(
    (input: QualityGateInput) => {
      setIsAnalyzing(true);

      try {
        // 閘門 0：文字品質（現有模組）
        const gate0Issues: CheckResult[] = runChecks(input.text, {
          ...settings.modules.qualityRules,
          companyName: settings.company.name,
          companyBrand: settings.company.brand,
        });
        const gate0Score: QualityScore = calculateScore(gate0Issues);

        // 閘門 1：事實查核
        const gate1 = checkFacts(input.text, input.kbEntries ?? [], {
          unverifiedThreshold: gateSettings?.factCheckThreshold,
        });

        // 閘門 2：需求追溯
        const gate2 =
          gateSettings?.gates.requirementTrace !== false && input.requirements
            ? traceRequirements(input.text, input.requirements)
            : null;

        // 閘門 3：實務檢驗
        const gate3 = checkFeasibility(
          input.text,
          input.costItems ?? [],
          input.context ?? {},
          { marginMinPercent: gateSettings?.feasibilityMarginMin },
        );

        // 組裝品質報告
        const qualityReport = buildQualityReport(
          gate0Score,
          gate0Issues,
          gate1,
          gate2,
          gate3,
          {
            passThreshold: gateSettings?.overallPassThreshold,
            riskThreshold: gateSettings?.overallRiskThreshold,
          },
        );

        setReport(qualityReport);
      } finally {
        setIsAnalyzing(false);
      }
    },
    [settings, gateSettings],
  );

  const clear = useCallback(() => {
    setReport(null);
  }, []);

  return { report, isAnalyzing, analyze, clear };
}
