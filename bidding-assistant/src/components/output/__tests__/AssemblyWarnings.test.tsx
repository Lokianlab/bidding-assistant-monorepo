import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { AssemblyWarnings } from "../AssemblyWarnings";
import type { AssemblyWarning } from "@/lib/output/types";
import type { QualityReport } from "@/lib/quality-gate/types";

// ── Helpers ──────────────────────────────────────────────

function makeWarning(msg: string): AssemblyWarning {
  return { type: "empty_chapter", chapter: 1, message: msg };
}

function makeReport(overrides: Partial<QualityReport> = {}): QualityReport {
  return {
    gate0: { score: 85, label: "優良", errorCount: 0, warningCount: 0 },
    gate1: { annotations: [], verifiedCount: 0, partialCount: 0, unverifiedCount: 0, hallucinationCount: 0, score: 85, issues: [] },
    gate2: null,
    gate3: { budget: null, commonSense: [], score: 90, issues: [] },
    overallScore: 80,
    verdict: "通過",
    criticalIssues: [],
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────

describe("AssemblyWarnings", () => {
  it("無警告且無品質報告時不渲染", () => {
    const { container } = render(createElement(AssemblyWarnings, { warnings: [] }));
    expect(container.firstChild).toBeNull();
  });

  it("顯示組裝警告訊息", () => {
    const warnings = [makeWarning("第 2 章內容為空"), makeWarning("缺少知識庫引用")];
    render(createElement(AssemblyWarnings, { warnings }));
    expect(screen.getByText("第 2 章內容為空")).toBeTruthy();
    expect(screen.getByText("缺少知識庫引用")).toBeTruthy();
  });

  it("顯示品質報告摘要（通過）", () => {
    render(createElement(AssemblyWarnings, {
      warnings: [],
      qualityReport: makeReport({ overallScore: 85, verdict: "通過" }),
    }));
    expect(screen.getByText(/品質評分 85／100 — 通過/)).toBeTruthy();
  });

  it("顯示品質報告摘要（有風險）", () => {
    render(createElement(AssemblyWarnings, {
      warnings: [],
      qualityReport: makeReport({ overallScore: 55, verdict: "有風險" }),
    }));
    expect(screen.getByText(/品質評分 55／100 — 有風險/)).toBeTruthy();
  });

  it("顯示品質報告摘要（不建議提交）", () => {
    render(createElement(AssemblyWarnings, {
      warnings: [],
      qualityReport: makeReport({ overallScore: 30, verdict: "不建議提交" }),
    }));
    expect(screen.getByText(/品質評分 30／100 — 不建議提交/)).toBeTruthy();
  });

  it("有關鍵問題時顯示列表", () => {
    render(createElement(AssemblyWarnings, {
      warnings: [],
      qualityReport: makeReport({ criticalIssues: ["預算超支", "資格不符"] }),
    }));
    expect(screen.getByText("預算超支")).toBeTruthy();
    expect(screen.getByText("資格不符")).toBeTruthy();
  });

  it("同時顯示警告和品質報告", () => {
    render(createElement(AssemblyWarnings, {
      warnings: [makeWarning("章節過短")],
      qualityReport: makeReport({ overallScore: 72, verdict: "通過" }),
    }));
    expect(screen.getByText("章節過短")).toBeTruthy();
    expect(screen.getByText(/品質評分 72／100/)).toBeTruthy();
  });
});
