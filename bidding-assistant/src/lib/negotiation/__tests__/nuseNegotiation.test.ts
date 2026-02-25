import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useNegotiation, useSensitivityAnalysis } from "../useNegotiation";
import { useSettings } from "@/lib/context/settings-context";
import type { CostBase, NegotiationConfig } from "../types";

// Mock useSettings
vi.mock("@/lib/context/settings-context", () => ({
  useSettings: vi.fn(),
}));

describe("useNegotiation Hook", () => {
  const mockCostBase: CostBase = {
    directCost: 1000000,
    managementFee: 100000,
    tax: 110000,
    subtotal: 1210000,
  };

  const mockSettings = {
    modules: {
      negotiation: {
        minMargin: 0.05,
        expectedMargin: 0.15,
        idealMargin: 0.2,
        maxMargin: 0.3,
      },
    },
  };

  beforeEach(() => {
    vi.mocked(useSettings).mockReturnValue({
      settings: mockSettings,
      updateSettings: vi.fn(),
      updateSection: vi.fn(),
      isLoading: false,
    } as any);
  });

  describe("初始化", () => {
    it("無成本基礎時返回 null", () => {
      const { result } = renderHook(() => useNegotiation(null));

      expect(result.current.analysis).toBeNull();
      expect(result.current.isLoading).toBe(true);
    });

    it("有成本基礎時計算分析", () => {
      const { result } = renderHook(() => useNegotiation(mockCostBase));

      expect(result.current.analysis).not.toBeNull();
      expect(result.current.analysis?.proposed).toBeDefined();
      expect(result.current.isLoading).toBe(false);
    });

    it("初始化時包含四個標準方案", () => {
      const { result } = renderHook(() => useNegotiation(mockCostBase));

      expect(result.current.scenarios).toHaveLength(4);
      expect(result.current.scenarios.map((s) => s.name)).toEqual(["底線", "預案", "目標", "天花板"]);
    });
  });

  describe("自訂設定", () => {
    it("自訂設定覆蓋預設值", () => {
      const customConfig = { minMargin: 0.1, expectedMargin: 0.25 };
      const { result } = renderHook(() => useNegotiation(mockCostBase, customConfig));

      expect(result.current.analysis?.costBased.profitRate).toBeGreaterThan(0.08);
    });

    it("設定變更時重新計算", () => {
      const { result, rerender } = renderHook(
        ({ config }: { config: Partial<NegotiationConfig> | undefined }) => useNegotiation(mockCostBase, config),
        { initialProps: { config: undefined as Partial<NegotiationConfig> | undefined } }
      );

      const firstProposed = result.current.analysis?.proposed.quoteAmount;

      rerender({ config: { expectedMargin: 0.25 } });

      const secondProposed = result.current.analysis?.proposed.quoteAmount;

      expect(secondProposed).toBeGreaterThan(firstProposed || 0);
    });
  });

  describe("互動功能", () => {
    it("addScenario 新增自訂方案", () => {
      const { result } = renderHook(() => useNegotiation(mockCostBase));

      act(() => {
        result.current.addScenario("讓步 100k", 1200000);
      });

      expect(result.current.scenarios).toHaveLength(5);
      expect(result.current.scenarios[4].name).toBe("讓步 100k");
      expect(result.current.scenarios[4].quoteAmount).toBe(1200000);
    });

    it("removeScenario 移除自訂方案", () => {
      const { result } = renderHook(() => useNegotiation(mockCostBase));

      act(() => {
        result.current.addScenario("方案 A", 1100000);
        result.current.addScenario("方案 B", 1050000);
      });

      expect(result.current.scenarios).toHaveLength(6);

      act(() => {
        result.current.removeScenario(4); // 移除第一個自訂方案
      });

      expect(result.current.scenarios).toHaveLength(5);
      expect(result.current.scenarios[4].name).toBe("方案 B");
    });

    it("clearScenarios 清除所有自訂方案", () => {
      const { result } = renderHook(() => useNegotiation(mockCostBase));

      act(() => {
        result.current.addScenario("方案 A", 1100000);
        result.current.addScenario("方案 B", 1050000);
      });

      expect(result.current.scenarios).toHaveLength(6);

      act(() => {
        result.current.clearScenarios();
      });

      expect(result.current.scenarios).toHaveLength(4);
    });

    it("移除索引越界時無反應", () => {
      const { result } = renderHook(() => useNegotiation(mockCostBase));

      act(() => {
        result.current.addScenario("方案", 1100000);
      });

      const initialLength = result.current.scenarios.length;

      act(() => {
        result.current.removeScenario(999);
      });

      expect(result.current.scenarios).toHaveLength(initialLength);
    });
  });

  describe("邊界條件", () => {
    it("成本基礎變更時重新計算", () => {
      const { result, rerender } = renderHook(
        ({ cost }) => useNegotiation(cost),
        { initialProps: { cost: mockCostBase } }
      );

      const firstProposed = result.current.analysis?.proposed.quoteAmount;

      const newCostBase: CostBase = {
        ...mockCostBase,
        subtotal: 2000000,
      };

      rerender({ cost: newCostBase });

      const secondProposed = result.current.analysis?.proposed.quoteAmount;

      expect(secondProposed).toBeGreaterThan(firstProposed || 0);
    });

    it("無設定時使用預設值", () => {
      vi.mocked(useSettings).mockReturnValue({
        settings: undefined,
        updateSettings: vi.fn(),
        updateSection: vi.fn(),
        isLoading: false,
      } as any);

      const { result } = renderHook(() => useNegotiation(mockCostBase));

      expect(result.current.analysis?.costBased.profitRate).toBe(0.05); // 預設 minMargin
    });

    it("重複新增相同方案時忽略", () => {
      const { result } = renderHook(() => useNegotiation(mockCostBase));

      act(() => {
        result.current.addScenario("方案 A", 1100000);
      });

      const firstLength = result.current.scenarios.length;

      act(() => {
        result.current.addScenario("方案 A", 1100000); // 重複
      });

      expect(result.current.scenarios).toHaveLength(firstLength);
    });
  });

  describe("Hook 依賴自動更新", () => {
    it("costBase 改變時自動重新計算", () => {
      const { result, rerender } = renderHook(
        ({ cost }) => useNegotiation(cost),
        { initialProps: { cost: mockCostBase } }
      );

      const firstTotal = result.current.analysis?.proposed.quoteAmount;

      rerender({ cost: { ...mockCostBase, subtotal: 2000000 } });

      const secondTotal = result.current.analysis?.proposed.quoteAmount;

      expect(firstTotal).not.toEqual(secondTotal);
    });

    it("customConfig 改變時自動重新計算", () => {
      const { result, rerender } = renderHook(
        ({ config }: { config: Partial<NegotiationConfig> | undefined }) => useNegotiation(mockCostBase, config),
        { initialProps: { config: undefined as Partial<NegotiationConfig> | undefined } }
      );

      const firstTotal = result.current.analysis?.proposed.quoteAmount;

      rerender({ config: { expectedMargin: 0.25 } });

      const secondTotal = result.current.analysis?.proposed.quoteAmount;

      expect(secondTotal).toBeGreaterThan(firstTotal || 0);
    });
  });
});

