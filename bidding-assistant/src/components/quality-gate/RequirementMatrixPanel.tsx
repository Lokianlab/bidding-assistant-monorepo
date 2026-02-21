"use client";

import type { RequirementTraceResult } from "@/lib/quality-gate/types";
import { IssueList } from "./IssueList";

interface RequirementMatrixPanelProps {
  result: RequirementTraceResult | null;
}

const STATUS_ICON: Record<string, string> = {
  covered: "✅",
  partial: "⚠️",
  missing: "❌",
};

const STATUS_LABEL: Record<string, string> = {
  covered: "已覆蓋",
  partial: "部分覆蓋",
  missing: "未覆蓋",
};

export function RequirementMatrixPanel({ result }: RequirementMatrixPanelProps) {
  if (!result) {
    return (
      <div className="rounded-lg border p-6 text-center">
        <p className="text-muted-foreground">
          未提供需求清單，閘門 2 已跳過。
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          需求清單由 L1 戰略分析產出，載入後即可進行需求覆蓋率檢查。
        </p>
      </div>
    );
  }

  const { matrix } = result;

  return (
    <div className="space-y-4">
      {/* 覆蓋率摘要 */}
      <div className="flex items-center gap-4 rounded-lg border p-4">
        <div className="text-3xl font-bold">
          {matrix.coverageRate}%
        </div>
        <div>
          <div className="font-semibold text-sm">需求覆蓋率</div>
          <div className="text-xs text-muted-foreground">
            {matrix.requirements.length} 項需求，{matrix.uncoveredCount} 項未覆蓋
          </div>
        </div>
      </div>

      {/* 追溯矩陣表 */}
      {matrix.requirements.length > 0 && (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium">需求</th>
                <th className="text-left p-3 font-medium w-20">權重</th>
                <th className="text-left p-3 font-medium w-24">狀態</th>
                <th className="text-left p-3 font-medium">覆蓋來源</th>
              </tr>
            </thead>
            <tbody>
              {matrix.requirements.map((req) => {
                const cov = matrix.coverage.find((c) => c.requirementId === req.id);
                const status = cov?.status ?? "missing";
                return (
                  <tr key={req.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-3">
                      <div className="font-medium">{req.id}</div>
                      <div className="text-xs text-muted-foreground">{req.description}</div>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {req.weight !== null ? `${req.weight}%` : "—"}
                    </td>
                    <td className="p-3">
                      <span className="whitespace-nowrap">
                        {STATUS_ICON[status]} {STATUS_LABEL[status]}
                      </span>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {cov?.coveredBy.length
                        ? cov.coveredBy.join("、")
                        : cov?.gap ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
          emptyMessage="需求追溯未發現問題"
        />
      </div>
    </div>
  );
}
