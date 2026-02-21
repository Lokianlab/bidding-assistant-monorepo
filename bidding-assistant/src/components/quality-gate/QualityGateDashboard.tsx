"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { QualityReport } from "@/lib/quality-gate/types";
import { GateSummary } from "./GateSummary";
import { FactCheckPanel } from "./FactCheckPanel";
import { RequirementMatrixPanel } from "./RequirementMatrixPanel";
import { FeasibilityPanel } from "./FeasibilityPanel";
import { useState } from "react";

interface QualityGateDashboardProps {
  report: QualityReport;
}

const VERDICT_STYLE: Record<string, string> = {
  "通過": "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  "有風險": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  "不建議提交": "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

export function QualityGateDashboard({ report }: QualityGateDashboardProps) {
  const [tab, setTab] = useState("fact-check");

  return (
    <div className="space-y-6">
      {/* 四道閘門摘要 */}
      <GateSummary report={report} />

      {/* 總評 */}
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div>
          <div className="text-sm text-muted-foreground">總評</div>
          <div className="text-2xl font-bold">{report.overallScore} / 100</div>
        </div>
        <div className="text-right">
          <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${VERDICT_STYLE[report.verdict]}`}>
            {report.verdict}
          </span>
          {report.criticalIssues.length > 0 && (
            <div className="mt-1 text-xs text-muted-foreground">
              {report.criticalIssues.length} 個關鍵問題
            </div>
          )}
        </div>
      </div>

      {/* 關鍵問題 */}
      {report.criticalIssues.length > 0 && (
        <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20 p-4">
          <h3 className="font-semibold text-sm text-red-700 dark:text-red-400 mb-2">
            關鍵問題（必須處理）
          </h3>
          <ul className="space-y-1">
            {report.criticalIssues.map((issue, i) => (
              <li key={i} className="text-sm text-red-600 dark:text-red-400">
                {issue}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 詳細分頁 */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="fact-check">事實查核</TabsTrigger>
          <TabsTrigger value="requirement">需求矩陣</TabsTrigger>
          <TabsTrigger value="feasibility">實務檢驗</TabsTrigger>
        </TabsList>

        <TabsContent value="fact-check" className="mt-4">
          <FactCheckPanel result={report.gate1} />
        </TabsContent>

        <TabsContent value="requirement" className="mt-4">
          <RequirementMatrixPanel result={report.gate2} />
        </TabsContent>

        <TabsContent value="feasibility" className="mt-4">
          <FeasibilityPanel result={report.gate3} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
