import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { FeasibilityPanel } from "../FeasibilityPanel";
import type { FeasibilityResult, BudgetFeasibility } from "@/lib/quality-gate/types";

// ── Helpers ────────────────────────────────────────────────

function makeBudget(overrides?: Partial<BudgetFeasibility>): BudgetFeasibility {
  return {
    totalBudget: 1_000_000,
    estimatedCosts: [],
    totalEstimate: 900_000,
    margin: 10,
    verdict: "合理",
    warnings: [],
    ...overrides,
  };
}

function makeResult(overrides?: Partial<FeasibilityResult>): FeasibilityResult {
  return {
    budget: null,
    commonSense: [],
    score: 80,
    issues: [],
    ...overrides,
  };
}

// ── budget = null ──────────────────────────────────────────

describe("FeasibilityPanel — budget=null", () => {
  it("budget=null 時不顯示「預算可行性」區塊", () => {
    render(createElement(FeasibilityPanel, { result: makeResult() }));
    expect(screen.queryByText("預算可行性")).toBeNull();
  });

  it("budget=null 時仍顯示問題清單", () => {
    render(createElement(FeasibilityPanel, { result: makeResult() }));
    expect(screen.getByText("實務檢驗未發現問題")).toBeTruthy();
  });
});

// ── budget 顯示 ────────────────────────────────────────────

describe("FeasibilityPanel — budget 顯示", () => {
  it("有 budget 時顯示「預算可行性」標題", () => {
    render(
      createElement(FeasibilityPanel, {
        result: makeResult({ budget: makeBudget() }),
      })
    );
    expect(screen.getByText("預算可行性")).toBeTruthy();
  });

  it("顯示格式化後的案件預算", () => {
    render(
      createElement(FeasibilityPanel, {
        result: makeResult({ budget: makeBudget({ totalBudget: 2_000_000 }) }),
      })
    );
    // formatCurrency(2000000) → "NT$ 2,000,000"
    expect(screen.getByText("NT$ 2,000,000")).toBeTruthy();
  });

  it("顯示格式化後的估算成本", () => {
    render(
      createElement(FeasibilityPanel, {
        result: makeResult({ budget: makeBudget({ totalEstimate: 1_800_000 }) }),
      })
    );
    expect(screen.getByText("NT$ 1,800,000")).toBeTruthy();
  });

  it("顯示判定和餘裕百分比", () => {
    render(
      createElement(FeasibilityPanel, {
        result: makeResult({ budget: makeBudget({ verdict: "緊繃", margin: 5 }) }),
      })
    );
    expect(screen.getByText(/緊繃（餘裕 5%）/)).toBeTruthy();
  });
});

// ── budget verdict 樣式 ────────────────────────────────────

describe("FeasibilityPanel — verdict 樣式", () => {
  const verdicts = ["充裕", "合理", "緊繃", "超支"] as const;

  verdicts.forEach((verdict) => {
    it(`顯示「${verdict}」判定文字`, () => {
      render(
        createElement(FeasibilityPanel, {
          result: makeResult({ budget: makeBudget({ verdict }) }),
        })
      );
      expect(screen.getByText(new RegExp(verdict))).toBeTruthy();
    });
  });
});

// ── 成本項目明細 ───────────────────────────────────────────

describe("FeasibilityPanel — 成本項目明細", () => {
  it("有成本項目時顯示描述", () => {
    render(
      createElement(FeasibilityPanel, {
        result: makeResult({
          budget: makeBudget({
            estimatedCosts: [
              {
                description: "人事費用",
                estimatedAmount: 500_000,
                source: "explicit",
                confidence: "高",
              },
            ],
          }),
        }),
      })
    );
    expect(screen.getByText("人事費用")).toBeTruthy();
    expect(screen.getByText("NT$ 500,000")).toBeTruthy();
  });

  it("推估成本顯示「(推估)」標籤", () => {
    render(
      createElement(FeasibilityPanel, {
        result: makeResult({
          budget: makeBudget({
            estimatedCosts: [
              {
                description: "器材租借",
                estimatedAmount: 100_000,
                source: "inferred",
                confidence: "中",
              },
            ],
          }),
        }),
      })
    );
    expect(screen.getByText("(推估)")).toBeTruthy();
  });

  it("明確來源的成本不顯示「(推估)」標籤", () => {
    render(
      createElement(FeasibilityPanel, {
        result: makeResult({
          budget: makeBudget({
            estimatedCosts: [
              {
                description: "外部顧問費",
                estimatedAmount: 80_000,
                source: "explicit",
                confidence: "高",
              },
            ],
          }),
        }),
      })
    );
    expect(screen.queryByText("(推估)")).toBeNull();
  });
});

// ── 預算警告 ───────────────────────────────────────────────

describe("FeasibilityPanel — 預算警告", () => {
  it("有警告時顯示警告訊息", () => {
    render(
      createElement(FeasibilityPanel, {
        result: makeResult({
          budget: makeBudget({ warnings: ["獎金佔預算比例超過 50%"] }),
        }),
      })
    );
    expect(screen.getByText(/獎金佔預算比例超過 50%/)).toBeTruthy();
  });

  it("warnings=[] 時不顯示警告區塊", () => {
    render(
      createElement(FeasibilityPanel, {
        result: makeResult({ budget: makeBudget({ warnings: [] }) }),
      })
    );
    expect(screen.queryByText(/警告/)).toBeNull();
  });
});

// ── 常識檢查 ───────────────────────────────────────────────

describe("FeasibilityPanel — 常識檢查", () => {
  it("commonSense=[] 時不顯示「常識檢查」區塊", () => {
    render(createElement(FeasibilityPanel, { result: makeResult() }));
    expect(screen.queryByText("常識檢查")).toBeNull();
  });

  it("有常識旗標時顯示訊息和觸發文字", () => {
    render(
      createElement(FeasibilityPanel, {
        result: makeResult({
          commonSense: [
            {
              ruleName: "不合理時間線",
              matchedText: "三個月內完成全部施工",
              message: "三個月完成大型工程在業界實屬困難",
            },
          ],
        }),
      })
    );
    expect(screen.getByText(/三個月完成大型工程在業界實屬困難/)).toBeTruthy();
    expect(screen.getByText(/觸發文字：三個月內完成全部施工/)).toBeTruthy();
  });
});

// ── 問題清單 ───────────────────────────────────────────────

describe("FeasibilityPanel — 問題清單", () => {
  it("無問題時顯示「實務檢驗未發現問題」", () => {
    render(createElement(FeasibilityPanel, { result: makeResult({ issues: [] }) }));
    expect(screen.getByText("實務檢驗未發現問題")).toBeTruthy();
  });

  it("有問題時透過 IssueList 渲染", () => {
    render(
      createElement(FeasibilityPanel, {
        result: makeResult({
          issues: [
            {
              severity: "warning",
              type: "budget_tight",
              message: "預算餘裕偏低",
              context: "總預算 100萬",
            },
          ],
        }),
      })
    );
    expect(screen.getByText(/預算餘裕偏低/)).toBeTruthy();
  });
});
