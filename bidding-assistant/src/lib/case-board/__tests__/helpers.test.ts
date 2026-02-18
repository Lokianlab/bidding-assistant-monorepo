import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getDefaultStageProgress,
  loadCaseProgress,
  saveCaseProgress,
  getCaseProgress,
  calculateProgress,
  pagesToCalendarEvents,
  groupEventsByMonth,
  groupEventsByDate,
  applyBoardFilters,
  getDeadlineUrgency,
  getUrgencyColor,
} from "../helpers";
import type { CaseProgress, CalendarEvent, BoardFilters } from "../types";
import type { NotionPage } from "@/lib/dashboard/types";
import { F } from "@/lib/dashboard/types";

// ---------------------------------------------------------------------------
// Mock localStorage
// ---------------------------------------------------------------------------
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
  removeItem: vi.fn((key: string) => { delete store[key]; }),
  clear: vi.fn(() => { Object.keys(store).forEach((k) => delete store[k]); }),
};
Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

beforeEach(() => {
  localStorageMock.clear();
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// getDefaultStageProgress
// ---------------------------------------------------------------------------
describe("getDefaultStageProgress()", () => {
  it("returns 8 stages", () => {
    const stages = getDefaultStageProgress();
    expect(stages).toHaveLength(8);
  });

  it("all stages are not-started", () => {
    const stages = getDefaultStageProgress();
    for (const s of stages) {
      expect(s.status).toBe("not-started");
    }
  });

  it("stage IDs are L1-L8", () => {
    const stages = getDefaultStageProgress();
    const ids = stages.map((s) => s.stageId);
    expect(ids).toEqual(["L1", "L2", "L3", "L4", "L5", "L6", "L7", "L8"]);
  });
});

// ---------------------------------------------------------------------------
// loadCaseProgress / saveCaseProgress / getCaseProgress
// ---------------------------------------------------------------------------
describe("localStorage progress functions", () => {
  it("loadCaseProgress returns empty object when nothing stored", () => {
    expect(loadCaseProgress()).toEqual({});
  });

  it("saveCaseProgress + loadCaseProgress round-trip", () => {
    const progress: CaseProgress = {
      notionPageId: "page-1",
      stages: getDefaultStageProgress(),
      lastUpdated: "2026-01-01T00:00:00.000Z",
    };
    saveCaseProgress("page-1", progress);
    const all = loadCaseProgress();
    expect(all["page-1"]).toEqual(progress);
  });

  it("getCaseProgress returns saved progress", () => {
    const progress: CaseProgress = {
      notionPageId: "page-2",
      stages: getDefaultStageProgress().map((s) =>
        s.stageId === "L1" ? { ...s, status: "completed" as const } : s,
      ),
      lastUpdated: "2026-01-01T00:00:00.000Z",
    };
    saveCaseProgress("page-2", progress);
    const result = getCaseProgress("page-2");
    expect(result.stages[0].status).toBe("completed");
  });

  it("getCaseProgress returns default when not saved", () => {
    const result = getCaseProgress("nonexistent");
    expect(result.notionPageId).toBe("nonexistent");
    expect(result.stages).toHaveLength(8);
    expect(result.stages.every((s) => s.status === "not-started")).toBe(true);
  });

  it("loadCaseProgress returns {} on invalid JSON", () => {
    store["bidding-assistant-case-progress"] = "not-json";
    expect(loadCaseProgress()).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// calculateProgress
// ---------------------------------------------------------------------------
describe("calculateProgress()", () => {
  it("returns 0 for empty array", () => {
    expect(calculateProgress([])).toBe(0);
  });

  it("returns 0 when all not-started", () => {
    const stages = getDefaultStageProgress();
    expect(calculateProgress(stages)).toBe(0);
  });

  it("returns 100 when all completed", () => {
    const stages = getDefaultStageProgress().map((s) => ({
      ...s,
      status: "completed" as const,
    }));
    expect(calculateProgress(stages)).toBe(100);
  });

  it("returns 50 when half completed", () => {
    const stages = getDefaultStageProgress().map((s, i) => ({
      ...s,
      status: i < 4 ? ("completed" as const) : ("not-started" as const),
    }));
    expect(calculateProgress(stages)).toBe(50);
  });

  it("rounds correctly", () => {
    // 3 out of 8 = 37.5% → rounds to 38
    const stages = getDefaultStageProgress().map((s, i) => ({
      ...s,
      status: i < 3 ? ("completed" as const) : ("not-started" as const),
    }));
    expect(calculateProgress(stages)).toBe(38);
  });
});

// ---------------------------------------------------------------------------
// pagesToCalendarEvents / groupEventsByMonth / groupEventsByDate
// ---------------------------------------------------------------------------
function makePage(id: string, name: string, deadline: string, status: string, agency = "台北市政府"): NotionPage {
  return {
    id,
    url: "#",
    properties: {
      [F.名稱]: name,
      [F.截標]: deadline,
      [F.進程]: status,
      [F.投遞序位]: "第一順位",
      [F.預算]: 1000000,
      [F.招標機關]: agency,
    },
  };
}

describe("pagesToCalendarEvents()", () => {
  it("converts pages to events", () => {
    const pages = [
      makePage("1", "案件A", "2026-03-15", "備標中"),
      makePage("2", "案件B", "2026-04-20", "投標完成"),
    ];
    const events = pagesToCalendarEvents(pages);
    expect(events).toHaveLength(2);
    expect(events[0].title).toBe("案件A");
    expect(events[0].date).toBe("2026-03-15");
  });

  it("filters out pages without deadline", () => {
    const pages = [
      makePage("1", "案件A", "2026-03-15", "備標中"),
      { id: "2", url: "#", properties: { [F.名稱]: "案件B", [F.進程]: "備標中" } } as NotionPage,
    ];
    const events = pagesToCalendarEvents(pages);
    expect(events).toHaveLength(1);
  });

  it("includes budget and agency", () => {
    const pages = [makePage("1", "案件A", "2026-03-15", "備標中")];
    const events = pagesToCalendarEvents(pages);
    expect(events[0].budget).toBe(1000000);
    expect(events[0].agency).toBe("台北市政府");
  });
});

describe("groupEventsByMonth()", () => {
  it("groups events by YYYY-MM", () => {
    const events: CalendarEvent[] = [
      { id: "1", title: "A", date: "2026-03-15", status: "備標中", daysLeft: 10 },
      { id: "2", title: "B", date: "2026-03-20", status: "備標中", daysLeft: 15 },
      { id: "3", title: "C", date: "2026-04-01", status: "備標中", daysLeft: 26 },
    ];
    const grouped = groupEventsByMonth(events);
    expect(Object.keys(grouped)).toHaveLength(2);
    expect(grouped["2026-03"]).toHaveLength(2);
    expect(grouped["2026-04"]).toHaveLength(1);
  });
});

describe("groupEventsByDate()", () => {
  it("groups events by YYYY-MM-DD", () => {
    const events: CalendarEvent[] = [
      { id: "1", title: "A", date: "2026-03-15", status: "備標中", daysLeft: 10 },
      { id: "2", title: "B", date: "2026-03-15", status: "備標中", daysLeft: 10 },
      { id: "3", title: "C", date: "2026-03-16", status: "備標中", daysLeft: 11 },
    ];
    const grouped = groupEventsByDate(events);
    expect(Object.keys(grouped)).toHaveLength(2);
    expect(grouped["2026-03-15"]).toHaveLength(2);
    expect(grouped["2026-03-16"]).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// applyBoardFilters
// ---------------------------------------------------------------------------
describe("applyBoardFilters()", () => {
  // 每筆資料有不同的 agency，才能獨立測試「按案名搜尋」vs「按機關搜尋」
  const testPages: NotionPage[] = [
    makePage("1", "台北公園案", "2026-03-15", "備標中", "台北市政府建設局"),
    makePage("2", "高雄自行車案", "2026-04-20", "投標完成", "高雄市政府工務局"),
    makePage("3", "台南社區案", "2026-03-10", "備標中", "台南市政府"),
  ];

  it("returns all when no filters", () => {
    const result = applyBoardFilters(testPages, {});
    expect(result).toHaveLength(3);
  });

  it("filters by search keyword matching name only", () => {
    // 「公園」只出現在案件 1 的名稱，不出現在任何 agency
    const result = applyBoardFilters(testPages, { search: "公園" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("filters by search keyword matching agency only", () => {
    // 「高雄」只出現在案件 2 的 agency 和名稱
    const result = applyBoardFilters(testPages, { search: "工務局" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });

  it("search matches both name and agency (OR logic)", () => {
    // 「台北」出現在案件 1 的名稱和 agency
    const result = applyBoardFilters(testPages, { search: "台北" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("search is case-insensitive for agency", () => {
    const result = applyBoardFilters(testPages, { search: "台南市政府" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("3");
  });

  it("filters by status", () => {
    const result = applyBoardFilters(testPages, { status: ["備標中"] });
    expect(result).toHaveLength(2);
  });

  it("filters by multiple statuses", () => {
    const result = applyBoardFilters(testPages, {
      status: ["備標中", "投標完成"],
    });
    expect(result).toHaveLength(3);
  });

  it("empty status filter returns all", () => {
    const result = applyBoardFilters(testPages, { status: [] });
    expect(result).toHaveLength(3);
  });

  it("filters by priority", () => {
    const result = applyBoardFilters(testPages, {
      priority: ["第一順位"],
    });
    expect(result).toHaveLength(3);
  });

  it("combines search and status filters", () => {
    const result = applyBoardFilters(testPages, {
      search: "公園",
      status: ["備標中"],
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });
});

// ---------------------------------------------------------------------------
// getDeadlineUrgency
// ---------------------------------------------------------------------------
describe("getDeadlineUrgency()", () => {
  it("returns unknown for null", () => {
    expect(getDeadlineUrgency(null)).toBe("unknown");
  });

  it("returns expired for <= 0", () => {
    expect(getDeadlineUrgency(0)).toBe("expired");
    expect(getDeadlineUrgency(-5)).toBe("expired");
  });

  it("returns critical for 1-3 days", () => {
    expect(getDeadlineUrgency(1)).toBe("critical");
    expect(getDeadlineUrgency(3)).toBe("critical");
  });

  it("returns warning for 4-7 days", () => {
    expect(getDeadlineUrgency(4)).toBe("warning");
    expect(getDeadlineUrgency(7)).toBe("warning");
  });

  it("returns normal for > 7 days", () => {
    expect(getDeadlineUrgency(8)).toBe("normal");
    expect(getDeadlineUrgency(30)).toBe("normal");
  });
});

// ---------------------------------------------------------------------------
// getUrgencyColor
// ---------------------------------------------------------------------------
describe("getUrgencyColor()", () => {
  it("returns Tailwind classes for each urgency level", () => {
    expect(getUrgencyColor("expired")).toContain("bg-red-100");
    expect(getUrgencyColor("critical")).toContain("bg-red-50");
    expect(getUrgencyColor("warning")).toContain("bg-amber-50");
    expect(getUrgencyColor("normal")).toContain("bg-green-50");
    expect(getUrgencyColor("unknown")).toContain("bg-gray-50");
  });

  it("always returns a non-empty string", () => {
    const levels = ["expired", "critical", "warning", "normal", "unknown"] as const;
    for (const level of levels) {
      expect(getUrgencyColor(level).length).toBeGreaterThan(0);
    }
  });
});
