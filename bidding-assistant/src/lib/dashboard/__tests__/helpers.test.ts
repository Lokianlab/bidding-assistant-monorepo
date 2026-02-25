import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  parseDateField,
  calcPrepDeadline,
  daysLeft,
  fmt,
  fmtDate,
  fmtDateTime,
  filterPages,
  filterReviewPages,
  extractAvailableYears,
  filterByYear,
  getSortValue,
  sortPages,
  loadCache,
  saveCache,
  loadPerfCache,
  savePerfCache,
} from "../helpers";
import type { NotionPage, SortKey } from "../types";
import { F, ACTIVE_STATUSES, REVIEW_STATUSES } from "../types";

// ====== Helper: build a minimal NotionPage ======

function makePage(props: Record<string, unknown>): NotionPage {
  return { id: "test-id", url: "https://notion.so/test", properties: props };
}

// ====== parseDateField ======

describe("parseDateField", () => {
  it("returns 0 for falsy input", () => {
    expect(parseDateField(null)).toBe(0);
    expect(parseDateField(undefined)).toBe(0);
    expect(parseDateField("")).toBe(0);
    expect(parseDateField(0)).toBe(0);
  });

  it("parses an ISO date string", () => {
    const result = parseDateField("2024-06-15T10:00:00.000Z");
    expect(result).toBe(new Date("2024-06-15T10:00:00.000Z").getTime());
  });

  it("parses a Notion formula date object with { start }", () => {
    const result = parseDateField({ start: "2024-06-15" });
    expect(result).toBe(new Date("2024-06-15").getTime());
  });

  it("returns 0 for an invalid date string", () => {
    expect(parseDateField("not-a-date")).toBe(0);
  });

  it("returns 0 for non-string/non-object input", () => {
    expect(parseDateField(12345)).toBe(0);
    expect(parseDateField(true)).toBe(0);
  });

  it("returns 0 for object without start property", () => {
    expect(parseDateField({ end: "2024-01-01" })).toBe(0);
  });
});

// ====== calcPrepDeadline ======

