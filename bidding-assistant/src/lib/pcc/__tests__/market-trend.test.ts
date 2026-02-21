import { describe, it, expect } from "vitest";
import { analyzeMarketTrend } from "../market-trend";
import type { PCCRecord } from "../types";

function mockRecord(overrides: Partial<PCCRecord> & { date: number }): PCCRecord {
  return {
    filename: "test.html",
    brief: {
      type: "決標公告",
      title: "測試標案",
      companies: {
        ids: ["11111111", "22222222", "33333333"],
        names: ["A公司", "B公司", "C公司"],
        id_key: {},
        name_key: {},
      },
    },
    job_number: "J001",
    unit_id: "U001",
    unit_name: "測試機關",
    unit_api_url: "",
    tender_api_url: "",
    unit_url: "",
    url: "",
    ...overrides,
  };
}

describe("analyzeMarketTrend", () => {
  it("空記錄回傳藍海", () => {
    const result = analyzeMarketTrend([], "食農教育");
    expect(result.keyword).toBe("食農教育");
    expect(result.totalRecords).toBe(0);
    expect(result.competitionLevel).toBe("藍海");
    expect(result.yearlyData).toHaveLength(0);
  });

  it("正確分年統計", () => {
    const records = [
      mockRecord({ date: 20240101 }),
      mockRecord({ date: 20240601 }),
      mockRecord({ date: 20250301 }),
    ];
    const result = analyzeMarketTrend(records, "走讀");

    expect(result.totalRecords).toBe(3);
    expect(result.yearlyData).toHaveLength(2);

    const y2024 = result.yearlyData.find((y) => y.year === 2024);
    expect(y2024?.totalCases).toBe(2);
    expect(y2024?.awardCases).toBe(2);

    const y2025 = result.yearlyData.find((y) => y.year === 2025);
    expect(y2025?.totalCases).toBe(1);
  });

  it("區分招標和決標公告", () => {
    const records = [
      mockRecord({ date: 20240101, brief: { type: "招標公告", title: "T" } }),
      mockRecord({ date: 20240201 }), // 決標公告
      mockRecord({ date: 20240301 }), // 決標公告
    ];
    const result = analyzeMarketTrend(records, "test");

    const y2024 = result.yearlyData[0];
    expect(y2024.tenderCases).toBe(1);
    expect(y2024.awardCases).toBe(2);
    expect(y2024.totalCases).toBe(3);
  });

  it("計算平均投標家數", () => {
    const records = [
      mockRecord({
        date: 20240101,
        brief: {
          type: "決標公告",
          title: "T",
          companies: { ids: ["1", "2"], names: ["A", "B"], id_key: {}, name_key: {} },
        },
      }),
      mockRecord({
        date: 20240201,
        brief: {
          type: "決標公告",
          title: "T",
          companies: { ids: ["1", "2", "3", "4"], names: ["A", "B", "C", "D"], id_key: {}, name_key: {} },
        },
      }),
    ];
    const result = analyzeMarketTrend(records, "test");

    // (2 + 4) / 2 = 3.0
    expect(result.yearlyData[0].avgBidders).toBe(3);
    expect(result.yearlyData[0].maxBidders).toBe(4);
    expect(result.yearlyData[0].minBidders).toBe(2);
  });

  it("招標公告不計入投標家數", () => {
    const records = [
      mockRecord({ date: 20240101, brief: { type: "招標公告", title: "T" } }),
    ];
    const result = analyzeMarketTrend(records, "test");

    expect(result.yearlyData[0].avgBidders).toBe(0);
    expect(result.yearlyData[0].maxBidders).toBe(0);
  });

  it("統計活躍機關", () => {
    const records = [
      mockRecord({ date: 20240101, unit_name: "機關A" }),
      mockRecord({ date: 20240201, unit_name: "機關A" }),
      mockRecord({ date: 20240301, unit_name: "機關B" }),
      mockRecord({ date: 20240401, unit_name: "機關C" }),
      mockRecord({ date: 20240501, unit_name: "機關C" }),
      mockRecord({ date: 20240601, unit_name: "機關C" }),
    ];
    const result = analyzeMarketTrend(records, "test");

    expect(result.topAgencies[0].name).toBe("機關C");
    expect(result.topAgencies[0].count).toBe(3);
    expect(result.topAgencies[1].name).toBe("機關A");
  });

  it("紅海判斷：近年平均投標 ≥ 5 家", () => {
    const records = Array.from({ length: 5 }, (_, i) =>
      mockRecord({
        date: 20240101 + i * 100,
        brief: {
          type: "決標公告",
          title: "T",
          companies: {
            ids: ["1", "2", "3", "4", "5", "6"],
            names: ["A", "B", "C", "D", "E", "F"],
            id_key: {},
            name_key: {},
          },
        },
      }),
    );
    const result = analyzeMarketTrend(records, "test");
    expect(result.competitionLevel).toBe("紅海");
  });

  it("藍海判斷：近年平均投標 < 3 家", () => {
    const records = [
      mockRecord({
        date: 20240101,
        brief: {
          type: "決標公告",
          title: "T",
          companies: { ids: ["1", "2"], names: ["A", "B"], id_key: {}, name_key: {} },
        },
      }),
    ];
    const result = analyzeMarketTrend(records, "test");
    expect(result.competitionLevel).toBe("藍海");
  });

  it("年份範圍正確", () => {
    const records = [
      mockRecord({ date: 20220101 }),
      mockRecord({ date: 20240601 }),
    ];
    const result = analyzeMarketTrend(records, "test");
    expect(result.yearRange).toEqual([2022, 2024]);
  });

  it("年度前 3 活躍機關", () => {
    const records = [
      mockRecord({ date: 20240101, unit_name: "機關D" }),
      mockRecord({ date: 20240201, unit_name: "機關D" }),
      mockRecord({ date: 20240301, unit_name: "機關E" }),
      mockRecord({ date: 20240401, unit_name: "機關F" }),
      mockRecord({ date: 20240501, unit_name: "機關G" }),
      mockRecord({ date: 20240601, unit_name: "機關G" }),
      mockRecord({ date: 20240701, unit_name: "機關G" }),
    ];
    const result = analyzeMarketTrend(records, "test");

    const y2024 = result.yearlyData[0];
    expect(y2024.topAgencies).toHaveLength(3);
    expect(y2024.topAgencies[0]).toBe("機關G");
    expect(y2024.topAgencies[1]).toBe("機關D");
  });
});
