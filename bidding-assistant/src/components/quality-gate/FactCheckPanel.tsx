"use client";

import type { FactCheckResult } from "@/lib/quality-gate/types";
import { IssueList } from "./IssueList";

interface FactCheckPanelProps {
  result: FactCheckResult;
}

const CONFIDENCE_STYLE: Record<string, { icon: string; label: string; className: string }> = {
  verified: { icon: "✅", label: "已驗證", className: "text-green-700 dark:text-green-400" },
  partial: { icon: "⚠️", label: "部分驗證", className: "text-yellow-700 dark:text-yellow-400" },
  unverified: { icon: "❌", label: "無依據", className: "text-red-700 dark:text-red-400" },
};

export function FactCheckPanel({ result }: FactCheckPanelProps) {
  return (
    <div className="space-y-4">
      {/* 統計摘要 */}
      <div className="grid grid-cols-4 gap-3">
        <StatBox label="已驗證" value={result.verifiedCount} className="text-green-600" />
        <StatBox label="部分驗證" value={result.partialCount} className="text-yellow-600" />
        <StatBox label="未驗證" value={result.unverifiedCount} className="text-red-600" />
        <StatBox label="幻覺嫌疑" value={result.hallucinationCount} className="text-red-600" />
      </div>

      {/* 來源標記清單 */}
      {result.annotations.length > 0 && (
        <div className="rounded-lg border p-4">
          <h3 className="mb-3 font-semibold text-sm">來源追溯</h3>
          <ul className="space-y-2">
            {result.annotations.map((ann, i) => {
              const style = CONFIDENCE_STYLE[ann.confidence];
              return (
                <li key={i} className="text-sm border-b pb-2 last:border-0">
                  <div className="flex items-start gap-2">
                    <span>{style.icon}</span>
                    <div className="flex-1">
                      <span className={style.className}>[{style.label}]</span>{" "}
                      <span className="text-foreground">{ann.claim}</span>
                      {ann.source && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          (來源: {ann.source.kbId}/{ann.source.entryId})
                        </span>
                      )}
                      {ann.hallucinations.length > 0 && (
                        <div className="mt-1 text-xs text-red-500">
                          {ann.hallucinations.map((h, j) => (
                            <div key={j}>{h.message}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* 問題清單 */}
      <div className="rounded-lg border p-4">
        <h3 className="mb-3 font-semibold text-sm">問題清單</h3>
        <IssueList
          issues={result.issues.map((i) => ({
            severity: i.severity,
            message: i.message,
            context: i.context,
          }))}
          emptyMessage="事實查核未發現問題"
        />
      </div>
    </div>
  );
}

function StatBox({ label, value, className }: { label: string; value: number; className: string }) {
  return (
    <div className="rounded-md border p-3 text-center">
      <div className={`text-xl font-bold ${className}`}>{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}
