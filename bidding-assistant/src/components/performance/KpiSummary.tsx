"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { AnalyticsTotals } from "@/lib/dashboard/useAnalyticsMetrics";
import { fmt } from "@/lib/dashboard/helpers";

interface KpiSummaryProps {
  totals: AnalyticsTotals;
}

export function KpiSummary({ totals }: KpiSummaryProps) {
  const cards = [
    { value: String(totals.submitted), label: "投標件數", color: "" },
    { value: String(totals.won), label: "得標件數", color: "text-emerald-600" },
    { value: `${totals.winRate}%`, label: "得標率", color: "text-amber-600" },
    { value: `$${fmt(totals.wonBudget)}`, label: "得標金額", color: "text-emerald-600", large: true },
    { value: `$${fmt(totals.totalCostAmount)}`, label: "投入成本", color: "", large: true },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 sm:gap-4 mb-4 sm:mb-6">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardContent className="pt-4 sm:pt-6 pb-4">
            <div className={`${c.large ? "text-lg sm:text-xl" : "text-xl sm:text-2xl"} font-bold ${c.color} ${c.large ? "truncate" : ""}`}>
              {c.value}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">{c.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
