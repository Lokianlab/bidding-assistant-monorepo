import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createElement } from "react";
import { CaseCard } from "../CaseCard";
import type { NotionPage } from "@/lib/dashboard/types";
import { F } from "@/lib/dashboard/types";

// ── getCaseProgress 回傳預設空進度（不依賴 localStorage） ──
vi.mock("@/lib/case-board/helpers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/case-board/helpers")>();
  return {
    ...actual,
    getCaseProgress: vi.fn(() => ({
      notionPageId: "page-test",
      stages: [],
      lastUpdated: "2026-01-01T00:00:00.000Z",
    })),
    saveCaseProgress: vi.fn(),
  };
});

// ── 固定系統時間（vi.setSystemTime 需先啟用 fake timers） ──
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
    id: "page-test",
    url: "https://notion.so/page-test",
    properties: {
      [F.名稱]: "測試標案名稱",
      [F.招標機關]: "台北市政府",
      [F.預算]: 1000000,
      [F.截標]: null,
      ...overrides,
    },
  };
}

// ── 名稱顯示 ───────────────────────────────────────────────

describe("CaseCard — 名稱顯示", () => {
  it("顯示標案名稱", () => {
    render(createElement(CaseCard, { page: makePage(), onClick: vi.fn() }));
    expect(screen.getByText("測試標案名稱")).toBeTruthy();
  });

  it("名稱為空時顯示「未命名標案」", () => {
    render(
      createElement(CaseCard, {
        page: makePage({ [F.名稱]: "" }),
        onClick: vi.fn(),
      })
    );
    expect(screen.getByText("未命名標案")).toBeTruthy();
  });
});

// ── 機關顯示 ───────────────────────────────────────────────

describe("CaseCard — 機關顯示", () => {
  it("顯示招標機關", () => {
    render(createElement(CaseCard, { page: makePage(), onClick: vi.fn() }));
    expect(screen.getByText("台北市政府")).toBeTruthy();
  });

  it("無機關時不渲染機關段落", () => {
    render(
      createElement(CaseCard, {
        page: makePage({ [F.招標機關]: "" }),
        onClick: vi.fn(),
      })
    );
    // 台北市政府不在畫面上
    expect(screen.queryByText("台北市政府")).toBeNull();
  });
});

// ── 預算顯示 ───────────────────────────────────────────────

describe("CaseCard — 預算顯示", () => {
  it("有預算時顯示 $ 前綴", () => {
    render(createElement(CaseCard, { page: makePage(), onClick: vi.fn() }));
    expect(screen.getByText(/\$1,000,000/)).toBeTruthy();
  });

  it("無預算時顯示「—」", () => {
    render(
      createElement(CaseCard, {
        page: makePage({ [F.預算]: undefined }),
        onClick: vi.fn(),
      })
    );
    expect(screen.getByText("—")).toBeTruthy();
  });
});

// ── 截標日期 Badge ─────────────────────────────────────────

describe("CaseCard — 截標日期", () => {
  it("無截標時間時不顯示 Badge", () => {
    const { container } = render(
      createElement(CaseCard, {
        page: makePage({ [F.截標]: null }),
        onClick: vi.fn(),
      })
    );
    // 無 badge 元素（用 role 找）
    expect(container.querySelectorAll("[class*='Badge'], .badge").length).toBe(0);
    // 或確認沒有天數文字
    expect(screen.queryByText(/天/)).toBeNull();
  });

  it("未來截標顯示剩餘天數（含「天」文字）", () => {
    // 截標 2026-03-30，遠在未來，確保 daysLeft > 0
    // 不檢查精確天數（受 setHours 本地時區影響）
    render(
      createElement(CaseCard, {
        page: makePage({ [F.截標]: "2026-03-30" }),
        onClick: vi.fn(),
      })
    );
    expect(screen.getByText(/\d+ 天/)).toBeTruthy();
  });

  it("已逾期截標顯示「已逾期」", () => {
    render(
      createElement(CaseCard, {
        page: makePage({ [F.截標]: "2025-12-01" }),
        onClick: vi.fn(),
      })
    );
    expect(screen.getByText("已逾期")).toBeTruthy();
  });

  it("3天以內截標顯示緊急 Badge（bg-red-50）", () => {
    // 2026-02-23 = 1 天後，urgency = "critical"
    const { container } = render(
      createElement(CaseCard, {
        page: makePage({ [F.截標]: "2026-02-23" }),
        onClick: vi.fn(),
      })
    );
    // critical → bg-red-50 styling
    expect(container.querySelector(".bg-red-50, .bg-red-100")).toBeTruthy();
  });
});

// ── 點擊互動 ───────────────────────────────────────────────

describe("CaseCard — 點擊互動", () => {
  it("點擊卡片觸發 onClick", () => {
    const onClick = vi.fn();
    const { container } = render(
      createElement(CaseCard, { page: makePage(), onClick })
    );
    fireEvent.click(container.firstChild as HTMLElement);
    expect(onClick).toHaveBeenCalled();
  });
});
