// ====== 情報模組純函式 ======

import type { AgencyCase, TopWinner, WinCheck, TrafficLight } from "./types";

/**
 * 分析機關歷史案件，找出最常得標的廠商。
 * 統計每個得標廠商的得標次數、累計金額與連續得標年數。
 */
export function analyzeTopWinners(cases: AgencyCase[]): TopWinner[] {
  const winnerMap = new Map<
    string,
    { name: string; id: string; win_count: number; total_amount: number }
  >();

  for (const c of cases) {
    if (!c.winner_name) continue;

    const key = c.winner_id || c.winner_name;
    const existing = winnerMap.get(key);

    if (existing) {
      existing.win_count++;
      existing.total_amount += c.award_amount ?? 0;
    } else {
      winnerMap.set(key, {
        name: c.winner_name,
        id: c.winner_id,
        win_count: 1,
        total_amount: c.award_amount ?? 0,
      });
    }
  }

  return Array.from(winnerMap.values())
    .map((w) => ({
      ...w,
      consecutive_years: calculateConsecutiveYears(cases, w.name),
    }))
    .sort((a, b) => b.win_count - a.win_count);
}

/**
 * 計算某廠商在機關的連續得標年數。
 * 從最近一年往回推，找出連續得標的年數。
 */
export function calculateConsecutiveYears(
  cases: AgencyCase[],
  winnerName: string,
): number {
  // 收集該廠商得標的年份（去重）
  const winYears = new Set<number>();
  for (const c of cases) {
    if (c.winner_name === winnerName && c.award_date) {
      // award_date 可能是 "2025/01/15" 或 "20250115" 格式
      const yearStr = c.award_date.replace(/[/\-]/g, "").slice(0, 4);
      const year = parseInt(yearStr, 10);
      if (!isNaN(year)) {
        winYears.add(year);
      }
    }
  }

  if (winYears.size === 0) return 0;

  // 從最近一年往回數連續年份
  const sortedYears = Array.from(winYears).sort((a, b) => b - a);
  let consecutive = 1;

  for (let i = 1; i < sortedYears.length; i++) {
    if (sortedYears[i - 1] - sortedYears[i] === 1) {
      consecutive++;
    } else {
      break;
    }
  }

  return consecutive;
}

/**
 * 根據所有檢查項目的狀態，決定整體紅綠燈。
 * 規則：
 * - 有任何 red → overall red
 * - 全部 green → overall green
 * - 有 unknown 且沒有 red → yellow
 * - 其餘 → yellow
 */
export function overallAssessment(checks: WinCheck[]): TrafficLight {
  if (checks.length === 0) return "unknown";

  const statuses = checks.map((c) => c.status);

  if (statuses.some((s) => s === "red")) return "red";
  if (statuses.every((s) => s === "green")) return "green";
  if (statuses.every((s) => s === "unknown")) return "unknown";

  return "yellow";
}

/**
 * 根據檢查結果與整體評估，產生中文建議文字。
 */
export function generateRecommendation(
  checks: WinCheck[],
  overall: TrafficLight,
): string {
  const redChecks = checks.filter((c) => c.status === "red");
  const greenChecks = checks.filter((c) => c.status === "green");
  const unknownChecks = checks.filter((c) => c.status === "unknown");

  switch (overall) {
    case "red": {
      const redLabels = redChecks.map((c) => c.label).join("、");
      return `警告：${redLabels}呈現紅燈，建議謹慎評估是否投標。需重點關注不利因素並制定應對策略。`;
    }
    case "green":
      return "各項檢查均為綠燈，整體態勢有利。建議積極準備投標，把握機會。";
    case "yellow": {
      const parts: string[] = [];
      if (greenChecks.length > 0) {
        parts.push(`${greenChecks.length} 項為綠燈`);
      }
      if (redChecks.length > 0) {
        parts.push(`${redChecks.length} 項需注意`);
      }
      if (unknownChecks.length > 0) {
        parts.push(`${unknownChecks.length} 項待確認`);
      }
      return `目前${parts.join("，")}。建議補充未確認項目的資訊後再做最終決策。`;
    }
    case "unknown":
      return "尚未取得足夠情報進行評估，建議先完成 PCC 情報蒐集與 Perplexity 搜尋。";
  }
}

/**
 * 格式化金額為「萬元」顯示。
 * 例：1500000 → "150 萬元"、120000000 → "1.2 億元"
 */
export function formatBudget(amount: number): string {
  if (amount >= 100_000_000) {
    return `${(amount / 100_000_000).toFixed(1)} 億元`;
  }
  if (amount >= 10_000) {
    return `${Math.round(amount / 10_000)} 萬元`;
  }
  return `${amount.toLocaleString()} 元`;
}

/**
 * 計算距離截止日的剩餘天數。
 * 回傳 null 表示日期格式無法解析。
 */
export function daysUntilDeadline(deadline: string): number | null {
  const parsed = Date.parse(deadline);
  if (isNaN(parsed)) return null;

  const deadlineDate = new Date(parsed);
  const now = new Date();

  // 設定為當天零時，只比較日期
  const deadlineDay = new Date(
    deadlineDate.getFullYear(),
    deadlineDate.getMonth(),
    deadlineDate.getDate(),
  );
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffMs = deadlineDay.getTime() - today.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}
