import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { NumberViz } from "../NumberViz";

// ── 無資料 ─────────────────────────────────────────────────

describe("NumberViz — 無資料", () => {
  it("data=null 時顯示「無資料」", () => {
    render(createElement(NumberViz, { data: null }));
    expect(screen.getByText("無資料")).toBeTruthy();
  });

  it("data=NaN 時顯示「無資料」", () => {
    render(createElement(NumberViz, { data: NaN }));
    expect(screen.getByText("無資料")).toBeTruthy();
  });

  it("data 無法轉換為數字時顯示「無資料」", () => {
    render(createElement(NumberViz, { data: "abc" }));
    expect(screen.getByText("無資料")).toBeTruthy();
  });
});

// ── 數值格式化 ─────────────────────────────────────────────

describe("NumberViz — 數值格式化", () => {
  it("預設（integer）顯示整數格式", () => {
    render(createElement(NumberViz, { data: 42 }));
    expect(screen.getByText("42")).toBeTruthy();
  });

  it("numberFormat=currency 顯示 $前綴", () => {
    render(createElement(NumberViz, {
      data: 42,
      config: { numberFormat: "currency" },
    }));
    expect(screen.getByText(/\$42/)).toBeTruthy();
  });

  it("numberFormat=percentage 顯示百分比（0.75 → 75%）", () => {
    render(createElement(NumberViz, {
      data: 0.75,
      config: { numberFormat: "percentage" },
    }));
    expect(screen.getByText("75%")).toBeTruthy();
  });

  it("numberFormat=percentage 四捨五入到整數（0.333 → 33%）", () => {
    render(createElement(NumberViz, {
      data: 0.333,
      config: { numberFormat: "percentage" },
    }));
    expect(screen.getByText("33%")).toBeTruthy();
  });
});

// ── 閾值顏色 ───────────────────────────────────────────────

describe("NumberViz — 閾值顏色", () => {
  const threshold = { warn: 60, danger: 80 };

  it("無 threshold 時數值使用 text-foreground class", () => {
    const { container } = render(createElement(NumberViz, { data: 99 }));
    expect(container.querySelector(".text-foreground")).toBeTruthy();
  });

  it("value >= danger 時使用 text-red-500", () => {
    const { container } = render(
      createElement(NumberViz, { data: 80, config: { threshold } })
    );
    expect(container.querySelector(".text-red-500")).toBeTruthy();
  });

  it("warn <= value < danger 時使用 text-amber-500", () => {
    const { container } = render(
      createElement(NumberViz, { data: 65, config: { threshold } })
    );
    expect(container.querySelector(".text-amber-500")).toBeTruthy();
  });

  it("value < warn 時使用 text-green-500", () => {
    const { container } = render(
      createElement(NumberViz, { data: 40, config: { threshold } })
    );
    expect(container.querySelector(".text-green-500")).toBeTruthy();
  });
});

// ── 趨勢箭頭 ──────────────────────────────────────────────

describe("NumberViz — 趨勢箭頭（showTrend）", () => {
  it("showTrend=false（預設）時不顯示箭頭", () => {
    const { container } = render(createElement(NumberViz, { data: 10 }));
    // showTrend 預設為 falsy，只有一個主數值 span
    const spans = container.querySelectorAll("span");
    expect(spans.length).toBe(1);
  });

  it("showTrend=true 且 value > 0 時顯示 ↑（U+2191）", () => {
    render(
      createElement(NumberViz, {
        data: 5,
        config: { showTrend: true },
      })
    );
    expect(screen.getByText("↑")).toBeTruthy();
  });

  it("showTrend=true 且 value < 0 時顯示 ↓（U+2193）", () => {
    render(
      createElement(NumberViz, {
        data: -3,
        config: { showTrend: true },
      })
    );
    expect(screen.getByText("↓")).toBeTruthy();
  });

  it("showTrend=true 且 value = 0 時顯示 →（U+2192）", () => {
    render(
      createElement(NumberViz, {
        data: 0,
        config: { showTrend: true },
      })
    );
    expect(screen.getByText("→")).toBeTruthy();
  });
});
