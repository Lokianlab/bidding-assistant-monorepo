import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { GaugeViz } from "../GaugeViz";

// ── 無資料 ─────────────────────────────────────────────────

describe("GaugeViz — 無資料", () => {
  it("data=null 時顯示「無資料」", () => {
    render(createElement(GaugeViz, { data: null }));
    expect(screen.getByText("無資料")).toBeTruthy();
  });

  it("data=NaN 時顯示「無資料」", () => {
    render(createElement(GaugeViz, { data: NaN }));
    expect(screen.getByText("無資料")).toBeTruthy();
  });

  it("data='abc'（無法轉數字）時顯示「無資料」", () => {
    render(createElement(GaugeViz, { data: "abc" }));
    expect(screen.getByText("無資料")).toBeTruthy();
  });
});

// ── SVG 顯示 ───────────────────────────────────────────────

describe("GaugeViz — SVG 顯示", () => {
  it("渲染 SVG 元素", () => {
    const { container } = render(createElement(GaugeViz, { data: 75 }));
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("顯示數值文字", () => {
    render(createElement(GaugeViz, { data: 75 }));
    expect(screen.getByText("75")).toBeTruthy();
  });

  it("顯示最小值標籤「0」和最大值標籤「100」", () => {
    render(createElement(GaugeViz, { data: 50 }));
    expect(screen.getByText("0")).toBeTruthy();
    expect(screen.getByText("100")).toBeTruthy();
  });

  it("value=0 時不渲染 value arc（ratio=0）", () => {
    const { container } = render(createElement(GaugeViz, { data: 0 }));
    // ratio=0 → 只有 background arc，無 value arc
    const paths = container.querySelectorAll("path");
    expect(paths.length).toBe(1); // 只有 background arc
  });

  it("value>0 時渲染 value arc", () => {
    const { container } = render(createElement(GaugeViz, { data: 50 }));
    const paths = container.querySelectorAll("path");
    expect(paths.length).toBe(2); // background + value
  });
});

// ── 數值格式化 ─────────────────────────────────────────────

describe("GaugeViz — 數值格式化", () => {
  it("numberFormat=percentage 顯示百分比（75 → 75%）", () => {
    render(
      createElement(GaugeViz, {
        data: 75,
        config: { numberFormat: "percentage" },
      })
    );
    expect(screen.getByText("75%")).toBeTruthy();
  });

  it("numberFormat=currency 顯示 $前綴", () => {
    render(
      createElement(GaugeViz, {
        data: 50,
        config: { numberFormat: "currency" },
      })
    );
    expect(screen.getByText(/\$50/)).toBeTruthy();
  });
});

// ── 閾值顏色 ───────────────────────────────────────────────

describe("GaugeViz — 閾值顏色（value arc stroke）", () => {
  const threshold = { warn: 60, danger: 80 };

  it("無 threshold 時 value arc 使用預設顏色（#6366f1）", () => {
    const { container } = render(createElement(GaugeViz, { data: 50 }));
    const valuePath = container.querySelectorAll("path")[1];
    expect(valuePath.getAttribute("stroke")).toBe("#6366f1");
  });

  it("value >= danger 時 value arc 使用 #ef4444", () => {
    const { container } = render(
      createElement(GaugeViz, { data: 80, config: { threshold } })
    );
    const valuePath = container.querySelectorAll("path")[1];
    expect(valuePath.getAttribute("stroke")).toBe("#ef4444");
  });

  it("warn <= value < danger 時 value arc 使用 #f59e0b", () => {
    const { container } = render(
      createElement(GaugeViz, { data: 65, config: { threshold } })
    );
    const valuePath = container.querySelectorAll("path")[1];
    expect(valuePath.getAttribute("stroke")).toBe("#f59e0b");
  });

  it("value < warn 時 value arc 使用 #10b981", () => {
    const { container } = render(
      createElement(GaugeViz, { data: 40, config: { threshold } })
    );
    const valuePath = container.querySelectorAll("path")[1];
    expect(valuePath.getAttribute("stroke")).toBe("#10b981");
  });
});
