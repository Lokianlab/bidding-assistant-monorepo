import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { FactCheckPanel } from "../FactCheckPanel";
import type { FactCheckResult, SourceAnnotation } from "@/lib/quality-gate/types";

// ── Helpers ────────────────────────────────────────────────

function makeResult(overrides?: Partial<FactCheckResult>): FactCheckResult {
  return {
    annotations: [],
    verifiedCount: 3,
    partialCount: 1,
    unverifiedCount: 2,
    hallucinationCount: 0,
    score: 75,
    issues: [],
    ...overrides,
  };
}

function makeAnnotation(
  confidence: SourceAnnotation["confidence"],
  claim: string,
  overrides?: Partial<SourceAnnotation>
): SourceAnnotation {
  return {
    sentenceIndex: 0,
    claim,
    source: null,
    hallucinations: [],
    confidence,
    ...overrides,
  };
}

// ── 統計摘要 ───────────────────────────────────────────────

describe("FactCheckPanel — 統計摘要", () => {
  it("顯示四個統計數字", () => {
    render(
      createElement(FactCheckPanel, {
        result: makeResult({
          verifiedCount: 5,
          partialCount: 2,
          unverifiedCount: 3,
          hallucinationCount: 1,
        }),
      })
    );
    expect(screen.getByText("5")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getByText("1")).toBeTruthy();
  });

  it("顯示四個統計標籤", () => {
    render(createElement(FactCheckPanel, { result: makeResult() }));
    expect(screen.getByText("已驗證")).toBeTruthy();
    expect(screen.getByText("部分驗證")).toBeTruthy();
    expect(screen.getByText("未驗證")).toBeTruthy();
    expect(screen.getByText("幻覺嫌疑")).toBeTruthy();
  });
});

// ── annotations 為空 ───────────────────────────────────────

describe("FactCheckPanel — 無 annotations", () => {
  it("annotations=[] 時不顯示「來源追溯」區塊", () => {
    render(createElement(FactCheckPanel, { result: makeResult() }));
    expect(screen.queryByText("來源追溯")).toBeNull();
  });
});

// ── annotation confidence 樣式 ─────────────────────────────

describe("FactCheckPanel — CONFIDENCE_STYLE", () => {
  it("verified annotation 顯示 ✅ 和「已驗證」標籤", () => {
    render(
      createElement(FactCheckPanel, {
        result: makeResult({
          annotations: [makeAnnotation("verified", "公司於 2020 年成立")],
        }),
      })
    );
    expect(screen.getByText(/✅/)).toBeTruthy();
    expect(screen.getByText(/\[已驗證\]/)).toBeTruthy();
    expect(screen.getByText(/公司於 2020 年成立/)).toBeTruthy();
  });

  it("partial annotation 顯示 ⚠️ 和「部分驗證」標籤", () => {
    render(
      createElement(FactCheckPanel, {
        result: makeResult({
          annotations: [makeAnnotation("partial", "具有豐富執行經驗")],
        }),
      })
    );
    expect(screen.getByText(/⚠️/)).toBeTruthy();
    expect(screen.getByText(/\[部分驗證\]/)).toBeTruthy();
  });

  it("unverified annotation 顯示 ❌ 和「無依據」標籤", () => {
    render(
      createElement(FactCheckPanel, {
        result: makeResult({
          annotations: [makeAnnotation("unverified", "榮獲多項國際大獎")],
        }),
      })
    );
    expect(screen.getByText(/❌/)).toBeTruthy();
    expect(screen.getByText(/\[無依據\]/)).toBeTruthy();
  });
});

// ── annotation source ──────────────────────────────────────

describe("FactCheckPanel — annotation source", () => {
  it("有 source 時顯示 KB 路徑", () => {
    render(
      createElement(FactCheckPanel, {
        result: makeResult({
          annotations: [
            makeAnnotation("verified", "實績宣稱", {
              source: {
                kbId: "00A",
                entryId: "P-001",
                field: "caseName",
                matchedText: "某某計畫",
              },
            }),
          ],
        }),
      })
    );
    expect(screen.getByText(/來源: 00A\/P-001/)).toBeTruthy();
  });

  it("source=null 時不顯示來源資訊", () => {
    render(
      createElement(FactCheckPanel, {
        result: makeResult({
          annotations: [makeAnnotation("unverified", "無來源宣稱", { source: null })],
        }),
      })
    );
    expect(screen.queryByText(/來源:/)).toBeNull();
  });
});

// ── hallucinations ─────────────────────────────────────────

describe("FactCheckPanel — hallucinations", () => {
  it("有 hallucinations 時顯示訊息", () => {
    render(
      createElement(FactCheckPanel, {
        result: makeResult({
          annotations: [
            makeAnnotation("unverified", "所有客戶都非常滿意", {
              hallucinations: [
                {
                  patternName: "強烈肯定語",
                  matchedText: "所有客戶",
                  message: "「所有客戶」是典型幻覺語氣，缺乏事實支撐",
                  startIndex: 0,
                  endIndex: 4,
                },
              ],
            }),
          ],
        }),
      })
    );
    expect(screen.getByText("「所有客戶」是典型幻覺語氣，缺乏事實支撐")).toBeTruthy();
  });

  it("hallucinations=[] 時不顯示幻覺訊息", () => {
    render(
      createElement(FactCheckPanel, {
        result: makeResult({
          annotations: [makeAnnotation("verified", "正常句子", { hallucinations: [] })],
        }),
      })
    );
    // 沒有幻覺訊息 div
    expect(screen.queryByText(/幻覺語氣/)).toBeNull();
  });
});

// ── 問題清單 ───────────────────────────────────────────────

describe("FactCheckPanel — 問題清單", () => {
  it("無問題時顯示「事實查核未發現問題」", () => {
    render(createElement(FactCheckPanel, { result: makeResult({ issues: [] }) }));
    expect(screen.getByText("事實查核未發現問題")).toBeTruthy();
  });

  it("有問題時顯示問題訊息", () => {
    render(
      createElement(FactCheckPanel, {
        result: makeResult({
          issues: [
            {
              severity: "error",
              type: "hallucination",
              message: "疑似幻覺：未查核的統計數字",
              context: "相關原文",
            },
          ],
        }),
      })
    );
    expect(screen.getByText(/疑似幻覺：未查核的統計數字/)).toBeTruthy();
  });
});
