import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { WriterRankingTable } from "../WriterRankingTable";
import type { WriterStat } from "@/lib/dashboard/useAnalyticsMetrics";

// ── Helper ──────────────────────────────────────────────────

function makeStat(overrides?: Partial<WriterStat>): WriterStat {
  return {
    name: "王小明",
    submitted: 8,
    won: 5,
    winRate: 62,
    wonBudget: 3000000,
    ...overrides,
  };
}

// ── 空資料 ─────────────────────────────────────────────────

describe("WriterRankingTable — 空資料", () => {
  it("writerStats=[] 時顯示「尚無企劃人員資料」", () => {
    render(createElement(WriterRankingTable, { writerStats: [] }));
    expect(screen.getByText("尚無企劃人員資料")).toBeTruthy();
  });
});

// ── 表格結構 ───────────────────────────────────────────────

describe("WriterRankingTable — 表格結構", () => {
  it("顯示固定欄位標題", () => {
    render(createElement(WriterRankingTable, { writerStats: [makeStat()] }));
    expect(screen.getByText("#")).toBeTruthy();
    expect(screen.getByText("人員")).toBeTruthy();
    expect(screen.getByText("投標件數")).toBeTruthy();
    expect(screen.getByText("得標件數")).toBeTruthy();
    expect(screen.getByText("得標率")).toBeTruthy();
    expect(screen.getByText("得標金額")).toBeTruthy();
  });

  it("顯示標題卡片「企劃人員績效排行」", () => {
    render(createElement(WriterRankingTable, { writerStats: [makeStat()] }));
    expect(screen.getByText("企劃人員績效排行")).toBeTruthy();
  });
});

// ── 資料列 ─────────────────────────────────────────────────

describe("WriterRankingTable — 資料列", () => {
  it("顯示人員排名序號（從 1 開始）", () => {
    render(createElement(WriterRankingTable, { writerStats: [makeStat(), makeStat({ name: "李大華" })] }));
    expect(screen.getByText("1")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
  });

  it("顯示人員姓名", () => {
    render(createElement(WriterRankingTable, { writerStats: [makeStat()] }));
    expect(screen.getByText("王小明")).toBeTruthy();
  });

  it("顯示投標件數", () => {
    render(createElement(WriterRankingTable, { writerStats: [makeStat({ submitted: 8 })] }));
    expect(screen.getByText("8")).toBeTruthy();
  });

  it("顯示得標件數", () => {
    render(createElement(WriterRankingTable, { writerStats: [makeStat({ won: 5 })] }));
    expect(screen.getByText("5")).toBeTruthy();
  });

  it("顯示得標率 Badge 含百分比", () => {
    render(createElement(WriterRankingTable, { writerStats: [makeStat({ winRate: 62 })] }));
    expect(screen.getByText("62%")).toBeTruthy();
  });

  it("顯示得標金額（含 $）", () => {
    render(createElement(WriterRankingTable, { writerStats: [makeStat({ wonBudget: 3000000 })] }));
    expect(screen.getByText(/\$3,000,000/)).toBeTruthy();
  });
});

// ── Badge 樣式 ─────────────────────────────────────────────

describe("WriterRankingTable — 得標率 Badge", () => {
  it("winRate >= 50 時使用 default variant", () => {
    const { container } = render(
      createElement(WriterRankingTable, { writerStats: [makeStat({ winRate: 62 })] })
    );
    // default variant 有 bg-primary class
    expect(container.querySelector("[class*='bg-primary']")).toBeTruthy();
  });

  it("winRate < 50 時使用 secondary variant", () => {
    const { container } = render(
      createElement(WriterRankingTable, { writerStats: [makeStat({ winRate: 30 })] })
    );
    // secondary variant 有 bg-secondary class
    expect(container.querySelector("[class*='bg-secondary']")).toBeTruthy();
  });
});
