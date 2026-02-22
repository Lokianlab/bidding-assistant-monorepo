import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { HeatmapViz } from "../HeatmapViz";

// ── 無資料 ─────────────────────────────────────────────────

describe("HeatmapViz — 無資料", () => {
  it("data=null 時顯示「無資料」", () => {
    render(createElement(HeatmapViz, { data: null }));
    expect(screen.getByText("無資料")).toBeTruthy();
  });

  it("data=[] 時顯示「無資料」", () => {
    render(createElement(HeatmapViz, { data: [] }));
    expect(screen.getByText("無資料")).toBeTruthy();
  });

  it("data 中沒有陣列元素時顯示「無資料」", () => {
    // 非二維矩陣——每個元素都不是 Array
    render(createElement(HeatmapViz, { data: [{ name: "A" }, 42, "text"] }));
    expect(screen.getByText("無資料")).toBeTruthy();
  });
});

// ── 格子渲染 ───────────────────────────────────────────────

describe("HeatmapViz — 格子渲染", () => {
  it("渲染正確數量的格子（2×3 矩陣 = 6 格）", () => {
    const matrix = [
      [1, 2, 3],
      [4, 5, 6],
    ];
    const { container } = render(createElement(HeatmapViz, { data: matrix }));
    // 每個格子有 title 屬性
    expect(container.querySelectorAll("[title]").length).toBe(6);
  });

  it("每個格子顯示對應數值", () => {
    const matrix = [[10, 20]];
    render(createElement(HeatmapViz, { data: matrix }));
    expect(screen.getByText("10")).toBeTruthy();
    expect(screen.getByText("20")).toBeTruthy();
  });

  it("格子的 title 屬性包含數值字串", () => {
    const matrix = [[42]];
    const { container } = render(createElement(HeatmapViz, { data: matrix }));
    const cell = container.querySelector("[title]");
    expect(cell?.getAttribute("title")).toBe("42");
  });
});

// ── 顏色計算 ───────────────────────────────────────────────

describe("HeatmapViz — 格子背景顏色", () => {
  it("所有值相同時使用固定顏色（rgba(99, 102, 241, 0.5)）", () => {
    const matrix = [[5, 5], [5, 5]];
    const { container } = render(createElement(HeatmapViz, { data: matrix }));
    const cells = container.querySelectorAll("[title]");
    // max === min → 固定顏色
    const style = (cells[0] as HTMLElement).getAttribute("style") ?? "";
    expect(style).toContain("rgba(99, 102, 241, 0.5)");
  });

  it("最小值格子 alpha≈0.1（最淺）", () => {
    const matrix = [[0, 1]]; // min=0, max=1, ratio for 0 = 0
    const { container } = render(createElement(HeatmapViz, { data: matrix }));
    const cells = container.querySelectorAll("[title]");
    // cells[0] has value=0 (min), alpha = 0.1 + 0 * 0.9 = 0.10
    // jsdom 正規化：0.10 → 0.1
    const style0 = (cells[0] as HTMLElement).getAttribute("style") ?? "";
    expect(style0).toContain("rgba(99, 102, 241, 0.1)");
  });

  it("最大值格子 alpha=1（最深，jsdom 正規化為 rgb）", () => {
    const matrix = [[0, 1]]; // max=1
    const { container } = render(createElement(HeatmapViz, { data: matrix }));
    const cells = container.querySelectorAll("[title]");
    // cells[1] has value=1 (max), alpha = 0.1 + 1 * 0.9 = 1.00
    // jsdom 正規化：rgba(_, _, _, 1) → rgb(_, _, _)
    const style1 = (cells[1] as HTMLElement).getAttribute("style") ?? "";
    expect(style1).toContain("rgb(99, 102, 241)");
  });
});
