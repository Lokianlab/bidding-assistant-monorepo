import { describe, it, expect } from "vitest";
import { calculateScore } from "../score";
import type { CheckResult } from "../types";

function makeResult(type: "error" | "warning" | "info"): CheckResult {
  return { type, rule: "test", message: "test" };
}

describe("calculateScore", () => {
  it("無問題時滿分 100", () => {
    const score = calculateScore([]);
    expect(score.value).toBe(100);
    expect(score.label).toBe("品質良好");
    expect(score.errorCount).toBe(0);
    expect(score.warningCount).toBe(0);
    expect(score.infoCount).toBe(0);
  });

  it("每個 error 扣 10 分", () => {
    const results = [makeResult("error"), makeResult("error")];
    const score = calculateScore(results);
    expect(score.value).toBe(80); // 100 - 2*10
    expect(score.errorCount).toBe(2);
  });

  it("每個 warning 扣 3 分", () => {
    const results = [makeResult("warning"), makeResult("warning"), makeResult("warning")];
    const score = calculateScore(results);
    expect(score.value).toBe(91); // 100 - 3*3
    expect(score.warningCount).toBe(3);
  });

  it("info 不扣分", () => {
    const results = [makeResult("info"), makeResult("info"), makeResult("info")];
    const score = calculateScore(results);
    expect(score.value).toBe(100);
    expect(score.infoCount).toBe(3);
  });

  it("混合型別正確計算", () => {
    const results = [
      makeResult("error"),
      makeResult("warning"),
      makeResult("warning"),
      makeResult("info"),
    ];
    const score = calculateScore(results);
    expect(score.value).toBe(84); // 100 - 10 - 3*2
    expect(score.errorCount).toBe(1);
    expect(score.warningCount).toBe(2);
    expect(score.infoCount).toBe(1);
  });

  it("分數下限為 0（不會負數）", () => {
    const results = Array(15).fill(null).map(() => makeResult("error"));
    const score = calculateScore(results);
    expect(score.value).toBe(0); // 100 - 15*10 = -50 → clamp to 0
  });

  it("分數上限為 100", () => {
    const score = calculateScore([]);
    expect(score.value).toBeLessThanOrEqual(100);
  });

  it("80 分以上標記為品質良好", () => {
    const results = [makeResult("error"), makeResult("error")]; // 80
    expect(calculateScore(results).label).toBe("品質良好");
  });

  it("60-79 分標記為需要改善", () => {
    const results = [makeResult("error"), makeResult("error"), makeResult("error")]; // 70
    expect(calculateScore(results).label).toBe("需要改善");
  });

  it("60 分以下標記為品質不佳", () => {
    const results = Array(5).fill(null).map(() => makeResult("error")); // 50
    expect(calculateScore(results).label).toBe("品質不佳");
  });

  it("恰好 60 分為需要改善", () => {
    // 4 errors = 100-40=60
    const results = Array(4).fill(null).map(() => makeResult("error"));
    expect(calculateScore(results).label).toBe("需要改善");
  });
});
