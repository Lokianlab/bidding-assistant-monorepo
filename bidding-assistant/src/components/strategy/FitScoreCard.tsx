"use client";

// ====== M03 適配度評分卡片 ======

import { FitScoreRadar } from "./FitScoreRadar";
import type { FitScore, KBMatchResult } from "@/lib/strategy/types";

interface FitScoreCardProps {
  fitScore: FitScore;
  kbMatch?: KBMatchResult | null;
}

const VERDICT_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  建議投標: { bg: "bg-green-50 border-green-200", text: "text-green-700", label: "✅ 建議投標" },
  值得評估: { bg: "bg-yellow-50 border-yellow-200", text: "text-yellow-700", label: "⚠️ 值得評估" },
  不建議: { bg: "bg-red-50 border-red-200", text: "text-red-700", label: "❌ 不建議投標" },
  資料不足: { bg: "bg-gray-50 border-gray-200", text: "text-gray-600", label: "❓ 資料不足" },
};

export function FitScoreCard({ fitScore, kbMatch }: FitScoreCardProps) {
  const verdict = VERDICT_STYLE[fitScore.verdict] ?? VERDICT_STYLE["資料不足"];

  return (
    <div className="space-y-6">
      {/* 總分 + 判定 */}
      <div className={`rounded-lg border p-4 ${verdict.bg}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className={`text-4xl font-bold ${verdict.text}`}>
              {fitScore.total}
              <span className="text-lg font-normal text-muted-foreground"> / 100</span>
            </div>
            <div className={`mt-1 text-lg font-semibold ${verdict.text}`}>
              {verdict.label}
            </div>
          </div>
        </div>

        {/* 判斷理由 */}
        {fitScore.reasons.length > 0 && (
          <ul className="mt-3 space-y-1">
            {fitScore.reasons.map((r, i) => (
              <li key={i} className="text-sm text-muted-foreground">
                • {r}
              </li>
            ))}
          </ul>
        )}

        {/* 紅旗 */}
        {fitScore.redFlags.length > 0 && (
          <div className="mt-3 rounded border border-red-300 bg-red-50 p-2">
            <p className="text-xs font-semibold text-red-700">⚠️ 注意事項</p>
            {fitScore.redFlags.map((flag, i) => (
              <p key={i} className="text-xs text-red-600">
                {flag}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* 雷達圖 + 維度明細 */}
      <div className="rounded-lg border p-4">
        <h3 className="mb-4 font-semibold">五維分析</h3>
        <FitScoreRadar fitScore={fitScore} />
      </div>

      {/* 知識庫匹配 */}
      {kbMatch && (
        <div className="rounded-lg border p-4">
          <h3 className="mb-3 font-semibold">知識庫相關條目</h3>
          <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-3 lg:grid-cols-5">
            <KBMatchSummary label="實績" items={kbMatch.portfolio} />
            <KBMatchSummary label="團隊" items={kbMatch.team} />
            <KBMatchSummary label="範本" items={kbMatch.templates} />
            <KBMatchSummary label="風險 SOP" items={kbMatch.risks} />
            <KBMatchSummary label="案後檢討" items={kbMatch.reviews} />
          </div>
        </div>
      )}
    </div>
  );
}

function KBMatchSummary({
  label,
  items,
}: {
  label: string;
  items: { entry: { id: string }; relevance: string }[];
}) {
  return (
    <div>
      <p className="font-medium text-muted-foreground">{label}</p>
      {items.length === 0 ? (
        <p className="text-muted-foreground/60">無相關</p>
      ) : (
        <ul className="mt-1 space-y-1">
          {items.map(({ entry, relevance }) => (
            <li key={entry.id} title={relevance} className="truncate text-xs">
              {entry.id}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
