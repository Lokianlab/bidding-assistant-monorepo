import { describe, it, expect, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { SettingsProvider } from "@/lib/context/settings-context";
import { useFitScore } from "../useFitScore";
import type { IntelligenceInputs } from "../types";
import type { KnowledgeBaseData } from "@/lib/knowledge-base/types";

// ── Helpers ──────────────────────────────────────────────────

function wrapper({ children }: { children: ReactNode }) {
  return createElement(SettingsProvider, null, children);
}

const emptyIntel: IntelligenceInputs = {
  selfAnalysis: null,
  marketTrend: null,
  tenderSummary: null,
};

const emptyKB: KnowledgeBaseData = {
  "00A": [],
  "00B": [],
  "00C": [],
  "00D": [],
  "00E": [],
  lastUpdated: "",
  version: 1,
};

beforeEach(() => {
  localStorage.clear();
});

// ── Tests ────────────────────────────────────────────────────

describe("useFitScore", () => {
  it("空案名回傳 null", () => {
    const { result } = renderHook(
      () => useFitScore("", "臺北市政府", null, emptyIntel, emptyKB),
      { wrapper },
    );
    expect(result.current.fitScore).toBeNull();
    expect(result.current.kbMatch).toBeNull();
  });

  it("純空白案名回傳 null", () => {
    const { result } = renderHook(
      () => useFitScore("   ", "臺北市政府", null, emptyIntel, emptyKB),
      { wrapper },
    );
    expect(result.current.fitScore).toBeNull();
    expect(result.current.kbMatch).toBeNull();
  });

  it("有效案名回傳 FitScore 物件", () => {
    const { result } = renderHook(
      () => useFitScore("藝術節策展執行", "臺北市政府", 3_000_000, emptyIntel, emptyKB),
      { wrapper },
    );
    expect(result.current.fitScore).not.toBeNull();
    expect(typeof result.current.fitScore!.total).toBe("number");
    expect(result.current.fitScore!.total).toBeGreaterThanOrEqual(0);
    expect(result.current.fitScore!.total).toBeLessThanOrEqual(100);
  });

  it("有效案名回傳 KBMatchResult 物件", () => {
    const { result } = renderHook(
      () => useFitScore("藝術節策展執行", "臺北市政府", null, emptyIntel, emptyKB),
      { wrapper },
    );
    expect(result.current.kbMatch).not.toBeNull();
    expect(Array.isArray(result.current.kbMatch!.team)).toBe(true);
    expect(Array.isArray(result.current.kbMatch!.portfolio)).toBe(true);
  });

  it("FitScore 包含五個維度", () => {
    const { result } = renderHook(
      () => useFitScore("展覽規劃與執行", "文化部", 5_000_000, emptyIntel, emptyKB),
      { wrapper },
    );
    const dims = result.current.fitScore!.dimensions;
    expect(dims).toHaveProperty("domain");
    expect(dims).toHaveProperty("agency");
    expect(dims).toHaveProperty("competition");
    expect(dims).toHaveProperty("scale");
    expect(dims).toHaveProperty("team");
  });

  it("FitScore 包含有效的 verdict", () => {
    const { result } = renderHook(
      () => useFitScore("活動規劃服務", "教育部", 1_000_000, emptyIntel, emptyKB),
      { wrapper },
    );
    const validVerdicts = ["建議投標", "值得評估", "不建議", "資料不足"];
    expect(validVerdicts).toContain(result.current.fitScore!.verdict);
  });

  it("預算為 null 不會崩潰", () => {
    const { result } = renderHook(
      () => useFitScore("文化推廣計畫", "文化部", null, emptyIntel, emptyKB),
      { wrapper },
    );
    expect(result.current.fitScore).not.toBeNull();
  });

  it("讀取設定中的自訂權重（scale 獨佔 100%）", () => {
    // emptyKB + emptyIntel + null budget 下各維預設分：
    //   domain=0, agency=5, competition=10, scale=10, team=0
    // 自訂 scale=100 其他=0：total = round(10*100/100*5) = 50
    // 若用預設權重 (all 20)：total = round(500/100*5) = 25
    localStorage.setItem(
      "bidding-assistant-settings",
      JSON.stringify({
        strategy: {
          fitWeights: { domain: 0, agency: 0, competition: 0, scale: 100, team: 0 },
        },
      }),
    );
    const { result } = renderHook(
      () => useFitScore("測試案件", "測試機關", null, emptyIntel, emptyKB),
      { wrapper },
    );
    expect(result.current.fitScore!.total).toBe(50);
  });

  it("相同參數再渲染不重新計算（useMemo）", () => {
    const { result, rerender } = renderHook(
      () => useFitScore("藝術節策展執行", "臺北市政府", 3_000_000, emptyIntel, emptyKB),
      { wrapper },
    );
    const first = result.current;
    rerender();
    // deps 未變 → useMemo 不重算 → 同一 object reference
    expect(result.current).toBe(first);
  });
});
