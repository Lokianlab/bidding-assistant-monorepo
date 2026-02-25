"use client";

import React from "react";
import { useNegotiation } from "@/lib/negotiation/useNegotiation";
import { useSettings } from "@/lib/context/settings-context";
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
  const { settings } = useSettings();
  const taxRate = settings?.modules?.pricing?.taxRate ?? 0.05;
  const managementFeeRate = settings?.modules?.pricing?.managementFeeRate ?? 0.1;

  // 直接成本輸入（預設帶入預算反推值，用戶可修改）
  const [directCostStr, setDirectCostStr] = React.useState<string>("");

  // 當 costBase 第一次有值時帶入預設值
  React.useEffect(() => {
    if (costBase && !directCostStr) {
      setDirectCostStr(String(costBase.directCost));
    }
  }, [costBase, directCostStr]);

  // 根據用戶輸入的直接成本重建 costBase
  const effectiveCostBase = React.useMemo<CostBase | null>(() => {
    const dc = parseInt(directCostStr, 10);
    if (isNaN(dc) || dc <= 0) return null;
    const managementFee = Math.round(dc * managementFeeRate);
    const tax = Math.round((dc + managementFee) * taxRate);
    return {
      directCost: dc,
      managementFee,
      tax,
      subtotal: dc + managementFee + tax,
    };
  }, [directCostStr, taxRate, managementFeeRate]);

  const { analysis, scenarios, addScenario, removeScenario, clearScenarios } = useNegotiation(
    effectiveCostBase,
    customConfig
  );

  const [newAmount, setNewAmount] = React.useState<string>("");

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
            {analysis && (
              <CardDescription>
                可讓步額度：{analysis.allowanceAmount.toLocaleString("zh-TW")} 元
              </CardDescription>
            )}
          </div>
          {!compact && analysis && (
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
        {/* 成本輸入 */}
        <div className="border rounded-lg p-3 space-y-2 -mt-2">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium whitespace-nowrap">直接成本</label>
            <Input
              type="number"
              value={directCostStr}
              onChange={(e) => setDirectCostStr(e.target.value)}
              className="flex-1 h-7 text-sm"
              placeholder="輸入你估算的直接成本..."
            />
            <span className="text-xs text-muted-foreground whitespace-nowrap">元</span>
            {costBase && directCostStr !== String(costBase.directCost) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px] shrink-0"
                onClick={() => setDirectCostStr(String(costBase.directCost))}
              >
                重設
              </Button>
            )}
          </div>

          {effectiveCostBase && (
            <div className="grid grid-cols-4 gap-1 text-[10px]">
              <div className="text-muted-foreground">
                直接成本<br />
                <span className="font-medium text-foreground">{effectiveCostBase.directCost.toLocaleString()}</span>
              </div>
              <div className="text-muted-foreground">
                管理費 {(managementFeeRate * 100).toFixed(0)}%<br />
                <span className="font-medium text-foreground">{effectiveCostBase.managementFee.toLocaleString()}</span>
              </div>
              <div className="text-muted-foreground">
                稅 {(taxRate * 100).toFixed(0)}%<br />
                <span className="font-medium text-foreground">{effectiveCostBase.tax.toLocaleString()}</span>
              </div>
              <div className="text-muted-foreground">
                總成本<br />
                <span className="font-bold text-foreground">{effectiveCostBase.subtotal.toLocaleString()}</span>
              </div>
            </div>
          )}

          {costBase && (
            <p className="text-[10px] text-muted-foreground">
              預算反推值：{costBase.directCost.toLocaleString()} 元。可改為你實際估算的成本。
            </p>
          )}
        </div>

        {!analysis ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            請輸入直接成本以計算報價方案
          </p>
        ) : (
          <>

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
          <h3 className="text-sm font-semibold mb-1">讓步模擬</h3>
          <p className="text-xs text-muted-foreground mb-3">
            議價時對方要求降價，輸入對方提出的金額，查看此報價下的利潤是否還在可接受範圍。
          </p>
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
        </>
        )}
      </CardContent>
    </Card>
  );
}

const SCENARIO_DESCRIPTIONS: Record<string, string> = {
  底線: "最低能接受的報價。再低就侵蝕成本，不建議讓步至此以下。",
  預案: "正常情況下計劃報出的金額，兼顧競爭力與利潤。",
  目標: "理想報價，市場競爭不激烈時的首選。",
  天花板: "最樂觀估計，預算充裕或獨家優勢時才報。",
};

/** 場景快速檢視卡片 */
function ScenarioQuickView({
  scenario,
  onClick,
}: {
  scenario: { name: string; status: 'safe' | 'warning' | 'danger' | 'dream'; quoteAmount: number; profitAmount: number; profitRate: number };
  onClick?: () => void;
}) {
  const statusLabel = QUOTE_STATUS_LABELS[scenario.status];
  const statusColor = QUOTE_STATUS_COLORS[scenario.status];
  const desc = SCENARIO_DESCRIPTIONS[scenario.name];

  return (
    <div
      onClick={onClick}
      className={`p-3 rounded border cursor-pointer hover:bg-accent transition ${statusColor}`}
    >
      <div className="font-semibold text-sm mb-0.5">{scenario.name}</div>
      {desc && <div className="text-[10px] text-muted-foreground mb-1 leading-snug">{desc}</div>}
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
