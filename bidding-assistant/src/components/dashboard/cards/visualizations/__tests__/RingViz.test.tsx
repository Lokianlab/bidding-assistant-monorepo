import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { RingViz } from "../RingViz";

// ── 無資料 ─────────────────────────────────────────────────

describe("RingViz — 無資料", () => {
  it("data=null 時顯示「無資料」", () => {
    render(createElement(RingViz, { data: null }));
    expect(screen.getByText("無資料")).toBeTruthy();
  });

  it("data=NaN 時顯示「無資料」", () => {
    render(createElement(RingViz, { data: NaN }));
    expect(screen.getByText("無資料")).toBeTruthy();
  });

  it("data='abc'（無法轉數字）時顯示「無資料」", () => {
    render(createElement(RingViz, { data: "abc" }));
    expect(screen.getByText("無資料")).toBeTruthy();
  });
});

// ── SVG 顯示 ───────────────────────────────────────────────

describe("RingViz — SVG 顯示", () => {
  it("渲染 SVG 元素", () => {
    const { container } = render(createElement(RingViz, { data: 0.75 }));
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("data=0.75 → 顯示 75%", () => {
    render(createElement(RingViz, { data: 0.75 }));
    expect(screen.getByText("75%")).toBeTruthy();
  });

  it("data=0 → 顯示 0%", () => {
    render(createElement(RingViz, { data: 0 }));
    expect(screen.getByText("0%")).toBeTruthy();
  });

  it("data=1 → 顯示 100%", () => {
    render(createElement(RingViz, { data: 1 }));
    expect(screen.getByText("100%")).toBeTruthy();
  });

  it("data=1.5 → 夾緊為 100%（ratio = Math.min(1, 1.5)）", () => {
    render(createElement(RingViz, { data: 1.5 }));
    expect(screen.getByText("100%")).toBeTruthy();
  });

  it("渲染兩個 circle（背景圈 + 進度圈）", () => {
    const { container } = render(createElement(RingViz, { data: 0.5 }));
    expect(container.querySelectorAll("circle").length).toBe(2);
  });
});

// ── 閾值顏色 ───────────────────────────────────────────────

describe("RingViz — 閾值顏色（progress circle stroke）", () => {
  const threshold = { warn: 0.6, danger: 0.8 };

  it("無 threshold 時 progress circle 使用預設顏色（#6366f1）", () => {
    const { container } = render(createElement(RingViz, { data: 0.5 }));
    // 第二個 circle 是 progress ring（有 strokeDasharray）
    const circles = container.querySelectorAll("circle");
    expect(circles[1].getAttribute("stroke")).toBe("#6366f1");
  });

  it("value >= danger 時使用 #ef4444", () => {
    const { container } = render(
      createElement(RingViz, { data: 0.8, config: { threshold } })
    );
    const circles = container.querySelectorAll("circle");
    expect(circles[1].getAttribute("stroke")).toBe("#ef4444");
  });

  it("warn <= value < danger 時使用 #f59e0b", () => {
    const { container } = render(
      createElement(RingViz, { data: 0.65, config: { threshold } })
    );
    const circles = container.querySelectorAll("circle");
    expect(circles[1].getAttribute("stroke")).toBe("#f59e0b");
  });

  it("value < warn 時使用 #10b981", () => {
    const { container } = render(
      createElement(RingViz, { data: 0.4, config: { threshold } })
    );
    const circles = container.querySelectorAll("circle");
    expect(circles[1].getAttribute("stroke")).toBe("#10b981");
  });
});
