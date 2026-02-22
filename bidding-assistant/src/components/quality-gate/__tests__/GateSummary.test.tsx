import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { GateSummary } from "../GateSummary";
import type { QualityReport } from "@/lib/quality-gate/types";

// ── 測試資料建構 ────────────────────────────────────────────

function makeReport(overrides?: {
  gate0Score?: number;
  gate0Errors?: number;
  gate0Warnings?: number;
  gate1Score?: number;
  gate1Verified?: number;
  gate1Unverified?: number;
  gate2?: QualityReport["gate2"];
  gate3Score?: number;
  gate3BudgetMargin?: number | null;
  gate3CommonSenseCount?: number;
}): QualityReport {
  const o = overrides ?? {};
  const gate3Score = o.gate3Score ?? 75;
  const gate3BudgetMargin = o.gate3BudgetMargin;
  const gate3CommonSenseCount = o.gate3CommonSenseCount ?? 0;

  return {
    gate0: {
      score: o.gate0Score ?? 80,
      label: "文字品質",
      errorCount: o.gate0Errors ?? 1,
      warningCount: o.gate0Warnings ?? 2,
    },
    gate1: {
      annotations: [],
      verifiedCount: o.gate1Verified ?? 5,
      partialCount: 0,
      unverifiedCount: o.gate1Unverified ?? 1,
      hallucinationCount: 0,
      score: o.gate1Score ?? 85,
      issues: [],
    },
    gate2:
      o.gate2 !== undefined
        ? o.gate2
        : {
            matrix: {
              requirements: [],
              coverage: [],
              uncoveredCount: 0,
              coverageRate: 88,
            },
            score: 78,
            issues: [],
          },
    gate3: {
      budget:
        gate3BudgetMargin != null
          ? {
              totalBudget: 1000000,
              estimatedCosts: [],
              totalEstimate: 900000,
              margin: gate3BudgetMargin,
              verdict: "合理",
              warnings: [],
            }
          : null,
      commonSense: Array.from({ length: gate3CommonSenseCount }, (_, i) => ({
        ruleName: `rule-${i}`,
        matchedText: "某段文字",
        message: `常識提醒 ${i}`,
      })),
      score: gate3Score,
      issues: [],
    },
    overallScore: 80,
    verdict: "通過",
    criticalIssues: [],
  };
}

// ── scoreToStatus 邊界（透過 badge 文字驗證） ──────────────

describe("GateSummary — scoreToStatus 閾值", () => {
  it("gate0 score=70 → 顯示「通過」", () => {
    render(createElement(GateSummary, { report: makeReport({ gate0Score: 70 }) }));
    // 第一張卡（文字品質）的 badge
    const badges = screen.getAllByText("通過");
    expect(badges.length).toBeGreaterThanOrEqual(1);
  });

  it("gate0 score=69 → 顯示「有風險」（69 在 50-69 區間）", () => {
    render(
      createElement(GateSummary, {
        report: makeReport({ gate0Score: 69, gate1Score: 90, gate3Score: 90 }),
      })
    );
    expect(screen.getByText("有風險")).toBeTruthy();
  });

  it("gate1 score=50 → 顯示「有風險」", () => {
    render(
      createElement(GateSummary, {
        report: makeReport({ gate1Score: 50, gate0Score: 90, gate3Score: 90 }),
      })
    );
    expect(screen.getByText("有風險")).toBeTruthy();
  });

  it("gate1 score=49 → 顯示「不建議」", () => {
    render(
      createElement(GateSummary, {
        report: makeReport({ gate1Score: 49, gate0Score: 90, gate3Score: 90 }),
      })
    );
    expect(screen.getByText("不建議")).toBeTruthy();
  });

  it("gate3 score=100 → 顯示「通過」", () => {
    render(createElement(GateSummary, { report: makeReport({ gate3Score: 100 }) }));
    expect(screen.getAllByText("通過").length).toBeGreaterThanOrEqual(1);
  });
});

