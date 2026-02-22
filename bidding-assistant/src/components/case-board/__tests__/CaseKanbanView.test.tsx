import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { CaseKanbanView } from "../CaseKanbanView";
import type { NotionPage } from "@/lib/dashboard/types";
import { F } from "@/lib/dashboard/types";

// ── mock CaseCard（依賴 localStorage getCaseProgress）──────

vi.mock("../CaseCard", () => ({
  CaseCard: ({ page }: { page: NotionPage }) =>
    createElement("div", { "data-testid": `case-card-${page.id}` }, page.properties[F.名稱] as string),
}));

// ── Helper ──────────────────────────────────────────────────

function makePage(id: string, status: string, name: string): NotionPage {
  return {
    id,
    url: `https://notion.so/${id}`,
    properties: {
      [F.名稱]: name,
      [F.進程]: status,
      [F.截標]: "2026-03-01",
      [F.預算]: 1000000,
      [F.招標機關]: "台北市政府",
      [F.企劃主筆]: ["王小明"],
    },
  };
}

const COLUMNS = ["投遞中", "得標", "未獲青睞"];

// ── 空欄位 ─────────────────────────────────────────────────

describe("CaseKanbanView — 空欄位", () => {
  it("空 pages 時每欄顯示「無標案」", () => {
    render(
      createElement(CaseKanbanView, {
        pages: [],
        columns: COLUMNS,
        onPageClick: vi.fn(),
        onProgressChange: vi.fn(),
      })
    );
    const emptySlots = screen.getAllByText("無標案");
    expect(emptySlots.length).toBe(COLUMNS.length);
  });

  it("顯示欄標題", () => {
    render(
      createElement(CaseKanbanView, {
        pages: [],
        columns: COLUMNS,
        onPageClick: vi.fn(),
        onProgressChange: vi.fn(),
      })
    );
    expect(screen.getByText("投遞中")).toBeTruthy();
    expect(screen.getByText("得標")).toBeTruthy();
    expect(screen.getByText("未獲青睞")).toBeTruthy();
  });
});

// ── 有資料 ─────────────────────────────────────────────────

describe("CaseKanbanView — 有資料", () => {
  it("badge 顯示各欄案件數", () => {
    const pages = [
      makePage("p1", "投遞中", "標案一"),
      makePage("p2", "投遞中", "標案二"),
      makePage("p3", "得標", "標案三"),
    ];
    const { container } = render(
      createElement(CaseKanbanView, {
        pages,
        columns: COLUMNS,
        onPageClick: vi.fn(),
        onProgressChange: vi.fn(),
      })
    );
    // 「投遞中」欄 badge 應為 2
    const badges = container.querySelectorAll(".rounded-full, [class*='badge']");
    // 找到所有 badge，其中一個顯示 "2"
    expect(screen.getByText("2")).toBeTruthy();
  });

  it("案件分配到正確欄位", () => {
    const pages = [
      makePage("p1", "投遞中", "投遞中標案"),
      makePage("p2", "得標", "得標標案"),
    ];
    const { container } = render(
      createElement(CaseKanbanView, {
        pages,
        columns: COLUMNS,
        onPageClick: vi.fn(),
        onProgressChange: vi.fn(),
      })
    );
    expect(container.querySelector("[data-testid='case-card-p1']")).toBeTruthy();
    expect(container.querySelector("[data-testid='case-card-p2']")).toBeTruthy();
  });

  it("不符合任何欄位的案件不顯示", () => {
    const pages = [makePage("p1", "封存", "封存標案")];
    const { container } = render(
      createElement(CaseKanbanView, {
        pages,
        columns: COLUMNS,
        onPageClick: vi.fn(),
        onProgressChange: vi.fn(),
      })
    );
    // p1 not in COLUMNS → not rendered
    expect(container.querySelector("[data-testid='case-card-p1']")).toBeNull();
  });

  it("有案件的欄不顯示「無標案」", () => {
    const pages = [makePage("p1", "投遞中", "標案一")];
    render(
      createElement(CaseKanbanView, {
        pages,
        columns: COLUMNS,
        onPageClick: vi.fn(),
        onProgressChange: vi.fn(),
      })
    );
    // 只有「得標」和「未獲青睞」欄為空（2個）
    const emptySlots = screen.getAllByText("無標案");
    expect(emptySlots.length).toBe(2);
  });
});
