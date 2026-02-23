"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { QUOTE_STATUS_LABELS, QUOTE_STATUS_COLORS } from "@/lib/negotiation/constants";
import type { QuoteScenario } from "@/lib/negotiation/types";

interface ScenarioComparisonProps {
  scenarios: QuoteScenario[];
  onExport?: () => void;
}

/**
 * 多方案對比表元件
 * 並排顯示多個議價方案，支援 CSV 匯出
 */
export function ScenarioComparison({ scenarios, onExport }: ScenarioComparisonProps) {
  if (!scenarios || scenarios.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>方案對比</CardTitle>
          <CardDescription>無可用方案</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const handleExportCSV = () => {
    // CSV 表頭
    const headers = ["方案名稱", "報價金額", "利潤", "利潤率", "狀態"];
    const rows = scenarios.map((s) => [
      s.name,
      s.quoteAmount.toString(),
      s.profitAmount.toString(),
      (s.profitRate * 100).toFixed(1),
      QUOTE_STATUS_LABELS[s.status],
    ]);

    // 組合 CSV
    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    // 下載
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "negotiation-scenarios.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onExport?.();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>方案對比</CardTitle>
            <CardDescription>{scenarios.length} 個方案</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            匯出 CSV
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-3 font-semibold">方案名稱</th>
                <th className="text-right py-2 px-3 font-semibold">報價金額</th>
                <th className="text-right py-2 px-3 font-semibold">利潤</th>
                <th className="text-right py-2 px-3 font-semibold">利潤率</th>
                <th className="text-center py-2 px-3 font-semibold">狀態</th>
              </tr>
            </thead>
            <tbody>
              {scenarios.map((scenario, idx) => {
                const statusLabel = QUOTE_STATUS_LABELS[scenario.status];
                const statusColor = QUOTE_STATUS_COLORS[scenario.status];

                return (
                  <tr key={`scenario-${idx}`} className="border-b hover:bg-muted/50 transition">
                    <td className="py-3 px-3 font-medium">{scenario.name}</td>
                    <td className="py-3 px-3 text-right font-mono">
                      {scenario.quoteAmount.toLocaleString("zh-TW")}
                    </td>
                    <td className="py-3 px-3 text-right font-mono">
                      {scenario.profitAmount.toLocaleString("zh-TW")}
                    </td>
                    <td className="py-3 px-3 text-right font-mono">
                      {(scenario.profitRate * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-3">
                      <div className={`inline-block px-2 py-1 rounded text-xs font-medium ${statusColor}`}>
                        {statusLabel}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
