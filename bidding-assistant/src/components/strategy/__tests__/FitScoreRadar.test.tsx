import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { FitScoreRadar } from "../FitScoreRadar";
import type { FitScore } from "@/lib/strategy/types";

// ── recharts mock ───────────────────────────────────────────

vi.mock("recharts", () => ({
  RadarChart: ({ children }: { children: unknown }) =>
    createElement("div", { "data-testid": "radar-chart" }, children as never),
  Radar: () => null,
  PolarGrid: () => null,
  PolarAngleAxis: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: unknown }) =>
    createElement("div", { "data-testid": "responsive-container" }, children as never),
}));

// ── Helper ──────────────────────────────────────────────────

function makeFitScore(overrides?: Partial<FitScore>): FitScore {
  return {
    total: 75,
    verdict: "建議投標",
    reasons: ["領域吻合", "資源充足"],
    redFlags: [],
    dimensions: {
      domain: { score: 16, confidence: "高", evidence: "長期展覽策展經驗" },
      agency: { score: 14, confidence: "中", evidence: "曾與此機關合作 2 次" },
      competition: { score: 12, confidence: "低", evidence: "競爭廠商不明" },
      scale: { score: 15, confidence: "高", evidence: "預算規模適中" },
      team: { score: 18, confidence: "高", evidence: "核心成員均可配合" },
    },
    ...overrides,
  };
}

// ── 渲染測試 ────────────────────────────────────────────────

describe("FitScoreRadar — 渲染", () => {
  it("渲染雷達圖容器", () => {
    const { container } = render(
      createElement(FitScoreRadar, { fitScore: makeFitScore() })
    );
    expect(container.querySelector("[data-testid='radar-chart']")).toBeTruthy();
  });

  it("顯示「領域匹配」維度標籤", () => {
    render(createElement(FitScoreRadar, { fitScore: makeFitScore() }));
    expect(screen.getByText("領域匹配")).toBeTruthy();
  });

  it("顯示「機關熟悉度」維度標籤", () => {
    render(createElement(FitScoreRadar, { fitScore: makeFitScore() }));
    expect(screen.getByText("機關熟悉度")).toBeTruthy();
  });

  it("顯示「競爭環境」維度標籤", () => {
    render(createElement(FitScoreRadar, { fitScore: makeFitScore() }));
    expect(screen.getByText("競爭環境")).toBeTruthy();
  });

  it("顯示「規模適合度」維度標籤", () => {
    render(createElement(FitScoreRadar, { fitScore: makeFitScore() }));
    expect(screen.getByText("規模適合度")).toBeTruthy();
  });

  it("顯示「團隊可用性」維度標籤", () => {
    render(createElement(FitScoreRadar, { fitScore: makeFitScore() }));
    expect(screen.getByText("團隊可用性")).toBeTruthy();
  });
});

// ── 分數顯示 ────────────────────────────────────────────────

describe("FitScoreRadar — 分數顯示", () => {
  it("顯示 domain 分數和 /20", () => {
    render(createElement(FitScoreRadar, { fitScore: makeFitScore() }));
    // domain score = 16
    expect(screen.getByText("16")).toBeTruthy();
    // /20 appears for each dimension
    expect(screen.getAllByText("/20").length).toBeGreaterThan(0);
  });

  it("顯示信心等級標籤", () => {
    render(createElement(FitScoreRadar, { fitScore: makeFitScore() }));
    expect(screen.getAllByText("[高]").length).toBeGreaterThan(0);
    expect(screen.getAllByText("[中]").length).toBeGreaterThan(0);
    expect(screen.getAllByText("[低]").length).toBeGreaterThan(0);
  });

  it("顯示 evidence 文字", () => {
    render(createElement(FitScoreRadar, { fitScore: makeFitScore() }));
    expect(screen.getByText("長期展覽策展經驗")).toBeTruthy();
  });
});
