"use client";

import type { FeasibilityResult } from "@/lib/quality-gate/types";
import { IssueList } from "./IssueList";

interface FeasibilityPanelProps {
  result: FeasibilityResult;
}

const VERDICT_STYLE: Record<string, string> = {
  "充裕": "text-green-600 dark:text-green-400",
  "合理": "text-blue-600 dark:text-blue-400",
  "緊繃": "text-yellow-600 dark:text-yellow-400",
  "超支": "text-red-600 dark:text-red-400",
};

export function FeasibilityPanel({ result }: FeasibilityPanelProps) {
  return (
    <div className="space-y-4">
      {/* 預算可行性 */}
      {result.budget && (
        <div className="rounded-lg border p-4">
          <h3 className="mb-3 font-semibold text-sm">預算可行性</h3>
          <div className="grid grid-cols-3 gap-4 mb-3">
            <div>
              <div className="text-xs text-muted-foreground">案件預算</div>
              <div className="font-bold">{formatCurrency(result.budget.totalBudget)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">估算成本</div>
              <div className="font-bold">{formatCurrency(result.budget.totalEstimate)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">判定</div>
              <div className={`font-bold ${VERDICT_STYLE[result.budget.verdict] ?? ""}`}>
                {result.budget.verdict}（餘裕 {result.budget.margin}%）
              </div>
            </div>
          </div>

          {/* 成本項目明細 */}
          {result.budget.estimatedCosts.length > 0 && (
            <div className="mt-3 border-t pt-3">
              <div className="text-xs font-medium text-muted-foreground mb-2">成本項目</div>
              <ul className="space-y-1">
                {result.budget.estimatedCosts.map((item, i) => (
                  <li key={i} className="flex items-center justify-between text-sm">
                    <span>
                      {item.description}
                      {item.source === "inferred" && (
                        <span className="ml-1 text-xs text-muted-foreground">(推估)</span>
                      )}
                    </span>
                    <span className="font-mono text-muted-foreground">
                      {formatCurrency(item.estimatedAmount)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 預算警告 */}
          {result.budget.warnings.length > 0 && (
            <div className="mt-3 border-t pt-3">
              {result.budget.warnings.map((w, i) => (
                <div key={i} className="text-sm text-yellow-600 dark:text-yellow-400">
                  ⚠️ {w}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 常識檢查 */}
      {result.commonSense.length > 0 && (
        <div className="rounded-lg border p-4">
          <h3 className="mb-3 font-semibold text-sm">常識檢查</h3>
          <ul className="space-y-2">
            {result.commonSense.map((flag, i) => (
              <li key={i} className="text-sm rounded-md bg-yellow-50 dark:bg-yellow-950/30 p-3">
                <div className="font-medium text-yellow-700 dark:text-yellow-400">
                  ⚠️ {flag.message}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  觸發文字：{flag.matchedText}
                </div>
              </li>
            ))}
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
          emptyMessage="實務檢驗未發現問題"
        />
      </div>
    </div>
  );
}

function formatCurrency(amount: number): string {
  return `NT$ ${amount.toLocaleString("zh-TW")}`;
}
