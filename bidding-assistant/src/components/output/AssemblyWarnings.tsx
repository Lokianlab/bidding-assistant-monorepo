"use client";

import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import type { AssemblyWarning } from "@/lib/output/types";
import type { QualityReport } from "@/lib/quality-gate/types";

interface AssemblyWarningsProps {
  warnings: AssemblyWarning[];
  qualityReport?: QualityReport | null;
}

/** 顯示組裝警告 + M04 品質閘門結果 */
export function AssemblyWarnings({ warnings, qualityReport }: AssemblyWarningsProps) {
  if (!warnings.length && !qualityReport) return null;

  return (
    <div className="space-y-1.5">
      {/* 組裝管線警告 */}
      {warnings.map((w, i) => (
        <div
          key={i}
          className="flex items-start gap-2 rounded-md border px-3 py-1.5 text-xs text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/30"
        >
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>{w.message}</span>
        </div>
      ))}

      {/* M04 品質閘門結果 */}
      {qualityReport && <QualityReportSummary report={qualityReport} />}
    </div>
  );
}

function QualityReportSummary({ report }: { report: QualityReport }) {
  const verdictColor =
    report.verdict === "通過"
      ? "text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-950/30"
      : report.verdict === "有風險"
        ? "text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/30"
        : "text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-950/30";

  const VerdictIcon =
    report.verdict === "通過"
      ? CheckCircle
      : report.verdict === "有風險"
        ? AlertTriangle
        : XCircle;

  return (
    <div className={`rounded-md border px-3 py-1.5 text-xs ${verdictColor}`}>
      <div className="flex items-center gap-2 font-medium">
        <VerdictIcon className="h-3.5 w-3.5 shrink-0" />
        <span>
          品質評分 {report.overallScore}／100 — {report.verdict}
        </span>
      </div>
      {report.criticalIssues.length > 0 && (
        <ul className="mt-1.5 space-y-0.5 pl-5 list-disc">
          {report.criticalIssues.map((issue, i) => (
            <li key={i}>{issue}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
