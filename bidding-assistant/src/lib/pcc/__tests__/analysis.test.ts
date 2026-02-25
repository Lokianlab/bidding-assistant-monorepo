import { describe, it, expect, vi } from "vitest";
import { analyzeSelf, fetchAllPages } from "../analysis";
import type { PCCRecord, PCCSearchResponse } from "../types";
import * as api from "../api";

// Helper: 建立測試用 PCCRecord
function makeRecord(overrides: {
  date?: number;
  type?: string;
  title?: string;
  unitId?: string;
  unitName?: string;
  companies?: {
    ids: string[];
    names: string[];
    id_key: Record<string, string[]>;
    name_key: Record<string, string[]>;
  };
}): PCCRecord {
  return {
    date: overrides.date ?? 20260101,
    filename: "test",
    brief: {
      type: overrides.type ?? "決標公告",
      title: overrides.title ?? "測試標案",
      companies: overrides.companies,
    },
    job_number: "001",
    unit_id: overrides.unitId ?? "1.1.1",
    unit_name: overrides.unitName ?? "測試機關",
    unit_api_url: "",
    tender_api_url: "",
    unit_url: "",
    url: "",
  };
}

// 大員洛川 = myCompany, id = 89170941
const MY_ID = "89170941";
const MY_NAME = "大員洛川股份有限公司";

function makeCompanies(
  entries: { id: string; name: string; role: "得標" | "未得標" | "投標" }[],
) {
  const ids = entries.map((e) => e.id);
  const names = entries.map((e) => e.name);
  const id_key: Record<string, string[]> = {};
  const name_key: Record<string, string[]> = {};

  for (const e of entries) {
    const roleKey =
      e.role === "得標" ? "得標廠商" :
      e.role === "未得標" ? "未得標廠商" :
      "投標廠商";
    id_key[e.id] = [`${roleKey}:廠商代碼`];
    name_key[e.name] = [`${roleKey}:廠商名稱`];
  }

  return { ids, names, id_key, name_key };
}

describe("analyzeSelf", () => {
  it("基本統計正確", () => {
    const records = [
      makeRecord({
        type: "決標公告",
        companies: makeCompanies([
          { id: MY_ID, name: MY_NAME, role: "得標" },
          { id: "11111111", name: "對手A", role: "未得標" },
        ]),
      }),
      makeRecord({
        type: "決標公告",
        companies: makeCompanies([
          { id: "22222222", name: "對手B", role: "得標" },
          { id: MY_ID, name: MY_NAME, role: "未得標" },
        ]),
      }),
      makeRecord({
        type: "招標公告", // 不是決標，不計入
        companies: makeCompanies([
          { id: MY_ID, name: MY_NAME, role: "投標" },
        ]),
      }),
    ];

    const result = analyzeSelf(records, "大員洛川");
    expect(result.totalRecords).toBe(3);
    expect(result.awardRecords).toBe(2);
    expect(result.wins).toBe(1);
    expect(result.losses).toBe(1);
    expect(result.winRate).toBe(0.5);
  });

  it("競爭對手需撞案 >= 2 次才列入", () => {
    const records = [
      makeRecord({
        companies: makeCompanies([
          { id: MY_ID, name: MY_NAME, role: "得標" },
          { id: "11111111", name: "對手A", role: "未得標" },
        ]),
      }),
      makeRecord({
        companies: makeCompanies([
          { id: MY_ID, name: MY_NAME, role: "未得標" },
          { id: "11111111", name: "對手A", role: "得標" },
        ]),
      }),
      makeRecord({
        companies: makeCompanies([
          { id: MY_ID, name: MY_NAME, role: "得標" },
          { id: "33333333", name: "對手C只出現一次", role: "未得標" },
        ]),
      }),
    ];

    const result = analyzeSelf(records, "大員洛川");
    expect(result.competitors).toHaveLength(1);
    expect(result.competitors[0].name).toBe("對手A");
    expect(result.competitors[0].encounters).toBe(2);
    expect(result.competitors[0].theirWins).toBe(1);
    expect(result.competitors[0].myWins).toBe(1);
  });

  it("機關統計正確", () => {
    const records = [
      makeRecord({
        unitId: "A",
        unitName: "機關A",
        companies: makeCompanies([
          { id: MY_ID, name: MY_NAME, role: "得標" },
          { id: "11111111", name: "對手", role: "未得標" },
        ]),
      }),
      makeRecord({
        unitId: "A",
        unitName: "機關A",
        companies: makeCompanies([
          { id: MY_ID, name: MY_NAME, role: "未得標" },
          { id: "11111111", name: "對手", role: "得標" },
          { id: "22222222", name: "對手2", role: "未得標" },
        ]),
      }),
      makeRecord({
        unitId: "B",
        unitName: "機關B",
        companies: makeCompanies([
          { id: MY_ID, name: MY_NAME, role: "得標" },
        ]),
      }),
    ];

    const result = analyzeSelf(records, "大員洛川");
    const agA = result.agencies.find((a) => a.unitId === "A");
    expect(agA).toBeDefined();
    expect(agA!.totalCases).toBe(2);
    expect(agA!.myWins).toBe(1);
    expect(agA!.myLosses).toBe(1);
  });

  it("年度統計正確", () => {
    const records = [
      makeRecord({
        date: 20250601,
        companies: makeCompanies([
          { id: MY_ID, name: MY_NAME, role: "得標" },
        ]),
      }),
      makeRecord({
        date: 20250801,
        companies: makeCompanies([
          { id: MY_ID, name: MY_NAME, role: "未得標" },
          { id: "11111111", name: "對手", role: "得標" },
        ]),
      }),
      makeRecord({
        date: 20260101,
        companies: makeCompanies([
          { id: MY_ID, name: MY_NAME, role: "得標" },
        ]),
      }),
    ];

    const result = analyzeSelf(records, "大員洛川");
    const y2025 = result.yearlyStats.find((y) => y.year === 2025);
    const y2026 = result.yearlyStats.find((y) => y.year === 2026);
    expect(y2025).toMatchObject({ year: 2025, total: 2, wins: 1 });
    expect(y2026).toMatchObject({ year: 2026, total: 1, wins: 1 });
  });

  it("沒有紀錄時不崩潰", () => {
    const result = analyzeSelf([], "大員洛川");
    expect(result.totalRecords).toBe(0);
    expect(result.awardRecords).toBe(0);
    expect(result.wins).toBe(0);
    expect(result.winRate).toBe(0);
    expect(result.competitors).toEqual([]);
    expect(result.agencies).toEqual([]);
    expect(result.yearlyStats).toEqual([]);
  });

  it("競爭對手按撞案次數排序", () => {
    const records = Array.from({ length: 5 }, (_, i) =>
      makeRecord({
        companies: makeCompanies([
          { id: MY_ID, name: MY_NAME, role: i % 2 === 0 ? "得標" : "未得標" },
          { id: "AAAA", name: "常見對手", role: i % 2 === 0 ? "未得標" : "得標" },
          ...(i < 3 ? [{ id: "BBBB" as string, name: "偶爾對手" as string, role: "未得標" as const }] : []),
        ]),
      }),
    );

    const result = analyzeSelf(records, "大員洛川");
    expect(result.competitors.length).toBe(2);
    expect(result.competitors[0].name).toBe("常見對手");
    expect(result.competitors[0].encounters).toBe(5);
    expect(result.competitors[1].name).toBe("偶爾對手");
    expect(result.competitors[1].encounters).toBe(3);
  });
});

