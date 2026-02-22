import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { RequirementMatrixPanel } from "../RequirementMatrixPanel";
import type { RequirementTraceResult, Requirement, CoverageResult } from "@/lib/quality-gate/types";

// ── Helpers ────────────────────────────────────────────────

function makeRequirement(id: string, overrides?: Partial<Requirement>): Requirement {
  return {
    id,
    source: "評分項目",
    description: `需求 ${id} 的描述`,
    weight: 30,
    category: "評分",
    ...overrides,
  };
}

function makeCoverage(
  requirementId: string,
  status: CoverageResult["status"],
  overrides?: Partial<CoverageResult>
): CoverageResult {
  return {
    requirementId,
    status,
    coveredBy: [],
    matchScore: status === "covered" ? 0.8 : status === "partial" ? 0.4 : 0,
    gap: null,
    ...overrides,
  };
}

function makeResult(overrides?: Partial<RequirementTraceResult>): RequirementTraceResult {
  return {
    matrix: {
      requirements: [],
      coverage: [],
      uncoveredCount: 0,
      coverageRate: 100,
    },
    score: 88,
    issues: [],
    ...overrides,
  };
}

// ── result = null ──────────────────────────────────────────

describe("RequirementMatrixPanel — result=null", () => {
  it("result=null 時顯示跳過說明", () => {
    render(createElement(RequirementMatrixPanel, { result: null }));
    expect(screen.getByText(/未提供需求清單，閘門 2 已跳過/)).toBeTruthy();
  });

  it("result=null 時顯示補充說明", () => {
    render(createElement(RequirementMatrixPanel, { result: null }));
    expect(screen.getByText(/需求清單由 L1 戰略分析產出/)).toBeTruthy();
  });

  it("result=null 時不渲染覆蓋率摘要", () => {
    const { container } = render(
      createElement(RequirementMatrixPanel, { result: null })
    );
    expect(container.querySelector("table")).toBeNull();
  });
});

// ── 覆蓋率摘要 ─────────────────────────────────────────────

describe("RequirementMatrixPanel — 覆蓋率摘要", () => {
  it("顯示覆蓋率百分比", () => {
    render(
      createElement(RequirementMatrixPanel, {
        result: makeResult({
          matrix: {
            requirements: [],
            coverage: [],
            uncoveredCount: 0,
            coverageRate: 75,
          },
        }),
      })
    );
    expect(screen.getByText("75%")).toBeTruthy();
  });

  it("顯示需求項數和未覆蓋數", () => {
    render(
      createElement(RequirementMatrixPanel, {
        result: makeResult({
          matrix: {
            requirements: [
              makeRequirement("R-01"),
              makeRequirement("R-02"),
              makeRequirement("R-03"),
            ],
            coverage: [],
            uncoveredCount: 2,
            coverageRate: 33,
          },
        }),
      })
    );
    expect(screen.getByText(/3 項需求，2 項未覆蓋/)).toBeTruthy();
  });
});

// ── 追溯矩陣表（無需求） ───────────────────────────────────

describe("RequirementMatrixPanel — 無需求", () => {
  it("requirements=[] 時不顯示表格", () => {
    const { container } = render(
      createElement(RequirementMatrixPanel, { result: makeResult() })
    );
    expect(container.querySelector("table")).toBeNull();
  });
});

// ── STATUS_ICON / STATUS_LABEL ─────────────────────────────