describe("useSensitivityAnalysis Hook", () => {
  const mockCostBase: CostBase = {
    directCost: 1000000,
    managementFee: 100000,
    tax: 110000,
    subtotal: 1210000,
  };

  const mockSettings = {
    modules: {
      negotiation: {
        minMargin: 0.05,
        expectedMargin: 0.15,
        idealMargin: 0.2,
        maxMargin: 0.3,
      },
    },
  };

  beforeEach(() => {
    vi.mocked(useSettings).mockReturnValue({
      settings: mockSettings,
      updateSettings: vi.fn(),
      updateSection: vi.fn(),
      isLoading: false,
    } as any);
  });

  it("無成本基礎時返回 null", () => {
    const { result } = renderHook(() => useSensitivityAnalysis(null));

    expect(result.current).toBeNull();
  });

  it("有成本基礎時計算敏感度分析", () => {
    const { result } = renderHook(() => useSensitivityAnalysis(mockCostBase));

    expect(result.current).not.toBeNull();
    expect(result.current?.scenarios).toBeDefined();
    expect(result.current?.scenarios.length).toBeGreaterThan(0);
  });

  it("預設包含 5 個變化場景", () => {
    const { result } = renderHook(() => useSensitivityAnalysis(mockCostBase));

    expect(result.current?.scenarios).toHaveLength(5);
  });

  it("成本變化時報價跟著變化", () => {
    const { result } = renderHook(() => useSensitivityAnalysis(mockCostBase));

    const scenarios = result.current?.scenarios || [];
    const decreaseQuote = scenarios[0]?.proposed.quoteAmount; // -10%
    const baselineQuote = scenarios[2]?.proposed.quoteAmount; // 0%
    const increaseQuote = scenarios[4]?.proposed.quoteAmount; // +10%

    expect(decreaseQuote).toBeLessThan(baselineQuote || 0);
    expect(increaseQuote).toBeGreaterThan(baselineQuote || 0);
  });

  it("costBase 改變時重新計算", () => {
    const { result, rerender } = renderHook(
      ({ cost }) => useSensitivityAnalysis(cost),
      { initialProps: { cost: mockCostBase } }
    );

    const firstBaseCost = result.current?.baseCost;

    const newCostBase: CostBase = {
      ...mockCostBase,
      subtotal: 2000000,
    };

    rerender({ cost: newCostBase });

    const secondBaseCost = result.current?.baseCost;

    expect(secondBaseCost).toBeGreaterThan(firstBaseCost || 0);
  });

  it("記錄基準成本", () => {
    const { result } = renderHook(() => useSensitivityAnalysis(mockCostBase));

    expect(result.current?.baseCost).toBe(mockCostBase.subtotal);
  });

  it("計算成本變化影響", () => {
    const { result } = renderHook(() => useSensitivityAnalysis(mockCostBase));

    const scenarios = result.current?.scenarios || [];
    scenarios.forEach((scenario) => {
      // 每個場景都應該有 impact 信息
      expect(scenario.impact).toBeDefined();
      expect(scenario.impact.costChange).toBeDefined();
      expect(scenario.impact.quoteChange).toBeDefined();
      expect(scenario.impact.profitChangeRate).toBeDefined();
    });
  });
});