// ── 四張卡片標籤 ───────────────────────────────────────────

describe("GateSummary — 卡片標籤", () => {
  it("渲染四個閘門標籤", () => {
    render(createElement(GateSummary, { report: makeReport() }));
    expect(screen.getByText("文字品質")).toBeTruthy();
    expect(screen.getByText("事實查核")).toBeTruthy();
    expect(screen.getByText("需求對照")).toBeTruthy();
    expect(screen.getByText("實務檢驗")).toBeTruthy();
  });
});

// ── 副標題格式 ─────────────────────────────────────────────

describe("GateSummary — 卡片副標題", () => {
  it("gate0 副標題顯示錯誤/警告數", () => {
    render(
      createElement(GateSummary, {
        report: makeReport({ gate0Errors: 3, gate0Warnings: 5 }),
      })
    );
    expect(screen.getByText("3 錯誤 / 5 警告")).toBeTruthy();
  });

  it("gate1 副標題顯示已驗證/未驗證數", () => {
    render(
      createElement(GateSummary, {
        report: makeReport({ gate1Verified: 7, gate1Unverified: 2 }),
      })
    );
    expect(screen.getByText("7 已驗證 / 2 未驗證")).toBeTruthy();
  });

  it("gate2 有值時副標題顯示覆蓋率", () => {
    render(
      createElement(GateSummary, {
        report: makeReport({
          gate2: {
            matrix: {
              requirements: [],
              coverage: [],
              uncoveredCount: 0,
              coverageRate: 92,
            },
            score: 88,
            issues: [],
          },
        }),
      })
    );
    expect(screen.getByText("覆蓋率 92%")).toBeTruthy();
  });

  it("gate3 有 budget 時副標題顯示預算餘裕", () => {
    render(
      createElement(GateSummary, {
        report: makeReport({ gate3BudgetMargin: 15 }),
      })
    );
    expect(screen.getByText("預算餘裕 15%")).toBeTruthy();
  });

  it("gate3 無 budget 時副標題顯示常識提醒數", () => {
    render(
      createElement(GateSummary, {
        report: makeReport({ gate3BudgetMargin: null, gate3CommonSenseCount: 4 }),
      })
    );
    expect(screen.getByText("4 條常識提醒")).toBeTruthy();
  });
});

// ── gate2 = null（跳過） ───────────────────────────────────

describe("GateSummary — gate2=null（需求對照跳過）", () => {
  it("gate2=null 時需求對照 badge 顯示「跳過」", () => {
    render(
      createElement(GateSummary, { report: makeReport({ gate2: null }) })
    );
    expect(screen.getByText("跳過")).toBeTruthy();
  });

  it("gate2=null 時需求對照分數顯示「—」", () => {
    render(
      createElement(GateSummary, { report: makeReport({ gate2: null }) })
    );
    expect(screen.getByText("—")).toBeTruthy();
  });

  it("gate2=null 時副標題顯示「未提供需求清單」", () => {
    render(
      createElement(GateSummary, { report: makeReport({ gate2: null }) })
    );
    expect(screen.getByText("未提供需求清單")).toBeTruthy();
  });
});

// ── 分數數值顯示 ───────────────────────────────────────────

describe("GateSummary — 分數數值", () => {
  it("gate0 score=83 → 渲染「83」", () => {
    render(
      createElement(GateSummary, { report: makeReport({ gate0Score: 83 }) })
    );
    expect(screen.getByText("83")).toBeTruthy();
  });

  it("gate2 有值時顯示 gate2 score", () => {
    render(
      createElement(GateSummary, {
        report: makeReport({
          gate2: {
            matrix: {
              requirements: [],
              coverage: [],
              uncoveredCount: 0,
              coverageRate: 75,
            },
            score: 77,
            issues: [],
          },
        }),
      })
    );
    expect(screen.getByText("77")).toBeTruthy();
  });
});
