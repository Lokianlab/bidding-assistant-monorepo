"use client";

import type { AnalyticsTotals } from "@/lib/dashboard/useAnalyticsMetrics";

interface StatusInsightsProps {
  breakdown: { name: string; value: number }[];
  totals: AnalyticsTotals;
  monthCount: number;
}

export function StatusInsights({ breakdown, totals, monthCount }: StatusInsightsProps) {
  if (breakdown.length === 0) return null;

  const total = breakdown.reduce((a, b) => a + b.value, 0);
  const wonCount = breakdown.find((s) => s.name === "得標")?.value ?? 0;
  const lostCount = breakdown.find((s) => s.name === "未獲青睞")?.value ?? 0;
  const cancelCount = breakdown.find((s) => s.name === "流標/廢標")?.value ?? 0;
  const disqualCount = breakdown.find((s) => s.name === "資格不符")?.value ?? 0;
  const notJoinCount = breakdown.find((s) => s.name === "領標後未參與")?.value ?? 0;
  const activeCount = (breakdown.find((s) => s.name === "已投標")?.value ?? 0)
    + (breakdown.find((s) => s.name === "競標階段")?.value ?? 0)
    + (breakdown.find((s) => s.name === "已出席簡報")?.value ?? 0);

  const pct = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0;

  const insights: { icon: string; text: string; type: "info" | "warn" | "good" | "bad" }[] = [];

  insights.push({
    icon: "📊",
    text: `共 ${total} 件案件，得標 ${wonCount} 件（${pct(wonCount)}%），尚有 ${activeCount} 件進行中。`,
    type: "info",
  });

  if (totals.winRate >= 50) {
    insights.push({ icon: "🎯", text: `得標率 ${totals.winRate}%，表現優秀！繼續保持。`, type: "good" });
  } else if (totals.winRate >= 30) {
    insights.push({ icon: "💡", text: `得標率 ${totals.winRate}%，屬正常範圍。可檢討未獲青睞案件以尋求突破。`, type: "info" });
  } else if (total > 0) {
    insights.push({ icon: "⚠️", text: `得標率僅 ${totals.winRate}%，建議深入檢討投標策略與企劃品質。`, type: "warn" });
  }

  if (lostCount > 0 && pct(lostCount) >= 30) {
    insights.push({
      icon: "🔍",
      text: `「未獲青睞」佔 ${pct(lostCount)}%（${lostCount} 件），為最大失敗原因。建議檢視簡報表現、價格策略或技術建議書品質。`,
      type: "bad",
    });
  }

  if (disqualCount > 0) {
    insights.push({
      icon: "📋",
      text: `「資格不符」有 ${disqualCount} 件（${pct(disqualCount)}%）。建議投標前加強資格文件確認流程。`,
      type: "warn",
    });
  }

  if (notJoinCount > 0 && pct(notJoinCount) >= 10) {
    insights.push({
      icon: "🚧",
      text: `「領標後未參與」有 ${notJoinCount} 件（${pct(notJoinCount)}%），投入成本但無產出。建議加強標案篩選機制。`,
      type: "warn",
    });
  }

  if (cancelCount > 0) {
    insights.push({
      icon: "📌",
      text: `「流標/廢標」有 ${cancelCount} 件（${pct(cancelCount)}%），此非企業可控因素，但需追蹤後續重新招標機會。`,
      type: "info",
    });
  }

  if (monthCount > 0) {
    const avgPerMonth = Math.round((total / monthCount) * 10) / 10;
    if (avgPerMonth <= 2) {
      insights.push({
        icon: "⚠️",
        text: `月均投標僅 ${avgPerMonth} 件，投標量偏低。建議拓展標案資訊來源，增加投標機會。`,
        type: "warn",
      });
    } else if (avgPerMonth <= 5) {
      insights.push({
        icon: "💡",
        text: `月均投標 ${avgPerMonth} 件，尚有提升空間。可考慮擴大領域或合作對象以增加案量。`,
        type: "info",
      });
    }
  }

  const typeColors = {
    info: "bg-blue-50 border-blue-200 text-blue-800",
    warn: "bg-amber-50 border-amber-200 text-amber-800",
    good: "bg-emerald-50 border-emerald-200 text-emerald-800",
    bad: "bg-rose-50 border-rose-200 text-rose-800",
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground mb-1">📝 自動分析洞見</p>
      {insights.map((item, i) => (
        <div key={i} className={`flex items-start gap-2 p-2 rounded-md border text-xs leading-relaxed ${typeColors[item.type]}`}>
          <span className="shrink-0 mt-0.5">{item.icon}</span>
          <span>{item.text}</span>
        </div>
      ))}
    </div>
  );
}
