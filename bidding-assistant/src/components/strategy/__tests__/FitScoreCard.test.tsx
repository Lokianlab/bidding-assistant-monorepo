import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { FitScoreCard } from "../FitScoreCard";
import type { FitScore, KBMatchResult, DimensionScore } from "@/lib/strategy/types";

// Mock FitScoreRadar to avoid recharts ESM issues
vi.mock("../FitScoreRadar", () => ({
  FitScoreRadar: ({ fitScore }: { fitScore: FitScore }) =>
    createElement("div", { "data-testid": "fit-score-radar" }, `雷達圖 ${fitScore.total}`),
}));

// ── Helpers ──────────────────────────────────────────────

function makeDim(score: number, confidence: "高" | "中" | "低" = "中"): DimensionScore {
  return { score, confidence, evidence: `${score} 分依據` };
}

function makeFitScore(overrides: Partial<FitScore> = {}): FitScore {
  return {
    total: 75,
    dimensions: {
      domain: makeDim(18),
      agency: makeDim(15),
      competition: makeDim(12),
      scale: makeDim(16),
      team: makeDim(14),
    },
    verdict: "建議投標",
    reasons: ["領域高度匹配", "機關有歷史合作"],
    redFlags: [],
    ...overrides,
  };
}

function makeKBMatch(): KBMatchResult {
  return {
    team: [{ entry: { id: "M-001" } as never, relevance: "計畫主持人經驗匹配" }],
    portfolio: [{ entry: { id: "P-2024-001" } as never, relevance: "展覽實績" }],
    templates: [],
    risks: [],
    reviews: [],
  };
}

// ── Tests ────────────────────────────────────────────────

describe("FitScoreCard", () => {
  it("顯示總分", () => {
    render(createElement(FitScoreCard, { fitScore: makeFitScore({ total: 82 }) }));
    expect(screen.getByText("82")).toBeTruthy();
    expect(screen.getByText("/ 100")).toBeTruthy();
  });

  it("建議投標 verdict 顯示綠色標籤", () => {
    render(createElement(FitScoreCard, { fitScore: makeFitScore({ verdict: "建議投標" }) }));
    expect(screen.getByText(/建議投標/)).toBeTruthy();
  });

  it("不建議 verdict 顯示紅色標籤", () => {
    render(createElement(FitScoreCard, { fitScore: makeFitScore({ verdict: "不建議" }) }));
    expect(screen.getByText(/不建議投標/)).toBeTruthy();
  });

  it("值得評估 verdict 顯示黃色標籤", () => {
    render(createElement(FitScoreCard, { fitScore: makeFitScore({ verdict: "值得評估" }) }));
    expect(screen.getByText(/值得評估/)).toBeTruthy();
  });

  it("資料不足 verdict 顯示灰色標籤", () => {
    render(createElement(FitScoreCard, { fitScore: makeFitScore({ verdict: "資料不足" }) }));
    expect(screen.getByText(/資料不足/)).toBeTruthy();
  });

  it("顯示判斷理由", () => {
    const reasons = ["領域高度匹配", "預算在舒適範圍"];
    render(createElement(FitScoreCard, { fitScore: makeFitScore({ reasons }) }));
    expect(screen.getByText("• 領域高度匹配")).toBeTruthy();
    expect(screen.getByText("• 預算在舒適範圍")).toBeTruthy();
  });

  it("沒有理由時不顯示理由區塊", () => {
    render(createElement(FitScoreCard, { fitScore: makeFitScore({ reasons: [] }) }));
    expect(screen.queryByText(/•/)).toBeNull();
  });

  it("有紅旗時顯示注意事項", () => {
    const redFlags = ["此案為限制性招標"];
    render(createElement(FitScoreCard, { fitScore: makeFitScore({ redFlags }) }));
    expect(screen.getByText("⚠️ 注意事項")).toBeTruthy();
    expect(screen.getByText("此案為限制性招標")).toBeTruthy();
  });

  it("沒有紅旗時不顯示注意事項", () => {
    render(createElement(FitScoreCard, { fitScore: makeFitScore({ redFlags: [] }) }));
    expect(screen.queryByText("⚠️ 注意事項")).toBeNull();
  });

  it("顯示五維分析標題", () => {
    render(createElement(FitScoreCard, { fitScore: makeFitScore() }));
    expect(screen.getByText("五維分析")).toBeTruthy();
  });

  it("有 kbMatch 時顯示知識庫區塊", () => {
    render(createElement(FitScoreCard, { fitScore: makeFitScore(), kbMatch: makeKBMatch() }));
    expect(screen.getByText("知識庫相關條目")).toBeTruthy();
    expect(screen.getByText("實績")).toBeTruthy();
    expect(screen.getByText("團隊")).toBeTruthy();
    expect(screen.getByText("範本")).toBeTruthy();
    expect(screen.getByText("風險 SOP")).toBeTruthy();
    expect(screen.getByText("案後檢討")).toBeTruthy();
  });

  it("kbMatch 為 null 時不顯示知識庫區塊", () => {
    render(createElement(FitScoreCard, { fitScore: makeFitScore(), kbMatch: null }));
    expect(screen.queryByText("知識庫相關條目")).toBeNull();
  });

  it("kbMatch 無相關時顯示「無相關」", () => {
    const emptyMatch: KBMatchResult = {
      team: [],
      portfolio: [],
      templates: [],
      risks: [],
      reviews: [],
    };
    render(createElement(FitScoreCard, { fitScore: makeFitScore(), kbMatch: emptyMatch }));
    const noMatches = screen.getAllByText("無相關");
    expect(noMatches.length).toBe(5);
  });

  it("kbMatch 有匹配時顯示 entry id", () => {
    render(createElement(FitScoreCard, { fitScore: makeFitScore(), kbMatch: makeKBMatch() }));
    expect(screen.getByText("M-001")).toBeTruthy();
    expect(screen.getByText("P-2024-001")).toBeTruthy();
  });

  it("未知 verdict 降級為資料不足", () => {
    const score = makeFitScore({ verdict: "未知狀態" as never });
    render(createElement(FitScoreCard, { fitScore: score }));
    expect(screen.getByText(/資料不足/)).toBeTruthy();
  });
});
