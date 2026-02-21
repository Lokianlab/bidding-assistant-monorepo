"use client";

// ====== M03 適配度雷達圖 ======

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { FitScore } from "@/lib/strategy/types";

interface FitScoreRadarProps {
  fitScore: FitScore;
}

const DIM_LABELS: Record<string, string> = {
  domain: "領域匹配",
  agency: "機關熟悉度",
  competition: "競爭環境",
  scale: "規模適合度",
  team: "團隊可用性",
};

const CONFIDENCE_COLOR: Record<string, string> = {
  高: "text-green-600",
  中: "text-yellow-600",
  低: "text-red-500",
};

export function FitScoreRadar({ fitScore }: FitScoreRadarProps) {
  const radarData = Object.entries(fitScore.dimensions).map(([key, dim]) => ({
    subject: DIM_LABELS[key] ?? key,
    score: dim.score,
    fullMark: 20,
  }));

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={260}>
        <RadarChart data={radarData}>
          <PolarGrid />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }}
          />
          <Radar
            name="適配度"
            dataKey="score"
            stroke="hsl(var(--primary))"
            fill="hsl(var(--primary))"
            fillOpacity={0.3}
          />
          <Tooltip
            formatter={(value) => [`${value} 分`, "得分"]}
          />
        </RadarChart>
      </ResponsiveContainer>

      {/* 各維度明細 */}
      <div className="mt-4 space-y-2">
        {Object.entries(fitScore.dimensions).map(([key, dim]) => (
          <div key={key} className="flex items-start gap-3 text-sm">
            <div className="w-20 shrink-0 text-muted-foreground">
              {DIM_LABELS[key]}
            </div>
            <div className="w-12 shrink-0 text-right font-mono font-medium">
              {dim.score}
              <span className="text-muted-foreground">/20</span>
            </div>
            <span className={`shrink-0 text-xs ${CONFIDENCE_COLOR[dim.confidence]}`}>
              [{dim.confidence}]
            </span>
            <div className="text-muted-foreground text-xs">{dim.evidence}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