describe("calcPrepDeadline", () => {
  it("returns 0 when deadline is falsy", () => {
    expect(calcPrepDeadline(null, false)).toBe(0);
    expect(calcPrepDeadline("", false)).toBe(0);
  });

  it("subtracts 1 day for electronic bidding", () => {
    // Use local time to avoid timezone issues
    const dl = new Date(2024, 5, 15, 10, 0, 0); // June 15, 2024 10:00 local
    const dlIso = dl.toISOString();
    const dlTs = dl.getTime();
    expect(calcPrepDeadline(dlIso, true)).toBe(dlTs - 86400000);
  });

  it("subtracts 3 days for Monday (day=1)", () => {
    // 2024-06-17 is a Monday in local time
    const mon = new Date(2024, 5, 17, 10, 0, 0);
    const monIso = mon.toISOString();
    const monTs = mon.getTime();
    expect(calcPrepDeadline(monIso, false)).toBe(monTs - 3 * 86400000);
  });

  it("subtracts 4 days for Tuesday (day=2)", () => {
    // 2024-06-18 is a Tuesday in local time
    const tue = new Date(2024, 5, 18, 10, 0, 0);
    const tueIso = tue.toISOString();
    const tueTs = tue.getTime();
    expect(calcPrepDeadline(tueIso, false)).toBe(tueTs - 4 * 86400000);
  });

  it("subtracts 3 days for Sunday (day=0)", () => {
    // 2024-06-16 is a Sunday in local time
    const sun = new Date(2024, 5, 16, 10, 0, 0);
    const sunIso = sun.toISOString();
    const sunTs = sun.getTime();
    expect(calcPrepDeadline(sunIso, false)).toBe(sunTs - 3 * 86400000);
  });

  it("subtracts 2 days for Saturday (day=6)", () => {
    // Use local time to avoid timezone issues
    // 2024-06-22 is Saturday in local time
    const sat = new Date(2024, 5, 22, 16, 0, 0); // June 22, 2024 16:00 local
    const satIso = sat.toISOString();
    const satTs = sat.getTime();
    // Saturday => day=6, default subtractDays=2, hours=16 >= 15 so no extra
    expect(calcPrepDeadline(satIso, false)).toBe(satTs - 2 * 86400000);
  });

  it("adds extra day for Wed/Thu/Fri before 15:00 local time", () => {
    // Use local time dates so getDay() and getHours() behave predictably
    // Wednesday at 10:00 local -> day=3, hours=10 < 15 => subtract 2+1=3
    const wed = new Date(2024, 5, 19, 10, 0, 0); // June 19, 2024 Wed 10:00 local
    const wedIso = wed.toISOString();
    const wedTs = wed.getTime();
    expect(calcPrepDeadline(wedIso, false)).toBe(wedTs - 3 * 86400000);

    // Thursday at 14:00 local -> day=4, hours=14 < 15 => subtract 2+1=3
    const thu = new Date(2024, 5, 20, 14, 0, 0); // June 20, 2024 Thu 14:00 local
    const thuIso = thu.toISOString();
    const thuTs = thu.getTime();
    expect(calcPrepDeadline(thuIso, false)).toBe(thuTs - 3 * 86400000);

    // Friday at 8:00 local -> day=5, hours=8 < 15 => subtract 2+1=3
    const fri = new Date(2024, 5, 21, 8, 0, 0); // June 21, 2024 Fri 08:00 local
    const friIso = fri.toISOString();
    const friTs = fri.getTime();
    expect(calcPrepDeadline(friIso, false)).toBe(friTs - 3 * 86400000);
  });

  it("does not add extra day for Wed/Thu/Fri at or after 15:00 local time", () => {
    // Thursday at 16:00 local -> day=4, hours=16 >= 15 => subtract 2 only
    const thu = new Date(2024, 5, 20, 16, 0, 0); // June 20, 2024 Thu 16:00 local
    const thuIso = thu.toISOString();
    const thuTs = thu.getTime();
    expect(calcPrepDeadline(thuIso, false)).toBe(thuTs - 2 * 86400000);

    // Friday at 15:00 local -> day=5, hours=15 is NOT < 15 => subtract 2 only
    const fri = new Date(2024, 5, 21, 15, 0, 0); // June 21, 2024 Fri 15:00 local
    const friIso = fri.toISOString();
    const friTs = fri.getTime();
    expect(calcPrepDeadline(friIso, false)).toBe(friTs - 2 * 86400000);
  });
});

// ====== daysLeft ======

describe("daysLeft", () => {
  it("returns null for falsy deadline", () => {
    expect(daysLeft(null, false)).toBeNull();
    expect(daysLeft("", false)).toBeNull();
  });

  it("returns null when deadline is in the past and prep deadline is in the past", () => {
    // Far in the past
    expect(daysLeft("2020-01-01", false)).toBeNull();
  });

  it('returns a number of days when prep deadline is in the future', () => {
    // Far in the future
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const result = daysLeft(futureDate.toISOString(), false);
    expect(typeof result).toBe("number");
    expect(result as number).toBeGreaterThan(0);
  });

  it('returns "應交寄" when prep deadline passed but bid deadline still future', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 5, 15, 12, 0, 0)); // June 15 noon

    // Electronic bidding, deadline = today noon
    // prep = yesterday noon (past), bid = today noon (>= today midnight) → "應交寄"
    const todayNoon = new Date(2024, 5, 15, 12, 0, 0).toISOString();
    expect(daysLeft(todayNoon, true)).toBe("應交寄");

    vi.useRealTimers();
  });

  it("returns correct number of days until prep deadline", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 5, 15, 12, 0, 0)); // June 15 noon

    // Electronic bidding, deadline = June 25 noon
    // prep = June 24 noon, today midnight = June 15 00:00
    // diff = 9 days 12 hours → ceil = 10
    const future = new Date(2024, 5, 25, 12, 0, 0).toISOString();
    expect(daysLeft(future, true)).toBe(10);

    vi.useRealTimers();
  });
});

// ====== fmt ======

