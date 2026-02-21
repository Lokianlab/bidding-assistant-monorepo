"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { QualityReport } from "@/lib/quality-gate/types";

interface GateSummaryProps {
  report: QualityReport;
}

interface GateCardData {
  label: string;
  score: number | null;
  subtitle: string;
  status: "pass" | "risk" | "fail" | "skip";
}

const STATUS_STYLE: Record<string, { badge: string; text: string }> = {
  pass: { badge: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300", text: "通過" },
  risk: { badge: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300", text: "有風險" },
  fail: { badge: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300", text: "不建議" },
  skip: { badge: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400", text: "跳過" },
};

function scoreToStatus(score: number): "pass" | "risk" | "fail" {
  if (score >= 70) return "pass";
  if (score >= 50) return "risk";
  return "fail";
}

function buildGateCards(report: QualityReport): GateCardData[] {
  const cards: GateCardData[] = [
    {
      label: "文字品質",
      score: report.gate0.score,
      subtitle: `${report.gate0.errorCount} 錯誤 / ${report.gate0.warningCount} 警告`,
      status: scoreToStatus(report.gate0.score),
    },
    {
      label: "事實查核",
      score: report.gate1.score,
      subtitle: `${report.gate1.verifiedCount} 已驗證 / ${report.gate1.unverifiedCount} 未驗證`,
      status: scoreToStatus(report.gate1.score),
    },
    {
      label: "需求對照",
      score: report.gate2?.score ?? null,
      subtitle: report.gate2
        ? `覆蓋率 ${report.gate2.matrix.coverageRate}%`
        : "未提供需求清單",
      status: report.gate2 ? scoreToStatus(report.gate2.score) : "skip",
    },
    {
      label: "實務檢驗",
      score: report.gate3.score,
      subtitle: report.gate3.budget
        ? `預算餘裕 ${report.gate3.budget.margin}%`
        : `${report.gate3.commonSense.length} 條常識提醒`,
      status: scoreToStatus(report.gate3.score),
    },
  ];
  return cards;
}

export function GateSummary({ report }: GateSummaryProps) {
  const cards = buildGateCards(report);

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((card) => {
        const style = STATUS_STYLE[card.status];
        return (
          <Card key={card.label}>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs text-muted-foreground font-normal">
                {card.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-2xl font-bold">
                {card.score !== null ? `${card.score}` : "—"}
              </div>
              <div className="text-xs text-muted-foreground mt-1">{card.subtitle}</div>
              <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full ${style.badge}`}>
                {style.text}
              </span>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
