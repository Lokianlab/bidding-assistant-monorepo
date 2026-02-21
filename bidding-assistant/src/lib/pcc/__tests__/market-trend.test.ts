import { describe, it, expect } from "vitest";
import { analyzeMarketTrend, judgeTrend } from "../market-trend";
import type { PCCRecord, YearlyMarketData } from "../types";

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
  it("空記錄回傳藍海且趨勢持平", () => {
    const result = analyzeMarketTrend([], "食農教育");
    expect(result.keyword).toBe("食農教育");
    expect(result.totalRecords).toBe(0);
    expect(result.competitionLevel).toBe("藍海");
    expect(result.trendDirection).toBe("持平");
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

  it("統計活躍機關（含 unitId）", () => {
    const records = [
      mockRecord({ date: 20240101, unit_id: "UA", unit_name: "機關A" }),
      mockRecord({ date: 20240201, unit_id: "UA", unit_name: "機關A" }),
      mockRecord({ date: 20240301, unit_id: "UB", unit_name: "機關B" }),
      mockRecord({ date: 20240401, unit_id: "UC", unit_name: "機關C" }),
      mockRecord({ date: 20240501, unit_id: "UC", unit_name: "機關C" }),
      mockRecord({ date: 20240601, unit_id: "UC", unit_name: "機關C" }),
    ];
    const result = analyzeMarketTrend(records, "test");

    expect(result.topAgencies[0].name).toBe("機關C");
    expect(result.topAgencies[0].unitId).toBe("UC");
    expect(result.topAgencies[0].count).toBe(3);
    expect(result.topAgencies[1].name).toBe("機關A");
    expect(result.topAgencies[1].unitId).toBe("UA");
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

// ====== judgeTrend 單元測試 ======

function makeYearData(year: number, totalCases: number): YearlyMarketData {
  return {
    year,
    totalCases,
    awardCases: 0,
    tenderCases: 0,
    avgBidders: 0,
    maxBidders: 0,
    minBidders: 0,
    topAgencies: [],
  };
}

describe("judgeTrend", () => {
  it("不到 2 年資料回傳持平", () => {
    expect(judgeTrend([])).toBe("持平");
    expect(judgeTrend([makeYearData(2024, 10)])).toBe("持平");
  });

  it("後半段案件量增加超過 20% 判為增加", () => {
    const data = [
      makeYearData(2022, 10),
      makeYearData(2023, 10),
      makeYearData(2024, 15),
      makeYearData(2025, 18),
    ];
    // 前半平均 10，後半平均 16.5，+65% > 20%
    expect(judgeTrend(data)).toBe("增加");
  });

  it("後半段案件量減少超過 20% 判為減少", () => {
    const data = [
      makeYearData(2022, 20),
      makeYearData(2023, 18),
      makeYearData(2024, 8),
      makeYearData(2025, 6),
    ];
    // 前半平均 19，後半平均 7，-63% < -20%
    expect(judgeTrend(data)).toBe("減少");
  });

  it("變化在 20% 以內判為持平", () => {
    const data = [
      makeYearData(2022, 10),
      makeYearData(2023, 11),
      makeYearData(2024, 10),
      makeYearData(2025, 12),
    ];
    // 前半平均 10.5，後半平均 11，+4.8% < 20%
    expect(judgeTrend(data)).toBe("持平");
  });

  it("前半為 0 後半有量判為增加", () => {
    const data = [
      makeYearData(2023, 0),
      makeYearData(2024, 5),
    ];
    expect(judgeTrend(data)).toBe("增加");
  });

  it("前後都是 0 判為持平", () => {
    const data = [
      makeYearData(2023, 0),
      makeYearData(2024, 0),
    ];
    expect(judgeTrend(data)).toBe("持平");
  });

  it("剛好 2 年也能判斷", () => {
    const data = [
      makeYearData(2023, 5),
      makeYearData(2024, 10),
    ];
    // 前半平均 5，後半平均 10，+100% > 20%
    expect(judgeTrend(data)).toBe("增加");
  });
});