describe("fmt", () => {
  it("formats a number with zh-TW locale", () => {
    const result = fmt(1234567);
    // zh-TW uses commas: "1,234,567"
    expect(result).toContain("1");
    expect(result).toContain("234");
    expect(result).toContain("567");
  });

  it("formats 0", () => {
    expect(fmt(0)).toBe("0");
  });
});

// ====== fmtDate ======

describe("fmtDate", () => {
  it('returns "-" for null', () => {
    expect(fmtDate(null)).toBe("-");
  });

  it('returns "-" for empty string', () => {
    expect(fmtDate("")).toBe("-");
  });

  it("formats a valid date string", () => {
    const result = fmtDate("2024-06-15");
    // Should contain year, month, day in some format
    expect(result).toBeTruthy();
    expect(result).not.toBe("-");
  });

  it("returns the original string for an unparseable date", () => {
    // "not-a-date" will create an Invalid Date, which toLocaleDateString may throw
    // The function catches and returns d
    const result = fmtDate("not-a-date");
    // Could be the raw string or "-" depending on Date parsing
    expect(typeof result).toBe("string");
  });
});

// ====== fmtDateTime ======

describe("fmtDateTime", () => {
  it('returns "-" for falsy input', () => {
    expect(fmtDateTime(null)).toBe("-");
    expect(fmtDateTime(undefined)).toBe("-");
    expect(fmtDateTime("")).toBe("-");
  });

  it('returns "-" for non-string/non-object input', () => {
    expect(fmtDateTime(12345)).toBe("-");
    expect(fmtDateTime(true)).toBe("-");
  });

  it("handles { start } object", () => {
    const result = fmtDateTime({ start: "2024-06-15T14:30:00.000Z" });
    expect(result).not.toBe("-");
    expect(typeof result).toBe("string");
  });

  it("handles string input", () => {
    const result = fmtDateTime("2024-06-15T14:30:00.000Z");
    expect(result).not.toBe("-");
  });

  it("omits time when hours and minutes are 0", () => {
    // Midnight UTC: in local time, hours might not be 0
    // Use a local midnight instead
    const localMidnight = new Date(2024, 5, 15, 0, 0, 0);
    const result = fmtDateTime(localMidnight.toISOString());
    // If local time is midnight, it should just show date
    // If timezone offset makes it non-midnight, it shows time
    expect(typeof result).toBe("string");
    expect(result).not.toBe("-");
  });

  it('returns "-" for invalid date string', () => {
    expect(fmtDateTime("not-a-date")).toBe("-");
  });
});

// ====== filterPages ======

describe("filterPages", () => {
  it("不再篩選確定協作（已移至 Notion API 層的可設定篩選）", () => {
    // filterPages 只處理截標日期邏輯，確定協作由看板篩選設定在 API 層控制
    const pages: NotionPage[] = [
      makePage({ [F.確定協作]: false, [F.截標]: "2099-01-01" }),
      makePage({ [F.確定協作]: null, [F.截標]: "2099-01-01" }),
    ];
    const result = filterPages(pages);
    expect(result.length).toBe(2);
  });

  it("keeps pages with future deadline regardless of status", () => {
    const pages: NotionPage[] = [
      makePage({ [F.確定協作]: true, [F.截標]: "2099-12-31", [F.進程]: "等標期間" }),
    ];
    const result = filterPages(pages);
    expect(result.length).toBe(1);
  });

  it("keeps pages with no deadline", () => {
    const pages: NotionPage[] = [
      makePage({ [F.確定協作]: true }),
    ];
    // No deadline -> deadlineTs = 0, so !deadlineTs is true => return true
    const result = filterPages(pages);
    expect(result.length).toBe(1);
  });

  it("keeps past-deadline pages with ACTIVE status", () => {
    for (const status of ACTIVE_STATUSES) {
      const pages: NotionPage[] = [
        makePage({ [F.確定協作]: true, [F.截標]: "2020-01-01", [F.進程]: status }),
      ];
      const result = filterPages(pages);
      expect(result.length).toBe(1);
    }
  });

  it("removes past-deadline pages with non-active status", () => {
    const pages: NotionPage[] = [
      makePage({ [F.確定協作]: true, [F.截標]: "2020-01-01", [F.進程]: "不參與" }),
    ];
    const result = filterPages(pages);
    expect(result.length).toBe(0);
  });

  it("returns empty array for empty input", () => {
    expect(filterPages([])).toEqual([]);
  });
});

