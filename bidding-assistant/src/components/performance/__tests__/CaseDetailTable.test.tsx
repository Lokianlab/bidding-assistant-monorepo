import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { CaseDetailTable } from "../CaseDetailTable";
import type { NotionPage } from "@/lib/dashboard/types";
import { F } from "@/lib/dashboard/types";

// ── Helper ──────────────────────────────────────────────────

function makePage(overrides?: Record<string, unknown>): NotionPage {
  return {
    id: "page-1",
    url: "https://notion.so/page-1",
    properties: {
      [F.名稱]: "測試標案",
      [F.進程]: "得標",
      [F.截標]: "2026-03-01",
      [F.預算]: 1000000,
      [F.招標機關]: "台北市政府",
      [F.企劃主筆]: ["王小明"],
      ...overrides,
    },
  };
}

// ── 空資料 ─────────────────────────────────────────────────

describe("CaseDetailTable — 空資料", () => {
  it("pages=[] 時顯示「沒有符合條件的案件」", () => {
    render(createElement(CaseDetailTable, { pages: [] }));
    expect(screen.getByText("沒有符合條件的案件")).toBeTruthy();
  });
});

// ── 欄位標題 ───────────────────────────────────────────────

describe("CaseDetailTable — 欄位標題", () => {
  it("顯示固定欄位標題", () => {
    render(createElement(CaseDetailTable, { pages: [makePage()] }));
    expect(screen.getByText("標案名稱")).toBeTruthy();
    expect(screen.getByText("進程")).toBeTruthy();
    expect(screen.getByText("截標時間")).toBeTruthy();
    expect(screen.getByText("預算金額")).toBeTruthy();
    expect(screen.getByText("招標機關")).toBeTruthy();
    expect(screen.getByText("企劃人員")).toBeTruthy();
  });

  it("顯示標題含案件數量", () => {
    render(createElement(CaseDetailTable, { pages: [makePage(), makePage({ id: "page-2" } as Record<string, unknown>)] }));
    // 案件明細（2 件）
    expect(screen.getByText(/案件明細（2 件）/)).toBeTruthy();
  });
});

// ── 資料列 ─────────────────────────────────────────────────

describe("CaseDetailTable — 資料列", () => {
  it("顯示標案名稱", () => {
    render(createElement(CaseDetailTable, { pages: [makePage()] }));
    expect(screen.getByText("測試標案")).toBeTruthy();
  });

  it("名稱為空時顯示「-」", () => {
    render(createElement(CaseDetailTable, { pages: [makePage({ [F.名稱]: "" })] }));
    expect(screen.getByText("-")).toBeTruthy();
  });

  it("顯示狀態 Badge", () => {
    render(createElement(CaseDetailTable, { pages: [makePage({ [F.進程]: "得標" })] }));
    expect(screen.getByText("得標")).toBeTruthy();
  });

  it("顯示預算金額（含千分位）", () => {
    render(createElement(CaseDetailTable, { pages: [makePage({ [F.預算]: 2500000 })] }));
    expect(screen.getByText(/2,500,000/)).toBeTruthy();
  });

  it("無預算時顯示「-」", () => {
    render(createElement(CaseDetailTable, { pages: [makePage({ [F.預算]: undefined })] }));
    expect(screen.getByText("-")).toBeTruthy();
  });

  it("顯示招標機關", () => {
    render(createElement(CaseDetailTable, { pages: [makePage()] }));
    expect(screen.getByText("台北市政府")).toBeTruthy();
  });

  it("多位企劃人員以「、」連接", () => {
    render(
      createElement(CaseDetailTable, {
        pages: [makePage({ [F.企劃主筆]: ["王小明", "李大華"] })],
      })
    );
    expect(screen.getByText("王小明、李大華")).toBeTruthy();
  });

  it("企劃人員非陣列時顯示「-」", () => {
    render(
      createElement(CaseDetailTable, {
        pages: [makePage({ [F.企劃主筆]: null })],
      })
    );
    // 應有 "-" 出現
    expect(screen.getAllByText("-").length).toBeGreaterThan(0);
  });
});
