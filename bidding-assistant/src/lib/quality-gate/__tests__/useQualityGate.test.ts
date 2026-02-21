import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { SettingsProvider } from "@/lib/context/settings-context";
import { useQualityGate } from "../useQualityGate";

// ── 測試用 wrapper ─────────────────────────────────────────

function wrapper({ children }: { children: ReactNode }) {
  return createElement(SettingsProvider, null, children);
}

beforeEach(() => {
  localStorage.clear();
});

// ── useQualityGate ─────────────────────────────────────────

describe("useQualityGate", () => {
  it("初始狀態：report = null，isAnalyzing = false", () => {
    const { result } = renderHook(() => useQualityGate(), { wrapper });
    expect(result.current.report).toBeNull();
    expect(result.current.isAnalyzing).toBe(false);
  });

  it("analyze 執行後 report 不為 null", () => {
    const { result } = renderHook(() => useQualityGate(), { wrapper });

    act(() => {
      result.current.analyze({ text: "這是一段測試建議書文字，用來驗證品質閘門功能。" });
    });

    expect(result.current.report).not.toBeNull();
    expect(result.current.isAnalyzing).toBe(false);
  });

  it("analyze 完成後 isAnalyzing 回到 false", () => {
    const { result } = renderHook(() => useQualityGate(), { wrapper });

    act(() => {
      result.current.analyze({ text: "測試文字" });
    });

    expect(result.current.isAnalyzing).toBe(false);
  });

  it("report 包含四道閘門結果", () => {
    const { result } = renderHook(() => useQualityGate(), { wrapper });

    act(() => {
      result.current.analyze({ text: "完整的建議書內容，包含各種項目說明。" });
    });

    const report = result.current.report!;
    expect(report).toHaveProperty("gate0");
    expect(report).toHaveProperty("gate1");
    expect(report).toHaveProperty("gate3");
    expect(report).toHaveProperty("overallScore");
    expect(report).toHaveProperty("verdict");
    expect(report).toHaveProperty("criticalIssues");
  });

  it("没有 requirements 時 gate2 為 null", () => {
    const { result } = renderHook(() => useQualityGate(), { wrapper });

    act(() => {
      result.current.analyze({ text: "測試文字", requirements: null });
    });

    expect(result.current.report!.gate2).toBeNull();
  });

  it("有 requirements 時 gate2 不為 null", () => {
    const { result } = renderHook(() => useQualityGate(), { wrapper });

    act(() => {
      result.current.analyze({
        text: "建議書中提到了規劃設計和執行方案的相關內容。",
        requirements: [
          { id: "R-01", source: "評分", description: "規劃設計", weight: 50, category: "評分" },
        ],
      });
    });

    expect(result.current.report!.gate2).not.toBeNull();
  });

  it("overallScore 在 0-100 之間", () => {
    const { result } = renderHook(() => useQualityGate(), { wrapper });

    act(() => {
      result.current.analyze({ text: "測試建議書" });
    });

    const score = result.current.report!.overallScore;
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("verdict 是有效值之一", () => {
    const { result } = renderHook(() => useQualityGate(), { wrapper });

    act(() => {
      result.current.analyze({ text: "測試建議書" });
    });

    const validVerdicts = ["通過", "有風險", "不建議提交"];
    expect(validVerdicts).toContain(result.current.report!.verdict);
  });

  it("clear 後 report 回到 null", () => {
    const { result } = renderHook(() => useQualityGate(), { wrapper });

    act(() => {
      result.current.analyze({ text: "測試建議書" });
    });
    expect(result.current.report).not.toBeNull();

    act(() => {
      result.current.clear();
    });
    expect(result.current.report).toBeNull();
  });

  it("空文字也不會崩潰", () => {
    const { result } = renderHook(() => useQualityGate(), { wrapper });

    expect(() => {
      act(() => {
        result.current.analyze({ text: "" });
      });
    }).not.toThrow();

    expect(result.current.report).not.toBeNull();
  });
});