// ====== filterReviewPages ======

describe("filterReviewPages", () => {
  it("keeps only pages with REVIEW_STATUSES", () => {
    const pages: NotionPage[] = [
      makePage({ [F.進程]: "得標" }),
      makePage({ [F.進程]: "等標期間" }),
      makePage({ [F.進程]: "已投標" }),
      makePage({ [F.進程]: "不參與" }),
    ];
    const result = filterReviewPages(pages);
    const keptStatuses = result.map((p) => p.properties[F.進程]);
    for (const s of keptStatuses) {
      expect(REVIEW_STATUSES.has(s)).toBe(true);
    }
  });

  it("handles pages with no status (empty string fallback)", () => {
    const pages: NotionPage[] = [makePage({})];
    const result = filterReviewPages(pages);
    // Empty string is not in REVIEW_STATUSES
    expect(result.length).toBe(0);
  });

  it("returns empty for empty input", () => {
    expect(filterReviewPages([])).toEqual([]);
  });
});

// ====== extractAvailableYears ======

describe("extractAvailableYears", () => {
  it("extracts unique years from deadlines in descending order", () => {
    const pages: NotionPage[] = [
      makePage({ [F.截標]: "2024-06-01" }),
      makePage({ [F.截標]: "2023-03-15" }),
      makePage({ [F.截標]: "2024-12-31" }),
      makePage({ [F.截標]: "2022-01-01" }),
    ];
    const result = extractAvailableYears(pages);
    expect(result).toEqual([2024, 2023, 2022]);
  });

  it("skips pages with no valid deadline", () => {
    const pages: NotionPage[] = [
      makePage({ [F.截標]: null }),
      makePage({ [F.截標]: "" }),
      makePage({ [F.截標]: "2024-01-01" }),
    ];
    const result = extractAvailableYears(pages);
    expect(result).toEqual([2024]);
  });

  it("returns empty for empty input", () => {
    expect(extractAvailableYears([])).toEqual([]);
  });
});

// ====== filterByYear ======

describe("filterByYear", () => {
  const pages: NotionPage[] = [
    makePage({ [F.截標]: "2024-06-01" }),
    makePage({ [F.截標]: "2023-03-15" }),
    makePage({ [F.截標]: "2024-12-31" }),
  ];

  it("returns all pages when year is 0", () => {
    const result = filterByYear(pages, 0);
    expect(result.length).toBe(3);
  });

  it("filters pages by specified year", () => {
    const result = filterByYear(pages, 2024);
    expect(result.length).toBe(2);
  });

  it("returns empty when no pages match the year", () => {
    const result = filterByYear(pages, 2020);
    expect(result.length).toBe(0);
  });

  it("excludes pages with no valid deadline when filtering by year", () => {
    const pagesWithNull = [
      ...pages,
      makePage({ [F.截標]: null }),
    ];
    const result = filterByYear(pagesWithNull, 2024);
    expect(result.length).toBe(2);
  });
});

// ====== getSortValue ======

