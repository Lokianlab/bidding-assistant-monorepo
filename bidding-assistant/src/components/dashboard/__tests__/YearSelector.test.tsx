import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createElement } from "react";
import { YearSelector } from "../YearSelector";

// Radix UI Select 在 jsdom 呼叫 scrollIntoView（jsdom 未實作）
beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

// ── 基本顯示 ───────────────────────────────────────────────

describe("YearSelector — 基本顯示", () => {
  it("渲染 Select trigger 按鈕", () => {
    const { container } = render(
      createElement(YearSelector, {
        years: [2024, 2025],
        value: 2024,
        onChange: vi.fn(),
      })
    );
    expect(container.querySelector("button")).toBeTruthy();
  });

  it("value=0 時顯示「至今總計」", () => {
    render(
      createElement(YearSelector, {
        years: [2024, 2025],
        value: 0,
        onChange: vi.fn(),
      })
    );
    expect(screen.getByText("至今總計")).toBeTruthy();
  });

  it("value=2024 時顯示「2024 年」", () => {
    render(
      createElement(YearSelector, {
        years: [2024, 2025],
        value: 2024,
        onChange: vi.fn(),
      })
    );
    expect(screen.getByText("2024 年")).toBeTruthy();
  });
});

// ── 下拉選項 ───────────────────────────────────────────────

describe("YearSelector — 下拉選項", () => {
  it("點擊後顯示「至今總計」選項", () => {
    render(
      createElement(YearSelector, {
        years: [2024, 2025],
        value: 2024,
        onChange: vi.fn(),
      })
    );
    const trigger = screen.getByRole("combobox");
    fireEvent.click(trigger);
    // 「至今總計」同時出現在 trigger 和 dropdown 中
    expect(screen.getAllByText("至今總計").length).toBeGreaterThan(0);
  });

  it("點擊後顯示所有年份選項", () => {
    render(
      createElement(YearSelector, {
        years: [2023, 2024, 2025],
        value: 0,
        onChange: vi.fn(),
      })
    );
    const trigger = screen.getByRole("combobox");
    fireEvent.click(trigger);
    expect(screen.getAllByText("2023 年").length).toBeGreaterThan(0);
    expect(screen.getAllByText("2024 年").length).toBeGreaterThan(0);
    expect(screen.getAllByText("2025 年").length).toBeGreaterThan(0);
  });

  it("選擇年份後 onChange 被呼叫，帶 Number 型別", () => {
    const onChange = vi.fn();
    render(
      createElement(YearSelector, {
        years: [2024, 2025],
        value: 0,
        onChange,
      })
    );
    const trigger = screen.getByRole("combobox");
    fireEvent.click(trigger);
    fireEvent.click(screen.getAllByText("2024 年")[0]);
    expect(onChange).toHaveBeenCalledWith(2024);
  });

  it("years=[] 時只顯示「至今總計」選項", () => {
    render(
      createElement(YearSelector, {
        years: [],
        value: 0,
        onChange: vi.fn(),
      })
    );
    const trigger = screen.getByRole("combobox");
    fireEvent.click(trigger);
    expect(screen.getAllByText("至今總計").length).toBeGreaterThan(0);
  });
});
