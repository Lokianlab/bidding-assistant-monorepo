import type { PCCRecord, YearlyMarketData, MarketTrend } from "./types";

// ====== 市場趨勢分析 ======

/**
 * 從搜尋結果分析市場趨勢。
 * 純函式，不碰 API——資料怎麼取由上層決定。
 */
export function analyzeMarketTrend(
  records: PCCRecord[],
  keyword: string,
): MarketTrend {
  if (records.length === 0) {
    return {
      keyword,
      totalRecords: 0,
      yearRange: [0, 0],
      yearlyData: [],
      topAgencies: [],
      competitionLevel: "藍海",
    };
  }

  // 按年度分組
  const yearMap = new Map<number, {
    total: number;
    awards: number;
    tenders: number;
    bidderCounts: number[];
    agencyCount: Map<string, number>;
  }>();

  // 全期機關統計
  const globalAgencyMap = new Map<string, number>();

  for (const record of records) {
    const year = Math.floor(record.date / 10000);
    const isAward = record.brief.type === "決標公告";
    const isTender = record.brief.type === "招標公告";
    const bidderCount = isAward && record.brief.companies
      ? record.brief.companies.ids.length
      : 0;

    // 年度統計
    const yearData = yearMap.get(year) ?? {
      total: 0,
      awards: 0,
      tenders: 0,
      bidderCounts: [],
      agencyCount: new Map<string, number>(),
    };
    yearData.total++;
    if (isAward) {
      yearData.awards++;
      if (bidderCount > 0) yearData.bidderCounts.push(bidderCount);
    }
    if (isTender) yearData.tenders++;

    // 年度機關統計
    const agCount = yearData.agencyCount.get(record.unit_name) ?? 0;
    yearData.agencyCount.set(record.unit_name, agCount + 1);
    yearMap.set(year, yearData);

    // 全期機關統計
    const gCount = globalAgencyMap.get(record.unit_name) ?? 0;
    globalAgencyMap.set(record.unit_name, gCount + 1);
  }

  // 合成年度資料
  const yearlyData: YearlyMarketData[] = Array.from(yearMap.entries())
    .map(([year, data]) => {
      const avgBidders = data.bidderCounts.length > 0
        ? data.bidderCounts.reduce((a, b) => a + b, 0) / data.bidderCounts.length
        : 0;

      // 年度前 3 活躍機關
      const topAgencies = Array.from(data.agencyCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name]) => name);

      return {
        year,
        totalCases: data.total,
        awardCases: data.awards,
        tenderCases: data.tenders,
        avgBidders: Math.round(avgBidders * 10) / 10,
        maxBidders: data.bidderCounts.length > 0 ? Math.max(...data.bidderCounts) : 0,
        minBidders: data.bidderCounts.length > 0 ? Math.min(...data.bidderCounts) : 0,
        topAgencies,
      };
    })
    .sort((a, b) => a.year - b.year);

  // 全期前 10 活躍機關
  const topAgencies = Array.from(globalAgencyMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  // 競爭程度判斷：基於近 3 年平均投標家數
  const recentYears = yearlyData.slice(-3);
  const competitionLevel = judgeCompetition(recentYears);

  const years = yearlyData.map((d) => d.year);

  return {
    keyword,
    totalRecords: records.length,
    yearRange: [Math.min(...years), Math.max(...years)],
    yearlyData,
    topAgencies,
    competitionLevel,
  };
}

/** 根據近年平均投標家數判斷競爭程度 */
function judgeCompetition(recentYears: YearlyMarketData[]): MarketTrend["competitionLevel"] {
  const bidderCounts = recentYears
    .filter((y) => y.avgBidders > 0)
    .map((y) => y.avgBidders);

  if (bidderCounts.length === 0) return "藍海";

  const avg = bidderCounts.reduce((a, b) => a + b, 0) / bidderCounts.length;

  if (avg >= 5) return "紅海";
  if (avg >= 3) return "一般";
  return "藍海";
}