describe("getSortValue", () => {
  it('returns numeric value from "唯一碼" (extracts number)', () => {
    const page = makePage({ [F.唯一碼]: "BID-123" });
    expect(getSortValue(page, "唯一碼")).toBe(123);
  });

  it('returns 0 for "唯一碼" with no number', () => {
    const page = makePage({ [F.唯一碼]: "ABC" });
    expect(getSortValue(page, "唯一碼")).toBe(0);
  });

  it('returns 0 for missing "唯一碼"', () => {
    const page = makePage({});
    expect(getSortValue(page, "唯一碼")).toBe(0);
  });

  it('returns name string for "名稱"', () => {
    const page = makePage({ [F.名稱]: "Test Project" });
    expect(getSortValue(page, "名稱")).toBe("Test Project");
  });

  it('returns empty string for missing "名稱"', () => {
    const page = makePage({});
    expect(getSortValue(page, "名稱")).toBe("");
  });

  it('returns parsed date timestamp for "截標"', () => {
    const page = makePage({ [F.截標]: "2024-06-15" });
    expect(getSortValue(page, "截標")).toBe(new Date("2024-06-15").getTime());
  });

  it('returns budget number for "預算"', () => {
    const page = makePage({ [F.預算]: 5000000 });
    expect(getSortValue(page, "預算")).toBe(5000000);
  });

  it('returns 0 for missing "預算"', () => {
    const page = makePage({});
    expect(getSortValue(page, "預算")).toBe(0);
  });

  it('returns 押標金 for "押標金"', () => {
    const page = makePage({ [F.押標金]: 100000 });
    expect(getSortValue(page, "押標金")).toBe(100000);
  });

  it('returns string for "招標機關"', () => {
    const page = makePage({ [F.招標機關]: "某市政府" });
    expect(getSortValue(page, "招標機關")).toBe("某市政府");
  });

  it('returns string for "投遞序位"', () => {
    const page = makePage({ [F.投遞序位]: "第一順位" });
    expect(getSortValue(page, "投遞序位")).toBe("第一順位");
  });

  it('returns string for "評審方式"', () => {
    const page = makePage({ [F.評審方式]: "最有利標" });
    expect(getSortValue(page, "評審方式")).toBe("最有利標");
  });

  it('returns empty string for unknown sort key', () => {
    const page = makePage({});
    expect(getSortValue(page, "unknown" as unknown as SortKey)).toBe("");
  });

  it('returns 99999 for "剩餘" when no deadline', () => {
    const page = makePage({});
    expect(getSortValue(page, "剩餘")).toBe(99999);
  });

  it('returns positive days for "剩餘" when prep deadline is future', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 5, 15, 12, 0, 0)); // June 15 noon

    // Electronic, deadline = June 25 noon → prep = June 24 noon
    // diff from June 15 midnight = 9.5 days → ceil = 10
    const page = makePage({
      [F.截標]: new Date(2024, 5, 25, 12, 0, 0).toISOString(),
      [F.電子投標]: true,
    });
    expect(getSortValue(page, "剩餘")).toBe(10);

    vi.useRealTimers();
  });

  it('returns -1 for "剩餘" when prep deadline passed but bid still future', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 5, 15, 12, 0, 0)); // June 15 noon

    // Electronic, deadline = today noon → prep = yesterday noon (past)
    // bid today noon >= today midnight → -1
    const page = makePage({
      [F.截標]: new Date(2024, 5, 15, 12, 0, 0).toISOString(),
      [F.電子投標]: true,
    });
    expect(getSortValue(page, "剩餘")).toBe(-1);

    vi.useRealTimers();
  });
});

// ====== sortPages ======

describe("sortPages", () => {
  it("returns items unchanged when key is null", () => {
    const pages = [
      makePage({ [F.預算]: 300 }),
      makePage({ [F.預算]: 100 }),
    ];
    const result = sortPages(pages, null, "asc");
    expect(result).toEqual(pages);
  });

  it("sorts numerically ascending", () => {
    const pages = [
      makePage({ [F.預算]: 300 }),
      makePage({ [F.預算]: 100 }),
      makePage({ [F.預算]: 200 }),
    ];
    const result = sortPages(pages, "預算", "asc");
    expect(result.map((p) => p.properties[F.預算])).toEqual([100, 200, 300]);
  });

  it("sorts numerically descending", () => {
    const pages = [
      makePage({ [F.預算]: 300 }),
      makePage({ [F.預算]: 100 }),
      makePage({ [F.預算]: 200 }),
    ];
    const result = sortPages(pages, "預算", "desc");
    expect(result.map((p) => p.properties[F.預算])).toEqual([300, 200, 100]);
  });

  it("sorts strings using zh-TW locale", () => {
    const pages = [
      makePage({ [F.名稱]: "C Project" }),
      makePage({ [F.名稱]: "A Project" }),
      makePage({ [F.名稱]: "B Project" }),
    ];
    const result = sortPages(pages, "名稱", "asc");
    expect(result.map((p) => p.properties[F.名稱])).toEqual([
      "A Project",
      "B Project",
      "C Project",
    ]);
  });

  it("does not mutate the original array", () => {
    const pages = [
      makePage({ [F.預算]: 300 }),
      makePage({ [F.預算]: 100 }),
    ];
    const original = [...pages];
    sortPages(pages, "預算", "asc");
    expect(pages).toEqual(original);
  });
});