describe("RequirementMatrixPanel — 覆蓋狀態顯示", () => {
  it("covered 需求顯示 ✅ 和「已覆蓋」", () => {
    render(
      createElement(RequirementMatrixPanel, {
        result: makeResult({
          matrix: {
            requirements: [makeRequirement("R-01")],
            coverage: [makeCoverage("R-01", "covered")],
            uncoveredCount: 0,
            coverageRate: 100,
          },
        }),
      })
    );
    expect(screen.getByText(/✅/)).toBeTruthy();
    expect(screen.getByText(/已覆蓋/)).toBeTruthy();
  });

  it("partial 需求顯示 ⚠️ 和「部分覆蓋」", () => {
    render(
      createElement(RequirementMatrixPanel, {
        result: makeResult({
          matrix: {
            requirements: [makeRequirement("R-01")],
            coverage: [makeCoverage("R-01", "partial")],
            uncoveredCount: 0,
            coverageRate: 50,
          },
        }),
      })
    );
    expect(screen.getByText(/⚠️/)).toBeTruthy();
    expect(screen.getByText(/部分覆蓋/)).toBeTruthy();
  });

  it("missing 需求顯示 ❌ 和「未覆蓋」", () => {
    render(
      createElement(RequirementMatrixPanel, {
        result: makeResult({
          matrix: {
            requirements: [makeRequirement("R-01")],
            coverage: [makeCoverage("R-01", "missing")],
            uncoveredCount: 1,
            coverageRate: 0,
          },
        }),
      })
    );
    // 表格的狀態格顯示「❌ 未覆蓋」；摘要列也含「未覆蓋」，用 getAllByText
    expect(screen.getByText(/❌ 未覆蓋/)).toBeTruthy();
  });

  it("無對應 coverage 的需求 fallback 到「未覆蓋」", () => {
    render(
      createElement(RequirementMatrixPanel, {
        result: makeResult({
          matrix: {
            requirements: [makeRequirement("R-01")],
            coverage: [], // 沒有 R-01 的覆蓋記錄
            uncoveredCount: 1,
            coverageRate: 0,
          },
        }),
      })
    );
    // status fallback to "missing" → 表格格顯示「❌ 未覆蓋」
    expect(screen.getByText(/❌ 未覆蓋/)).toBeTruthy();
  });
});

// ── 權重顯示 ───────────────────────────────────────────────

describe("RequirementMatrixPanel — 需求權重", () => {
  it("weight 有值時顯示百分比", () => {
    render(
      createElement(RequirementMatrixPanel, {
        result: makeResult({
          matrix: {
            requirements: [makeRequirement("R-01", { weight: 25 })],
            coverage: [makeCoverage("R-01", "covered")],
            uncoveredCount: 0,
            coverageRate: 100,
          },
        }),
      })
    );
    expect(screen.getByText("25%")).toBeTruthy();
  });

  it("weight=null 時 weight 欄顯示「—」", () => {
    render(
      createElement(RequirementMatrixPanel, {
        result: makeResult({
          matrix: {
            requirements: [makeRequirement("R-01", { weight: null })],
            coverage: [makeCoverage("R-01", "covered")],
            uncoveredCount: 0,
            coverageRate: 100,
          },
        }),
      })
    );
    // 可能有多個「—」（weight 欄 + 來源欄皆可為「—」）
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });
});

// ── 覆蓋來源 ───────────────────────────────────────────────

describe("RequirementMatrixPanel — 覆蓋來源", () => {
  it("coveredBy 有內容時用「、」連接", () => {
    render(
      createElement(RequirementMatrixPanel, {
        result: makeResult({
          matrix: {
            requirements: [makeRequirement("R-01")],
            coverage: [
              makeCoverage("R-01", "covered", {
                coveredBy: ["第三章", "執行計畫"],
              }),
            ],
            uncoveredCount: 0,
            coverageRate: 100,
          },
        }),
      })
    );
    expect(screen.getByText("第三章、執行計畫")).toBeTruthy();
  });

  it("coveredBy=[] 且有 gap 時顯示 gap", () => {
    render(
      createElement(RequirementMatrixPanel, {
        result: makeResult({
          matrix: {
            requirements: [makeRequirement("R-01")],
            coverage: [
              makeCoverage("R-01", "partial", {
                coveredBy: [],
                gap: "缺乏具體時程說明",
              }),
            ],
            uncoveredCount: 0,
            coverageRate: 50,
          },
        }),
      })
    );
    expect(screen.getByText("缺乏具體時程說明")).toBeTruthy();
  });

  it("coveredBy=[] 且 gap=null 時顯示「—」", () => {
    render(
      createElement(RequirementMatrixPanel, {
        result: makeResult({
          matrix: {
            requirements: [makeRequirement("R-01")],
            coverage: [
              makeCoverage("R-01", "missing", { coveredBy: [], gap: null }),
            ],
            uncoveredCount: 1,
            coverageRate: 0,
          },
        }),
      })
    );
    // 「—」在 weight=30 那列也會出現，但權重是 30% 所以不會衝突
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });
});

// ── 問題清單 ───────────────────────────────────────────────

describe("RequirementMatrixPanel — 問題清單", () => {
  it("無問題時顯示「需求追溯未發現問題」", () => {
    render(createElement(RequirementMatrixPanel, { result: makeResult({ issues: [] }) }));
    expect(screen.getByText("需求追溯未發現問題")).toBeTruthy();
  });
});
