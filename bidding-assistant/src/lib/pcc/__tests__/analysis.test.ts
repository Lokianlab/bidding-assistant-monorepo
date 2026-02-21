import { describe, it, expect } from "vitest";
import { analyzeSelf } from "../analysis";
import type { PCCRecord } from "../types";

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
    expect(y2025).toEqual({ year: 2025, total: 2, wins: 1 });
    expect(y2026).toEqual({ year: 2026, total: 1, wins: 1 });
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
