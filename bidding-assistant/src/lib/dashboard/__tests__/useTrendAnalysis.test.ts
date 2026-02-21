import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useTrendAnalysis } from "../useTrendAnalysis";
import type { NotionPage } from "../types";
import { F } from "../types";

// ── 測試資料工廠 ──────────────────────────────────────────

function makePage(overrides: {
  deadline: string;
  status?: string;
  budget?: number;
  bidCost?: number;
  fee?: number;
}): NotionPage {
  return {
    id: Math.random().toString(36).slice(2),
    url: "",
    properties: {
      [F.截標]: overrides.deadline,
      [F.進程]: overrides.status ?? "準備中",
      [F.預算]: overrides.budget ?? 1_000_000,
      [F.押標金]: overrides.bidCost ?? 10_000,
      [F.領標費]: overrides.fee ?? 500,
    },
  };
}

// ── 固定時間 ──────────────────────────────────────────────

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2025-06-15T12:00:00"));
});

afterEach(() => {
  vi.useRealTimers();
});

// ── 基本行為 ──────────────────────────────────────────────

describe("useTrendAnalysis", () => {
  it("空資料回傳空結果", () => {
    const { result } = renderHook(() => useTrendAnalysis([]));
    expect(result.current.monthlyMetrics).toEqual([]);
    expect(result.current.rollingMetrics).toEqual([]);
    expect(result.current.quarterComparison).toBeNull();
    expect(result.current.recentMetrics).toEqual([]);
    expect(result.current.recentMonths).toHaveLength(6);
  });

  it("回傳正確的 recentMonths（近 6 個月）", () => {
    const { result } = renderHook(() => useTrendAnalysis([]));
    expect(result.current.recentMonths).toEqual([
      "2025-01", "2025-02", "2025-03", "2025-04", "2025-05", "2025-06",
    ]);
  });

  it("正確計算月度指標", () => {
    const pages = [
      makePage({ deadline: "2025-03-10", status: "得標", budget: 5_000_000 }),
      makePage({ deadline: "2025-03-20", status: "未獲青睞" }),
      makePage({ deadline: "2025-04-05", status: "得標", budget: 3_000_000 }),
    ];
    const { result } = renderHook(() => useTrendAnalysis(pages));
    expect(result.current.monthlyMetrics).toHaveLength(2);
    expect(result.current.monthlyMetrics[0].month).toBe("2025-03");
    expect(result.current.monthlyMetrics[0].won).toBe(1);
    expect(result.current.monthlyMetrics[0].lost).toBe(1);
    expect(result.current.monthlyMetrics[1].month).toBe("2025-04");
    expect(result.current.monthlyMetrics[1].won).toBe(1);
  });

  it("rollingMetrics 正確計算 3 個月滾動勝率", () => {
    const pages = [
      makePage({ deadline: "2025-01-10", status: "得標" }),
      makePage({ deadline: "2025-01-20", status: "未獲青睞" }),
      makePage({ deadline: "2025-02-10", status: "得標" }),
      makePage({ deadline: "2025-02-20", status: "未獲青睞" }),
      makePage({ deadline: "2025-03-10", status: "得標" }),
      makePage({ deadline: "2025-03-20", status: "得標" }),
      makePage({ deadline: "2025-04-10", status: "未獲青睞" }),
    ];
    const { result } = renderHook(() => useTrendAnalysis(pages));

    // 前 2 個月：rollingWinRate 為 null
    expect(result.current.rollingMetrics[0].rollingWinRate).toBeNull();
    expect(result.current.rollingMetrics[1].rollingWinRate).toBeNull();
    // 第 3 個月（1-3月）：won=4, concluded=6 → 67%
    expect(result.current.rollingMetrics[2].rollingWinRate).toBe(67);
  });

  it("recentMetrics 只包含近 6 個月的資料", () => {
    const pages = [
      makePage({ deadline: "2024-06-01", status: "得標" }),
      makePage({ deadline: "2025-01-01", status: "得標" }),
      makePage({ deadline: "2025-03-01", status: "得標" }),
      makePage({ deadline: "2025-05-01", status: "得標" }),
    ];
    const { result } = renderHook(() => useTrendAnalysis(pages));
    // 2024-06 不在近 6 個月（2025-01~06）
    const recentMonths = result.current.recentMetrics.map((m) => m.month);
    expect(recentMonths).not.toContain("2024-06");
    expect(recentMonths).toContain("2025-01");
    expect(recentMonths).toContain("2025-03");
    expect(recentMonths).toContain("2025-05");
  });

  it("quarterComparison 計算當季 vs 上季", () => {
    // 時間固定在 2025-06-15 → Q2（4-6月），比較 Q1（1-3月）
    const pages = [
      makePage({ deadline: "2025-01-10", status: "得標", budget: 2_000_000 }),
      makePage({ deadline: "2025-02-10", status: "未獲青睞" }),
      makePage({ deadline: "2025-04-10", status: "得標", budget: 5_000_000 }),
      makePage({ deadline: "2025-05-10", status: "得標", budget: 3_000_000 }),
    ];
    const { result } = renderHook(() => useTrendAnalysis(pages));
    expect(result.current.quarterComparison).not.toBeNull();
    expect(result.current.quarterComparison!.currentLabel).toBe("2025 Q2");
    expect(result.current.quarterComparison!.previousLabel).toBe("2025 Q1");
    // Q2: won=2, total=2
    expect(result.current.quarterComparison!.current.won).toBe(2);
    // Q1: won=1, total=2
    expect(result.current.quarterComparison!.previous.won).toBe(1);
  });

  it("所有回傳欄位型別正確", () => {
    const pages = [
      makePage({ deadline: "2025-05-01", status: "得標" }),
    ];
    const { result } = renderHook(() => useTrendAnalysis(pages));

    expect(Array.isArray(result.current.monthlyMetrics)).toBe(true);
    expect(Array.isArray(result.current.rollingMetrics)).toBe(true);
    expect(Array.isArray(result.current.recentMetrics)).toBe(true);
    expect(Array.isArray(result.current.recentMonths)).toBe(true);
    // quarterComparison 可能是 object 或 null
    expect(
      result.current.quarterComparison === null ||
      typeof result.current.quarterComparison === "object"
    ).toBe(true);
  });
});
