// ====== 分年標案分析聚合函式 ======

import type {
  AgencyCase,
  YearlyCategoryStat,
  BidderGroup,
  CompetitorByCategory,
  CategoryCompetitor,
} from "./types";

/** 從 award_date 字串（YYYY/MM/DD 或 YYYYMMDD）取出年份 */
function extractYear(dateStr: string): number {
  const clean = dateStr.replace(/\//g, '');
  return parseInt(clean.slice(0, 4), 10);
}

/** 按 bidderGroup 過濾案件 */
function filterByBidderGroup(cases: AgencyCase[], group: BidderGroup): AgencyCase[] {
  switch (group) {
    case 'single': return cases.filter((c) => c.bidder_count === 1);
    case 'two':    return cases.filter((c) => c.bidder_count === 2);
    case 'multi':  return cases.filter((c) => c.bidder_count >= 3);
    case 'total':  return cases;
  }
}

/** 聚合一組案件 → YearlyCategoryStat[] */
function aggregateCases(cases: AgencyCase[]): YearlyCategoryStat[] {
  const map = new Map<string, YearlyCategoryStat>();

  for (const c of cases) {
    const year = extractYear(c.award_date);
    if (isNaN(year)) continue;
    const key = `${year}__${c.category}`;

    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
      if (c.award_amount !== null) {
        existing.award_total = (existing.award_total ?? 0) + c.award_amount;
      }
    } else {
      map.set(key, {
        year,
        category: c.category,
        count: 1,
        budget_total: null, // PCC search 通常不含預算
        award_total: c.award_amount !== null ? c.award_amount : null,
      });
    }
  }

  // 按年份降序、分類字母序排列
  return Array.from(map.values()).sort((a, b) =>
    b.year !== a.year ? b.year - a.year : a.category.localeCompare(b.category, 'zh-TW'),
  );
}

/**
 * 建立分年標案分析。
 * 含 total + 三個投標家數組別。
 */
export function buildYearlyAnalysis(cases: AgencyCase[]): Record<BidderGroup, YearlyCategoryStat[]> {
  return {
    total:  aggregateCases(filterByBidderGroup(cases, 'total')),
    single: aggregateCases(filterByBidderGroup(cases, 'single')),
    two:    aggregateCases(filterByBidderGroup(cases, 'two')),
    multi:  aggregateCases(filterByBidderGroup(cases, 'multi')),
  };
}

/**
 * 建立分類競爭對手分析。
 * 對每個分類，統計出現最多次的投標廠商（含得標/未得標）。
 */
export function buildCompetitorsByCategory(cases: AgencyCase[]): CompetitorByCategory[] {
  // category → { name → { encounter, win } }
  const catMap = new Map<string, Map<string, { encounter: number; win: number }>>();

  for (const c of cases) {
    if (!catMap.has(c.category)) catMap.set(c.category, new Map());
    const compMap = catMap.get(c.category)!;

    for (const name of c.all_bidder_names) {
      if (!name) continue;
      const existing = compMap.get(name) ?? { encounter: 0, win: 0 };
      existing.encounter += 1;
      if (name === c.winner_name) existing.win += 1;
      compMap.set(name, existing);
    }
  }

  const result: CompetitorByCategory[] = [];

  for (const [category, compMap] of catMap.entries()) {
    const competitors: CategoryCompetitor[] = Array.from(compMap.entries())
      .map(([name, stats]) => ({
        name,
        encounter_count: stats.encounter,
        win_count: stats.win,
      }))
      .sort((a, b) => b.encounter_count - a.encounter_count)
      .slice(0, 8);

    result.push({
      category,
      total_cases: cases.filter((c) => c.category === category).length,
      top_competitors: competitors,
    });
  }

  // 按 total_cases 降序
  return result.sort((a, b) => b.total_cases - a.total_cases);
}
