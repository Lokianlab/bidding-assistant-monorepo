import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { PeriodStatusTable } from "../PeriodStatusTable";
import type { PeriodStatusRow } from "@/lib/dashboard/useAnalyticsMetrics";
import { BID_STATUS } from "@/lib/constants/bid-status";

// ── Helper ──────────────────────────────────────────────────

function makeRow(overrides?: Partial<PeriodStatusRow>): PeriodStatusRow {
  return {
    key: "2025-01",
    label: "2025年1月",
    dateRange: "2025/01/01 - 2025/01/31",
    total: 5,
    statusCounts: {
      [BID_STATUS.得標]: 2,
      [BID_STATUS.未獲青睞]: 1,
    },
    ...overrides,
  };
}

// ── 空資料 ─────────────────────────────────────────────────

describe("PeriodStatusTable — 空資料", () => {
  it("data=[] 時顯示「尚無資料」", () => {
    render(createElement(PeriodStatusTable, { data: [], timeGranularity: "month" }));
    expect(screen.getByText("尚無資料")).toBeTruthy();
  });
});

// ── 標題與欄位 ─────────────────────────────────────────────

describe("PeriodStatusTable — 標題與欄位", () => {
  it("timeGranularity=month 時標題含「月份」", () => {
    render(createElement(PeriodStatusTable, { data: [makeRow()], timeGranularity: "month" }));
    expect(screen.getByText("月份狀態統計明細")).toBeTruthy();
  });

  it("timeGranularity=week 時標題含「週次」", () => {
    render(createElement(PeriodStatusTable, { data: [makeRow()], timeGranularity: "week" }));
    expect(screen.getByText("週次狀態統計明細")).toBeTruthy();
  });

  it("月份模式顯示「投標件數」欄", () => {
    render(createElement(PeriodStatusTable, { data: [makeRow()], timeGranularity: "month" }));
    expect(screen.getByText("投標件數")).toBeTruthy();
  });
});

// ── 資料列 ─────────────────────────────────────────────────

describe("PeriodStatusTable — 資料列", () => {
  it("顯示 label 和 dateRange", () => {
    render(createElement(PeriodStatusTable, { data: [makeRow()], timeGranularity: "month" }));
    expect(screen.getByText("2025年1月")).toBeTruthy();
    expect(screen.getByText("2025/01/01 - 2025/01/31")).toBeTruthy();
  });

  it("顯示 total 件數", () => {
    render(createElement(PeriodStatusTable, { data: [makeRow({ total: 7 })], timeGranularity: "month" }));
    // total=7 在資料列和小計列各出現一次
    expect(screen.getAllByText("7").length).toBeGreaterThanOrEqual(1);
  });

  it("狀態欄位顯示計數", () => {
    render(
      createElement(PeriodStatusTable, {
        data: [makeRow({ statusCounts: { [BID_STATUS.得標]: 3, [BID_STATUS.未獲青睞]: 2 } })],
        timeGranularity: "month",
      })
    );
    // 得標=3、未獲青睞=2，在資料列和小計列各出現一次
    expect(screen.getAllByText("3").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("2").length).toBeGreaterThanOrEqual(1);
  });
});

// ── 小計列 ─────────────────────────────────────────────────

describe("PeriodStatusTable — 小計列", () => {
  it("顯示「小計」列", () => {
    render(createElement(PeriodStatusTable, { data: [makeRow()], timeGranularity: "month" }));
    expect(screen.getByText("小計")).toBeTruthy();
  });

  it("多列時小計正確加總", () => {
    const rows = [
      makeRow({ key: "2025-01", label: "2025年1月", total: 3, statusCounts: { [BID_STATUS.得標]: 1 } }),
      makeRow({ key: "2025-02", label: "2025年2月", total: 5, statusCounts: { [BID_STATUS.得標]: 2 } }),
    ];
    const { container } = render(createElement(PeriodStatusTable, { data: rows, timeGranularity: "month" }));
    // 小計 total = 3 + 5 = 8
    const rows_ = container.querySelectorAll("tbody tr");
    // 最後一列是小計
    const subtotalRow = rows_[rows_.length - 1];
    expect(subtotalRow.textContent).toContain("8");
  });
});

// ── 狀態顏色 ───────────────────────────────────────────────

describe("PeriodStatusTable — 狀態顏色", () => {
  it("得標 > 0 時使用 text-emerald-600", () => {
    const { container } = render(
      createElement(PeriodStatusTable, {
        data: [makeRow({ statusCounts: { [BID_STATUS.得標]: 3 } })],
        timeGranularity: "month",
      })
    );
    expect(container.querySelector(".text-emerald-600")).toBeTruthy();
  });

  it("未獲青睞 > 0 時使用 text-rose-600", () => {
    const { container } = render(
      createElement(PeriodStatusTable, {
        data: [makeRow({ statusCounts: { [BID_STATUS.未獲青睞]: 2 } })],
        timeGranularity: "month",
      })
    );
    expect(container.querySelector(".text-rose-600")).toBeTruthy();
  });
});
