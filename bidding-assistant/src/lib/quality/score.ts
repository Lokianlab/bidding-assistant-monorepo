import type { CheckResult, QualityScore } from "./types";

/** 從檢查結果計算品質分數 */
export function calculateScore(results: CheckResult[]): QualityScore {
  const errorCount = results.filter((r) => r.type === "error").length;
  const warningCount = results.filter((r) => r.type === "warning").length;
  const infoCount = results.filter((r) => r.type === "info").length;

  const raw = 100 - errorCount * 10 - warningCount * 3;
  const value = Math.max(0, Math.min(100, raw));

  let label: string;
  if (value >= 80) label = "品質良好";
  else if (value >= 60) label = "需要改善";
  else label = "品質不佳";

  return { value, label, errorCount, warningCount, infoCount };
}
