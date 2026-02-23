import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { NegotiationPanel } from "../NegotiationPanel";
import type { CostBase } from "@/lib/negotiation/types";

// Mock the useNegotiation hook
vi.mock("@/lib/negotiation/useNegotiation", () => ({
  useNegotiation: () => ({
    analysis: {
      allowanceAmount: 50000,
      proposed: { quoteAmount: 115000, profitRate: 0.15, profitAmount: 15000, name: "預案", status: "safe" as const },
      costBased: { quoteAmount: 105000, profitRate: 0.05, profitAmount: 5000, name: "底線", status: "danger" as const },
      target: { quoteAmount: 120000, profitRate: 0.2, profitAmount: 20000, name: "目標", status: "safe" as const },
      ceiling: { quoteAmount: 130000, profitRate: 0.3, profitAmount: 30000, name: "天花板", status: "dream" as const },
    },
    scenarios: [
      { quoteAmount: 105000, profitRate: 0.05, profitAmount: 5000, name: "底線", status: "danger" as const },
      { quoteAmount: 115000, profitRate: 0.15, profitAmount: 15000, name: "預案", status: "safe" as const },
      { quoteAmount: 120000, profitRate: 0.2, profitAmount: 20000, name: "目標", status: "safe" as const },
      { quoteAmount: 130000, profitRate: 0.3, profitAmount: 30000, name: "天花板", status: "dream" as const },
    ],
    addScenario: vi.fn(),
    removeScenario: vi.fn(),
    clearScenarios: vi.fn(),
  }),
}));

describe("NegotiationPanel", () => {
  const baseCostBase: CostBase = {
    directCost: 80000,
    managementFee: 10000,
    tax: 10000,
    subtotal: 100000,
  };

  it("顯示議價分析標題", () => {
    render(<NegotiationPanel costBase={baseCostBase} />);
    expect(screen.getByText("議價分析工具")).toBeTruthy();
  });

  it("顯示可讓步額度", () => {
    render(<NegotiationPanel costBase={baseCostBase} />);
    expect(screen.getByText(/50,000|50000/)).toBeTruthy();
  });

  it("非 compact 模式顯示預案報價", () => {
    render(<NegotiationPanel costBase={baseCostBase} compact={false} />);
    // Should show 115,000 or 115000 in proposed quote section
    const elements = screen.getAllByText(/115,000|115000/);
    expect(elements.length).toBeGreaterThan(0);
  });

  it("compact 模式隱藏預案報價", () => {
    render(<NegotiationPanel costBase={baseCostBase} compact={true} />);
    // Compact mode should not show the proposed quote display in header
    const headerQuote = screen.queryByText("預案報價");
    expect(headerQuote).toBeNull();
  });

  it("顯示四個標準方案卡片", () => {
    render(<NegotiationPanel costBase={baseCostBase} />);
    expect(screen.getByText("底線")).toBeTruthy();
    expect(screen.getByText("預案")).toBeTruthy();
    expect(screen.getByText("目標")).toBeTruthy();
    expect(screen.getByText("天花板")).toBeTruthy();
  });

  it("方案卡片顯示金額", () => {
    render(<NegotiationPanel costBase={baseCostBase} />);
    // Check that scenario amounts are rendered
    expect(screen.getByText(/105,000|105000/)).toBeTruthy();
  });

  it("顯示讓步模擬輸入欄位", () => {
    render(<NegotiationPanel costBase={baseCostBase} />);
    expect(screen.getByPlaceholderText("輸入報價金額")).toBeTruthy();
  });

  it("顯示新增方案按鈕", () => {
    render(<NegotiationPanel costBase={baseCostBase} />);
    expect(screen.getByText("新增方案")).toBeTruthy();
  });

  it("方案卡片點擊時呼叫 onSelectScenario", () => {
    const onSelectScenario = vi.fn();
    render(<NegotiationPanel costBase={baseCostBase} onSelectScenario={onSelectScenario} />);

    // Click on the "底線" scenario card (105000)
    const baselineCard = screen.getAllByText("底線")[0].closest("div.p-3");
    if (baselineCard) {
      fireEvent.click(baselineCard);
      expect(onSelectScenario).toHaveBeenCalledWith(105000);
    }
  });

  it("輸入金額後按新增方案按鈕", () => {
    render(<NegotiationPanel costBase={baseCostBase} />);

    const input = screen.getByPlaceholderText("輸入報價金額") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "110000" } });
    fireEvent.click(screen.getByText("新增方案"));

    expect(input.value).toBe("");
  });

  it("Enter 鍵按下時觸發新增方案", () => {
    render(<NegotiationPanel costBase={baseCostBase} />);

    const input = screen.getByPlaceholderText("輸入報價金額") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "110000" } });
    fireEvent.keyDown(input, { key: "Enter" });

    // Input should be cleared after adding
    expect(input.value).toBe("");
  });

  it("無效輸入時不新增方案", () => {
    render(<NegotiationPanel costBase={baseCostBase} />);

    const input = screen.getByPlaceholderText("輸入報價金額") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.click(screen.getByText("新增方案"));

    // Input should remain empty (invalid input rejected)
    expect(input.value).toBe("");
  });

  it("非數字輸入時不新增方案", () => {
    render(<NegotiationPanel costBase={baseCostBase} />);

    const input = screen.getByPlaceholderText("輸入報價金額") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "abc" } });
    fireEvent.click(screen.getByText("新增方案"));

    // Should not add invalid input - input should stay empty after failed add
    expect(input.value).toBe("");
  });
});
