import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createElement } from "react";
import { CaseCalendarView } from "../CaseCalendarView";
import type { NotionPage } from "@/lib/dashboard/types";
import { F } from "@/lib/dashboard/types";

// ── mock case-board helpers ────────────────────────────────
// pagesToCalendarEvents & groupEventsByMonth 是純函式，
// 只 mock urgency 相關（避免 localStorage 依賴）

vi.mock("@/lib/case-board/helpers", () => ({
  pagesToCalendarEvents: (pages: NotionPage[]) => {
    // 簡化版：只轉有截標日期的頁面
    return pages
      .filter((p) => p.properties[F.截標])
      .map((p) => ({
        id: p.id,
        title: (p.properties[F.名稱] as string) ?? "",
        date: p.properties[F.截標] as string,
        status: (p.properties[F.進程] as string) ?? "",
        budget: p.properties[F.預算] as number | undefined,
        agency: p.properties[F.招標機關] as string | undefined,
        daysLeft: 30,
      }));
  },
  groupEventsByMonth: (events: { date: string; id: string; title: string; status: string; daysLeft: number }[]) => {
    const grouped: Record<string, typeof events> = {};
    for (const e of events) {
      const key = e.date.slice(0, 7);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(e);
    }
    return grouped;
  },
  getDeadlineUrgency: (_daysLeft: number | null) => "normal",
  getUrgencyColor: (_urgency: string) => "bg-green-50 text-green-700 border-green-200",
}));

// ── 固定時間 ───────────────────────────────────────────────

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-02-22T00:00:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

// ── Helper ──────────────────────────────────────────────────

function makePage(overrides?: Record<string, unknown>): NotionPage {
  return {
    id: "page-1",
    url: "https://notion.so/page-1",
    properties: {
      [F.名稱]: "測試標案",
      [F.進程]: "投遞中",
      [F.截標]: "2026-03-15",
      [F.預算]: 1500000,
      [F.招標機關]: "台北市政府",
      [F.企劃主筆]: ["王小明"],
      ...overrides,
    },
  };
}

// ── 空資料 ─────────────────────────────────────────────────

describe("CaseCalendarView — 空資料", () => {
  it("沒有截標日期的頁面時顯示「沒有截標期限資料」", () => {
    render(
      createElement(CaseCalendarView, {
        pages: [],
        onPageClick: vi.fn(),
      })
    );
    expect(screen.getByText("沒有截標期限資料")).toBeTruthy();
  });

  it("頁面無截標欄位時顯示空狀態", () => {
    render(
      createElement(CaseCalendarView, {
        pages: [makePage({ [F.截標]: "" })],
        onPageClick: vi.fn(),
      })
    );
    expect(screen.getByText("沒有截標期限資料")).toBeTruthy();
  });
});

// ── 有資料 ─────────────────────────────────────────────────

describe("CaseCalendarView — 有資料", () => {
  it("顯示月份標頭", () => {
    render(
      createElement(CaseCalendarView, {
        pages: [makePage({ [F.截標]: "2026-03-15" })],
        onPageClick: vi.fn(),
      })
    );
    expect(screen.getByText(/2026 年 3 月/)).toBeTruthy();
  });

  it("顯示標案名稱", () => {
    render(
      createElement(CaseCalendarView, {
        pages: [makePage({ [F.名稱]: "重要展覽標案" })],
        onPageClick: vi.fn(),
      })
    );
    expect(screen.getByText("重要展覽標案")).toBeTruthy();
  });

  it("顯示招標機關", () => {
    render(
      createElement(CaseCalendarView, {
        pages: [makePage({ [F.招標機關]: "新竹縣政府" })],
        onPageClick: vi.fn(),
      })
    );
    expect(screen.getByText("新竹縣政府")).toBeTruthy();
  });

  it("月份 badge 顯示件數", () => {
    const pages = [
      makePage({ id: "p1", [F.截標]: "2026-03-10" } as Record<string, unknown>),
      { ...makePage({ [F.截標]: "2026-03-20" } as Record<string, unknown>), id: "p2" },
    ];
    render(
      createElement(CaseCalendarView, {
        pages,
        onPageClick: vi.fn(),
      })
    );
    expect(screen.getByText("2 件")).toBeTruthy();
  });

  it("不同月份分別顯示月份標頭", () => {
    const pages = [
      makePage({ [F.截標]: "2026-03-10" }),
      { ...makePage({ [F.截標]: "2026-04-05" }), id: "page-2" },
    ];
    render(
      createElement(CaseCalendarView, {
        pages,
        onPageClick: vi.fn(),
      })
    );
    // 月份標頭格式：「2026 年 3 月」「2026 年 4 月」
    expect(screen.getByText(/2026 年 3 月/)).toBeTruthy();
    expect(screen.getByText(/2026 年 4 月/)).toBeTruthy();
  });
});

// ── 互動 ───────────────────────────────────────────────────

describe("CaseCalendarView — 互動", () => {
  it("點擊卡片呼叫 onPageClick", () => {
    const onPageClick = vi.fn();
    const page = makePage({ [F.名稱]: "可點擊標案" });
    render(
      createElement(CaseCalendarView, {
        pages: [page],
        onPageClick,
      })
    );
    const card = screen.getByText("可點擊標案").closest("[class*='cursor-pointer']");
    fireEvent.click(card!);
    expect(onPageClick).toHaveBeenCalledWith(page);
  });
});
