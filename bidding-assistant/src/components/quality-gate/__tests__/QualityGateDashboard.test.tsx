import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { QualityGateDashboard } from "../QualityGateDashboard";
import type { QualityReport } from "@/lib/quality-gate/types";

// Mock child panels to avoid deep dependency chains
vi.mock("../GateSummary", () => ({
  GateSummary: ({ report }: { report: QualityReport }) =>
    createElement("div", { "data-testid": "gate-summary" }, `摘要 ${report.overallScore}`),
}));

vi.mock("../FactCheckPanel", () => ({
  FactCheckPanel: () => createElement("div", { "data-testid": "fact-check-panel" }, "事實查核面板"),
}));

vi.mock("../RequirementMatrixPanel", () => ({
  RequirementMatrixPanel: () => createElement("div", { "data-testid": "req-panel" }, "需求矩陣面板"),
}));

vi.mock("../FeasibilityPanel", () => ({
  FeasibilityPanel: () => createElement("div", { "data-testid": "feasibility-panel" }, "實務檢驗面板"),
}));

// ── Helpers ──────────────────────────────────────────────

function makeReport(overrides: Partial<QualityReport> = {}): QualityReport {
  return {
    gate0: { score: 85, label: "優良", errorCount: 0, warningCount: 2 },
    gate1: {
      annotations: [],
      verifiedCount: 5,
      partialCount: 2,
      unverifiedCount: 1,
      hallucinationCount: 0,
      score: 80,
      issues: [],
    },
    gate2: null,
    gate3: {
      budget: null,
      commonSense: [],
      score: 90,
      issues: [],
    },
    overallScore: 78,
    verdict: "通過",
    criticalIssues: [],
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────

describe("QualityGateDashboard", () => {
  it("顯示總評分數", () => {
    render(createElement(QualityGateDashboard, { report: makeReport({ overallScore: 82 }) }));
    expect(screen.getByText("82 / 100")).toBeTruthy();
  });

  it("顯示「通過」verdict", () => {
    render(createElement(QualityGateDashboard, { report: makeReport({ verdict: "通過" }) }));
    expect(screen.getByText("通過")).toBeTruthy();
  });

  it("顯示「有風險」verdict", () => {
    render(createElement(QualityGateDashboard, { report: makeReport({ verdict: "有風險" }) }));
    expect(screen.getByText("有風險")).toBeTruthy();
  });

  it("顯示「不建議提交」verdict", () => {
    render(createElement(QualityGateDashboard, { report: makeReport({ verdict: "不建議提交" }) }));
    expect(screen.getByText("不建議提交")).toBeTruthy();
  });

  it("有關鍵問題時顯示數量和內容", () => {
    const criticalIssues = ["預算超支 30%", "缺少必要資格"];
    render(createElement(QualityGateDashboard, { report: makeReport({ criticalIssues }) }));
    expect(screen.getByText("關鍵問題（必須處理）")).toBeTruthy();
    expect(screen.getByText("預算超支 30%")).toBeTruthy();
    expect(screen.getByText("缺少必要資格")).toBeTruthy();
    expect(screen.getByText("2 個關鍵問題")).toBeTruthy();
  });

  it("無關鍵問題時不顯示關鍵問題區塊", () => {
    render(createElement(QualityGateDashboard, { report: makeReport({ criticalIssues: [] }) }));
    expect(screen.queryByText("關鍵問題（必須處理）")).toBeNull();
  });

  it("顯示三個分頁標籤", () => {
    render(createElement(QualityGateDashboard, { report: makeReport() }));
    expect(screen.getByText("事實查核")).toBeTruthy();
    expect(screen.getByText("需求矩陣")).toBeTruthy();
    expect(screen.getByText("實務檢驗")).toBeTruthy();
  });

  it("顯示 GateSummary 子元件", () => {
    render(createElement(QualityGateDashboard, { report: makeReport({ overallScore: 75 }) }));
    expect(screen.getByTestId("gate-summary")).toBeTruthy();
  });

  it("顯示「總評」標籤", () => {
    render(createElement(QualityGateDashboard, { report: makeReport() }));
    expect(screen.getByText("總評")).toBeTruthy();
  });
});
