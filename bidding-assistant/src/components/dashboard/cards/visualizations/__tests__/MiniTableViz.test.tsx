import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { MiniTableViz } from "../MiniTableViz";

// ── 無資料 ─────────────────────────────────────────────────

describe("MiniTableViz — 無資料", () => {
  it("data=null 時顯示「無資料」", () => {
    render(createElement(MiniTableViz, { data: null }));
    expect(screen.getByText("無資料")).toBeTruthy();
  });

  it("data=[] 時顯示「無資料」", () => {
    render(createElement(MiniTableViz, { data: [] }));
    expect(screen.getByText("無資料")).toBeTruthy();
  });

  it("data 為數字時顯示「無資料」", () => {
    render(createElement(MiniTableViz, { data: 42 }));
    expect(screen.getByText("無資料")).toBeTruthy();
  });
});

// ── 表格結構 ───────────────────────────────────────────────

describe("MiniTableViz — 表格結構", () => {
  const singleRow = [{ name: "台北市工程", value: 100 }];

  it("渲染 table 元素", () => {
    const { container } = render(createElement(MiniTableViz, { data: singleRow }));
    expect(container.querySelector("table")).toBeTruthy();
  });

  it("自動偵測 name 欄位為 nameKey，顯示為 header", () => {
    render(createElement(MiniTableViz, { data: singleRow }));
    expect(screen.getByText("name")).toBeTruthy();
  });

  it("自動偵測 value 欄位為 valueKey，顯示為 header", () => {
    render(createElement(MiniTableViz, { data: singleRow }));
    expect(screen.getByText("value")).toBeTruthy();
  });

  it("顯示資料列的 name 值", () => {
    render(createElement(MiniTableViz, { data: singleRow }));
    expect(screen.getByText("台北市工程")).toBeTruthy();
  });

  it("顯示資料列的 value 值（整數格式）", () => {
    render(createElement(MiniTableViz, { data: singleRow }));
    expect(screen.getByText("100")).toBeTruthy();
  });

  it("字串欄位值直接顯示", () => {
    const data = [{ name: "A", label: "甲" }];
    render(createElement(MiniTableViz, { data }));
    expect(screen.getByText("甲")).toBeTruthy();
  });
});

// ── 數值格式化 ─────────────────────────────────────────────

describe("MiniTableViz — 數值格式化", () => {
  it("numberFormat=currency 顯示 $ 前綴", () => {
    const data = [{ name: "A", value: 50 }];
    render(
      createElement(MiniTableViz, {
        data,
        config: { numberFormat: "currency" },
      })
    );
    expect(screen.getByText(/\$50/)).toBeTruthy();
  });

  it("numberFormat=percentage 顯示百分比（0.5 → 50%）", () => {
    const data = [{ name: "A", value: 0.5 }];
    render(
      createElement(MiniTableViz, {
        data,
        config: { numberFormat: "percentage" },
      })
    );
    expect(screen.getByText("50%")).toBeTruthy();
  });
});

// ── 列數上限 ───────────────────────────────────────────────

describe("MiniTableViz — 10 列上限", () => {
  it("12 筆資料顯示「...共 12 筆」提示", () => {
    const data = Array.from({ length: 12 }, (_, i) => ({ name: `項目${i}`, value: i }));
    render(createElement(MiniTableViz, { data }));
    expect(screen.getByText(/共 12 筆/)).toBeTruthy();
  });

  it("10 筆資料不顯示「...共」提示", () => {
    const data = Array.from({ length: 10 }, (_, i) => ({ name: `項目${i}`, value: i }));
    render(createElement(MiniTableViz, { data }));
    expect(screen.queryByText(/共 10 筆/)).toBeNull();
  });
});
