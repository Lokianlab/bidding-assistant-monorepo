import type {
  PCCRecord,
  PCCSearchResponse,
  CompetitorStats,
  AgencyStats,
  SelfAnalysis,
} from "./types";
import { isWinner } from "./helpers";
import { pccApiFetch, delay } from "./api";

// ====== 全頁面載入 ======

/** 取得某公司所有頁面的搜尋結果 */
export async function fetchAllPages(
  companyName: string,
  onProgress?: (loaded: number, total: number) => void,
): Promise<PCCRecord[]> {
  const allRecords: PCCRecord[] = [];

  // 第一頁
  const page1 = await fetchCompanyPage(companyName, 1);
  allRecords.push(...page1.records);
  const totalPages = page1.total_pages;

  if (onProgress) onProgress(1, totalPages);

  // 剩餘頁面
  for (let p = 2; p <= totalPages && p <= 20; p++) {
    // 300ms 延遲（跟 API route 一致）
    await delay(300);
    const page = await fetchCompanyPage(companyName, p);
    allRecords.push(...page.records);
    if (onProgress) onProgress(p, totalPages);
  }

  return allRecords;
}

async function fetchCompanyPage(companyName: string, page: number): Promise<PCCSearchResponse> {
  return pccApiFetch<PCCSearchResponse>("searchByCompany", { query: companyName, page });
}

// ====== 分析邏輯 ======

/** 從搜尋結果中找出我方公司的全名（因為名稱可能帶英文後綴） */
function findMyFullName(records: PCCRecord[], searchName: string): string {
  for (const r of records) {
    const names = r.brief.companies?.names ?? [];
    const match = names.find((n) => n.includes(searchName));
    if (match) return match;
  }
  return searchName;
}

/** 從搜尋結果中找出我方統編 */
function findMyId(records: PCCRecord[], myFullName: string): string {
  for (const r of records) {
    const companies = r.brief.companies;
    if (!companies) continue;
    const nameIdx = companies.names.indexOf(myFullName);
    if (nameIdx >= 0 && nameIdx < companies.ids.length) {
      return companies.ids[nameIdx];
    }
  }
  return "";
}

/** 完整的自我分析 + 競爭分析 */
export function analyzeSelf(records: PCCRecord[], companySearchName: string): SelfAnalysis {
  const myFullName = findMyFullName(records, companySearchName);
  const myId = findMyId(records, myFullName);

  // 只看決標公告
  const awardRecords = records.filter((r) => r.brief.type === "決標公告");

  let wins = 0;
  let losses = 0;

  // 競爭對手統計（用統編為 key）
  const competitorMap = new Map<string, CompetitorStats>();
  // 機關統計
  const agencyMap = new Map<string, AgencyStats>();
  // 年度統計
  const yearMap = new Map<number, { total: number; wins: number }>();

  for (const record of awardRecords) {
    const companies = record.brief.companies;
    if (!companies) continue;

    const iWon = isWinner(record, myFullName);
    if (iWon) wins++;
    else losses++;

    // 年度
    const year = Math.floor(record.date / 10000);
    const yearStat = yearMap.get(year) ?? { total: 0, wins: 0 };
    yearStat.total++;
    if (iWon) yearStat.wins++;
    yearMap.set(year, yearStat);

    // 機關
    const agStat = agencyMap.get(record.unit_id) ?? {
      unitId: record.unit_id,
      unitName: record.unit_name,
      totalCases: 0,
      myWins: 0,
      myLosses: 0,
      avgBidders: 0,
    };
    agStat.totalCases++;
    if (iWon) agStat.myWins++;
    else agStat.myLosses++;
    // 簡單取投標家數 = companies.ids.length
    agStat.avgBidders =
      (agStat.avgBidders * (agStat.totalCases - 1) + companies.ids.length) / agStat.totalCases;
    agencyMap.set(record.unit_id, agStat);

    // 競爭對手：同案出現的其他公司
    for (let i = 0; i < companies.ids.length; i++) {
      const cId = companies.ids[i];
      if (cId === myId) continue;

      const cName = companies.names[i] ?? cId;
      const existing = competitorMap.get(cId) ?? {
        id: cId,
        name: cName,
        encounters: 0,
        theirWins: 0,
        myWins: 0,
        agencies: [],
      };
      existing.encounters++;
      if (iWon) existing.myWins++;
      if (isWinner(record, cName)) existing.theirWins++;
      if (!existing.agencies.includes(record.unit_name)) {
        existing.agencies.push(record.unit_name);
      }
      competitorMap.set(cId, existing);
    }
  }

  return {
    totalRecords: records.length,
    awardRecords: awardRecords.length,
    wins,
    losses,
    winRate: awardRecords.length > 0 ? wins / awardRecords.length : 0,
    competitors: Array.from(competitorMap.values())
      .filter((c) => c.encounters >= 2) // 門檻：至少撞案 2 次
      .sort((a, b) => b.encounters - a.encounters),
    agencies: Array.from(agencyMap.values())
      .sort((a, b) => b.totalCases - a.totalCases),
    yearlyStats: Array.from(yearMap.entries())
      .map(([year, stat]) => ({ year, ...stat }))
      .sort((a, b) => b.year - a.year),
  };
}