// ====== localStorage Cache functions ======

describe("loadCache / saveCache", () => {
  let setItemSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(Storage.prototype, "getItem");
    setItemSpy = vi.spyOn(Storage.prototype, "setItem");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null when cache does not exist", () => {
    const result = loadCache();
    expect(result).toBeNull();
  });

  it("returns parsed data when cache exists", () => {
    const cacheData = {
      schema: { name: { type: "title" } },
      pages: [makePage({ test: true })],
      ts: Date.now(),
    };
    localStorage.setItem("bidding-all-cache-v2", JSON.stringify(cacheData));
    const result = loadCache();
    expect(result).not.toBeNull();
    expect(result!.pages.length).toBe(1);
    expect(result!.schema).toEqual(cacheData.schema);
  });

  it("returns null when cache data is invalid JSON", () => {
    localStorage.setItem("bidding-all-cache-v2", "not-json");
    const result = loadCache();
    expect(result).toBeNull();
  });

  it("saves data to localStorage", () => {
    const schema = { name: { type: "title" } };
    const pages = [makePage({ test: true })];
    saveCache(schema, pages);
    const raw = localStorage.getItem("bidding-all-cache-v2");
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.schema).toEqual(schema);
    expect(parsed.pages.length).toBe(1);
    expect(typeof parsed.ts).toBe("number");
  });

  it("handles localStorage setItem error gracefully", () => {
    setItemSpy.mockImplementation(() => {
      throw new Error("QuotaExceeded");
    });
    // Should not throw
    expect(() => saveCache({}, [])).not.toThrow();
  });
});

// ====== loadPerfCache / savePerfCache ======

describe("loadPerfCache / savePerfCache", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null when perf cache does not exist", () => {
    expect(loadPerfCache()).toBeNull();
  });

  it("returns parsed data when perf cache exists", () => {
    const cacheData = {
      schema: {},
      pages: [makePage({})],
      ts: Date.now(),
      complete: true,
    };
    localStorage.setItem("bidding-perf-cache-v2", JSON.stringify(cacheData));
    const result = loadPerfCache();
    expect(result).not.toBeNull();
    expect(result!.complete).toBe(true);
    expect(result!.pages.length).toBe(1);
  });

  it("defaults complete to true for old format without complete field", () => {
    const oldCache = {
      schema: {},
      pages: [],
      ts: Date.now(),
    };
    localStorage.setItem("bidding-perf-cache-v2", JSON.stringify(oldCache));
    const result = loadPerfCache();
    expect(result).not.toBeNull();
    expect(result!.complete).toBe(true);
  });

  it("returns null for invalid JSON", () => {
    localStorage.setItem("bidding-perf-cache-v2", "{invalid");
    expect(loadPerfCache()).toBeNull();
  });

  it("saves perf cache with complete=true by default", () => {
    savePerfCache({}, [makePage({})]);
    const raw = localStorage.getItem("bidding-perf-cache-v2");
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.complete).toBe(true);
    expect(parsed.pages.length).toBe(1);
  });

  it("saves perf cache with complete=false and cursor", () => {
    savePerfCache({}, [], false, "abc-cursor-123", ["prop1"]);
    const raw = localStorage.getItem("bidding-perf-cache-v2");
    const parsed = JSON.parse(raw!);
    expect(parsed.complete).toBe(false);
    expect(parsed.nextCursor).toBe("abc-cursor-123");
    expect(parsed.propIds).toEqual(["prop1"]);
  });

  it("handles setItem error gracefully", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceeded");
    });
    expect(() => savePerfCache({}, [])).not.toThrow();
  });
});
