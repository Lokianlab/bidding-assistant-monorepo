"use client";

import React from "react";
import { useNegotiation } from "@/lib/negotiation/useNegotiation";
import { QUOTE_STATUS_LABELS, QUOTE_STATUS_COLORS } from "@/lib/negotiation/constants";
import type { CostBase, NegotiationConfig } from "@/lib/negotiation/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export interface NegotiationPanelProps {
  costBase: CostBase | null;
  onSelectScenario?: (quoteAmount: number) => void;
  customConfig?: Partial<NegotiationConfig>;
  compact?: boolean;
}

export function NegotiationPanel({
  costBase,
  onSelectScenario,
  customConfig,
  compact = false,
}: NegotiationPanelProps) {
  const { analysis, scenarios, addScenario, removeScenario, clearScenarios } = useNegotiation(
    costBase,
    customConfig
  );

  const [newAmount, setNewAmount] = React.useState<string>("");

  if (!analysis) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>議價分析</CardTitle>
          <CardDescription>載入中或無可用成本資料</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const handleAddScenario = () => {
    const amount = parseInt(newAmount, 10);
    if (!isNaN(amount) && amount > 0) {
      addScenario(`讓步至 ${amount.toLocaleString("zh-TW")}`, amount);
      setNewAmount("");
    }
  };

  return (
    <Card className={compact ? "border-l-2" : ""}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>議價分析工具</CardTitle>
            <CardDescription>
              可讓步額度：{analysis.allowanceAmount.toLocaleString("zh-TW")} 元
            </CardDescription>
          </div>
          {!compact && (
            <div className="text-right text-sm">
              <div className="text-muted-foreground">預案報價</div>
              <div className="text-lg font-bold">
                {analysis.proposed.quoteAmount.toLocaleString("zh-TW")}
              </div>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 四個標準方案 */}
        <div className="grid gap-3 md:grid-cols-2">
          {[analysis.costBased, analysis.proposed, analysis.target, analysis.ceiling].map(
            (scenario) => (
              <ScenarioQuickView
                key={scenario.name}
                scenario={scenario}
                onClick={() => onSelectScenario?.(scenario.quoteAmount)}
              />
            )
          )}
        </div>

        {/* 讓步模擬 */}
        <div className="border-t pt-4">
          <h3 className="text-sm font-semibold mb-3">讓步模擬</h3>
          <div className="flex gap-2 mb-3">
            <Input
              type="number"
              placeholder="輸入報價金額"
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && handleAddScenario()}
            />
            <Button onClick={handleAddScenario} size="sm">
              新增方案
            </Button>
          </div>

          {/* 自訂方案列表 */}
          {scenarios.slice(4).length > 0 && (
            <div className="space-y-2 mb-3 bg-muted p-2 rounded">
              {scenarios.slice(4).map((scenario, idx) => (
                <div key={`scenario-${idx}`} className="flex items-center justify-between text-sm">
                  <div>
                    <div className="font-medium">{scenario.name}</div>
                    <div className="text-muted-foreground">
                      {scenario.quoteAmount.toLocaleString("zh-TW")} 元 ({(scenario.profitRate * 100).toFixed(1)}%)
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeScenario(4 + idx)}
                  >
                    移除
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={clearScenarios} className="w-full">
                清除所有
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/** 場景快速檢視卡片 */
import type { QuoteScenario } from "@/lib/negotiation/types";

function ScenarioQuickView({
  scenario,
  onClick,
}: {
  scenario: QuoteScenario;
  onClick?: () => void;
}) {
  const statusLabel = QUOTE_STATUS_LABELS[scenario.status];
  const statusColor = QUOTE_STATUS_COLORS[scenario.status];

  return (
    <div
      onClick={onClick}
      className={`p-3 rounded border cursor-pointer hover:bg-accent transition ${statusColor}`}
    >
      <div className="font-semibold text-sm mb-1">{scenario.name}</div>
      <div className="text-xs text-muted-foreground mb-2">{statusLabel}</div>
      <div className="font-mono font-bold text-sm">
        {scenario.quoteAmount.toLocaleString("zh-TW")}
      </div>
      <div className="text-xs mt-1">
        利潤: {scenario.profitAmount.toLocaleString("zh-TW")} ({(scenario.profitRate * 100).toFixed(1)}%)
      </div>
    </div>
  );
}
