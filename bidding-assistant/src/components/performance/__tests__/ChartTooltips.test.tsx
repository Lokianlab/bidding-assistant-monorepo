import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import {
  ChartTooltip,
  CumulativeTooltip,
  YoYTooltip,
} from "../ChartTooltips";

// ── Helper ──────────────────────────────────────────────────

function makePayload(overrides?: object) {
  return [
    {
      color: "#3b82f6",
      name: "投標件數",
      value: 5,
      dataKey: "submitted",
      ...overrides,
    },
  ];
}

// ── ChartTooltip ────────────────────────────────────────────

describe("ChartTooltip", () => {
  it("active=false 時不渲染", () => {
    const { container } = render(
      createElement(ChartTooltip, {
        active: false,
        payload: makePayload(),
        label: "2025-01",
      })
    );
    expect(container.firstChild).toBeNull();
  });

  it("payload 為空時不渲染", () => {
    const { container } = render(
      createElement(ChartTooltip, {
        active: true,
        payload: [],
        label: "2025-01",
      })
    );
    expect(container.firstChild).toBeNull();
  });

  it("active=true 時顯示 label", () => {
    render(
      createElement(ChartTooltip, {
        active: true,
        payload: makePayload(),
        label: "2025-01",
      })
    );
    expect(screen.getByText("2025-01")).toBeTruthy();
  });

  it("顯示系列名稱和值", () => {
    render(
      createElement(ChartTooltip, {
        active: true,
        payload: makePayload(),
        label: "月份",
      })
    );
    expect(screen.getByText("投標件數:")).toBeTruthy();
    expect(screen.getByText("5")).toBeTruthy();
  });

  it("isCurrency=true 時格式化為貨幣", () => {
    render(
      createElement(ChartTooltip, {
        active: true,
        payload: makePayload({ value: 3000000, name: "得標金額" }),
        label: "月份",
        isCurrency: true,
      })
    );
    expect(screen.getByText(/3,000,000/)).toBeTruthy();
  });
});

// ── CumulativeTooltip ───────────────────────────────────────

describe("CumulativeTooltip", () => {
  it("active=false 時不渲染", () => {
    const { container } = render(
      createElement(CumulativeTooltip, {
        active: false,
        payload: makePayload(),
        label: "1月",
      })
    );
    expect(container.firstChild).toBeNull();
  });

  it("顯示 label 和值", () => {
    render(
      createElement(CumulativeTooltip, {
        active: true,
        payload: makePayload({ value: 3, name: "投標件數" }),
        label: "1月",
      })
    );
    expect(screen.getByText("1月")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
  });

  it("dataKey 以 cum 開頭時顯示「（累計）」", () => {
    render(
      createElement(CumulativeTooltip, {
        active: true,
        payload: makePayload({ dataKey: "cumSubmitted", name: "累計投標" }),
        label: "月份",
      })
    );
    expect(screen.getByText("（累計）")).toBeTruthy();
  });

  it("cumWonBudget 欄位格式化為貨幣", () => {
    render(
      createElement(CumulativeTooltip, {
        active: true,
        payload: makePayload({ dataKey: "cumWonBudget", value: 2000000, name: "累計得標金額" }),
        label: "月份",
      })
    );
    expect(screen.getByText(/2,000,000/)).toBeTruthy();
  });
});

// ── YoYTooltip ─────────────────────────────────────────────

describe("YoYTooltip", () => {
  it("active=false 時不渲染", () => {
    const { container } = render(
      createElement(YoYTooltip, {
        active: false,
        payload: makePayload(),
        label: "1月",
      })
    );
    expect(container.firstChild).toBeNull();
  });

  it("顯示 label 和系列值", () => {
    render(
      createElement(YoYTooltip, {
        active: true,
        payload: makePayload({ name: "2024年 投標件數", value: 4 }),
        label: "3月",
      })
    );
    expect(screen.getByText("3月")).toBeTruthy();
    expect(screen.getByText("4")).toBeTruthy();
  });
});