// ====== fetchAllPages 測試 ======

function makeSimpleRecord(title: string): PCCRecord {
  return {
    date: 20260101,
    filename: "test",
    brief: { type: "決標公告", title },
    job_number: "001",
    unit_id: "1.1.1",
    unit_name: "測試機關",
    unit_api_url: "",
    tender_api_url: "",
    unit_url: "",
    url: "",
  };
}

function makeSearchResponse(
  records: PCCRecord[],
  page: number,
  totalPages: number,
): PCCSearchResponse {
  return {
    query: "test",
    page,
    total_records: totalPages * records.length,
    total_pages: totalPages,
    took: 10,
    records,
  };
}

describe("fetchAllPages", () => {
  it("單頁結果直接回傳", async () => {
    const record = makeSimpleRecord("標案A");
    vi.spyOn(api, "pccApiFetch").mockResolvedValueOnce(
      makeSearchResponse([record], 1, 1),
    );
    vi.spyOn(api, "delay").mockResolvedValue(undefined);

    const result = await fetchAllPages("測試公司");

    expect(result).toHaveLength(1);
    expect(result[0].brief.title).toBe("標案A");
    expect(api.pccApiFetch).toHaveBeenCalledTimes(1);

    vi.restoreAllMocks();
  });

  it("多頁結果逐頁載入並合併", async () => {
    const r1 = makeSimpleRecord("頁1");
    const r2 = makeSimpleRecord("頁2");
    const r3 = makeSimpleRecord("頁3");

    const fetchSpy = vi.spyOn(api, "pccApiFetch")
      .mockResolvedValueOnce(makeSearchResponse([r1], 1, 3))
      .mockResolvedValueOnce(makeSearchResponse([r2], 2, 3))
      .mockResolvedValueOnce(makeSearchResponse([r3], 3, 3));
    vi.spyOn(api, "delay").mockResolvedValue(undefined);

    const result = await fetchAllPages("測試公司");

    expect(result).toHaveLength(3);
    expect(result.map((r) => r.brief.title)).toEqual(["頁1", "頁2", "頁3"]);
    expect(fetchSpy).toHaveBeenCalledTimes(3);

    vi.restoreAllMocks();
  });

  it("呼叫 onProgress 回傳進度", async () => {
    const r1 = makeSimpleRecord("A");
    const r2 = makeSimpleRecord("B");

    vi.spyOn(api, "pccApiFetch")
      .mockResolvedValueOnce(makeSearchResponse([r1], 1, 2))
      .mockResolvedValueOnce(makeSearchResponse([r2], 2, 2));
    vi.spyOn(api, "delay").mockResolvedValue(undefined);

    const progress: [number, number][] = [];
    await fetchAllPages("測試公司", (loaded, total) => {
      progress.push([loaded, total]);
    });

    expect(progress).toEqual([[1, 2], [2, 2]]);

    vi.restoreAllMocks();
  });

  it("最多載入 20 頁", async () => {
    const record = makeSimpleRecord("資料");

    const fetchSpy = vi.spyOn(api, "pccApiFetch").mockImplementation(
      async (_action, data) => {
        const page = (data as { page: number }).page;
        return makeSearchResponse([record], page, 50);
      },
    );
    vi.spyOn(api, "delay").mockResolvedValue(undefined);

    const result = await fetchAllPages("測試公司");

    expect(result).toHaveLength(20);
    expect(fetchSpy).toHaveBeenCalledTimes(20);

    vi.restoreAllMocks();
  });

  it("不帶 onProgress 也不會出錯", async () => {
    vi.spyOn(api, "pccApiFetch").mockResolvedValueOnce(
      makeSearchResponse([makeSimpleRecord("X")], 1, 1),
    );
    vi.spyOn(api, "delay").mockResolvedValue(undefined);

    const result = await fetchAllPages("測試公司");
    expect(result).toHaveLength(1);

    vi.restoreAllMocks();
  });
});
