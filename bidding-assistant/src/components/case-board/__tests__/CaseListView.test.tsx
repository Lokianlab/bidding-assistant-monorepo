import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createElement } from "react";
import type { NotionPage } from "@/lib/dashboard/types";
import { F } from "@/lib/dashboard/types";

// ── mock case-board helpers ────────────────────────────────

vi.mock("@/lib/case-board/helpers", () => ({
  getCaseProgress: (_id: string) => ({
    notionPageId: _id,
    stages: [],
    lastUpdated: new Date().toISOString(),
  }),
  saveCaseProgress: vi.fn(),
  getDeadlineUrgency: (daysLeft: number | null) => {
    if (daysLeft === null) return "unknown";
    if (daysLeft <= 0) return "expired";
    if (daysLeft <= 3) return "critical";
    if (daysLeft <= 7) return "warning";
    return "normal";
  },
  getUrgencyColor: (urgency: string) => {
    const map: Record<string, string> = {
      expired: "bg-red-100 text-red-800 border-red-300",
      critical: "bg-red-50 text-red-700 border-red-200",
      warning: "bg-amber-50 text-amber-700 border-amber-200",
      normal: "bg-green-50 text-green-700 border-green-200",
      unknown: "bg-gray-50 text-gray-500 border-gray-200",
    };
    return map[urgency] ?? "";
  },
}));

// ── mock StageProgressBar ──────────────────────────────────

vi.mock("../StageProgressBar", () => ({
  StageProgressBar: () => createElement("div", { "data-testid": "stage-progress-bar" }),
}));

// ── mock useSettings ────────────────────────────────────────

vi.mock("@/lib/context/settings-context", () => ({
  useSettings: () => ({
    settings: { budgetTiers: undefined },
    hydrated: true,
    updateSettings: vi.fn(),
    updateSection: vi.fn(),
  }),
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

async function getCaseListView() {
  const mod = await import("../CaseListView");
  return mod.CaseListView;
}

// ── 空清單 ─────────────────────────────────────────────────

describe("CaseListView — 空清單", () => {
  it("pages=[] 時顯示「沒有符合條件的標案」", async () => {
    const CaseListView = await getCaseListView();
    render(
      createElement(CaseListView, {
        pages: [],
        onPageClick: vi.fn(),
        onProgressChange: vi.fn(),
      })
    );
    expect(screen.getByText("沒有符合條件的標案")).toBeTruthy();
  });
});

// ── 欄標題 ─────────────────────────────────────────────────

describe("CaseListView — 欄標題", () => {
  it("顯示「標案名稱」欄", async () => {
    const CaseListView = await getCaseListView();
    render(
      createElement(CaseListView, {
        pages: [makePage()],
        onPageClick: vi.fn(),
        onProgressChange: vi.fn(),
      })
    );
    expect(screen.getByText("標案名稱")).toBeTruthy();
  });

  it("顯示「進程」欄", async () => {
    const CaseListView = await getCaseListView();
    render(
      createElement(CaseListView, {
        pages: [makePage()],
        onPageClick: vi.fn(),
        onProgressChange: vi.fn(),
      })
    );
    expect(screen.getByText("進程")).toBeTruthy();
  });

  it("顯示「截標時間」欄", async () => {
    const CaseListView = await getCaseListView();
    render(
      createElement(CaseListView, {
        pages: [makePage()],
        onPageClick: vi.fn(),
        onProgressChange: vi.fn(),
      })
    );
    expect(screen.getByText("截標時間")).toBeTruthy();
  });

  it("顯示「AI 進度」欄", async () => {
    const CaseListView = await getCaseListView();
    render(
      createElement(CaseListView, {
        pages: [makePage()],
        onPageClick: vi.fn(),
        onProgressChange: vi.fn(),
      })
    );
    expect(screen.getByText("AI 進度")).toBeTruthy();
  });
});

// ── 資料顯示 ───────────────────────────────────────────────

describe("CaseListView — 資料顯示", () => {
  it("顯示標案名稱", async () => {
    const CaseListView = await getCaseListView();
    render(
      createElement(CaseListView, {
        pages: [makePage({ [F.名稱]: "高鐵標案" })],
        onPageClick: vi.fn(),
        onProgressChange: vi.fn(),
      })
    );
    expect(screen.getByText("高鐵標案")).toBeTruthy();
  });

  it("名稱為空時顯示「—」", async () => {
    const CaseListView = await getCaseListView();
    render(
      createElement(CaseListView, {
        pages: [makePage({ [F.名稱]: "" })],
        onPageClick: vi.fn(),
        onProgressChange: vi.fn(),
      })
    );
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("顯示進程", async () => {
    const CaseListView = await getCaseListView();
    render(
      createElement(CaseListView, {
        pages: [makePage({ [F.進程]: "得標" })],
        onPageClick: vi.fn(),
        onProgressChange: vi.fn(),
      })
    );
    expect(screen.getByText("得標")).toBeTruthy();
  });

  it("截標已過顯示「逾期」badge", async () => {
    const CaseListView = await getCaseListView();
    render(
      createElement(CaseListView, {
        pages: [makePage({ [F.截標]: "2026-01-01" })],
        onPageClick: vi.fn(),
        onProgressChange: vi.fn(),
      })
    );
    expect(screen.getByText("逾期")).toBeTruthy();
  });

  it("未來截標顯示剩餘天數 badge", async () => {
    const CaseListView = await getCaseListView();
    render(
      createElement(CaseListView, {
        pages: [makePage({ [F.截標]: "2026-03-15" })],
        onPageClick: vi.fn(),
        onProgressChange: vi.fn(),
      })
    );
    // 顯示「X天」格式（精確天數依時區而異，只驗證格式）
    expect(screen.getByText(/^\d+天$/)).toBeTruthy();
  });

  it("渲染 StageProgressBar", async () => {
    const CaseListView = await getCaseListView();
    const { container } = render(
      createElement(CaseListView, {
        pages: [makePage()],
        onPageClick: vi.fn(),
        onProgressChange: vi.fn(),
      })
    );
    expect(container.querySelector("[data-testid='stage-progress-bar']")).toBeTruthy();
  });
});

// ── 互動 ───────────────────────────────────────────────────

describe("CaseListView — 互動", () => {
  it("點擊列呼叫 onPageClick", async () => {
    const CaseListView = await getCaseListView();
    const onPageClick = vi.fn();
    const page = makePage({ [F.名稱]: "可點擊標案" });
    render(
      createElement(CaseListView, {
        pages: [page],
        onPageClick,
        onProgressChange: vi.fn(),
      })
    );
    const row = screen.getByText("可點擊標案").closest("tr");
    fireEvent.click(row!);
    expect(onPageClick).toHaveBeenCalledWith(page);
  });
});
