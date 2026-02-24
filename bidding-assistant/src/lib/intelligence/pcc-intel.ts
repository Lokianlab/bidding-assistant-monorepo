// ====== PCC 情報蒐集 ======
// 從政府採購網 API 取得機關歷史標案資料，分析得標廠商與競爭態勢。

import { pccApiFetch, delay } from "@/lib/pcc/api";
import type { PCCSearchResponse, PCCRecord } from "@/lib/pcc/types";
import { isWinner, parseAmount, findDetailValue } from "@/lib/pcc/helpers";
import { saveIntelCache, getIntelCache } from "@/lib/supabase/intel-client";
import { INTEL_CACHE_TTL } from "./constants";
import { analyzeTopWinners } from "./helpers";
import type {
  AgencyHistoryData,
  AgencyCase,
  CompetitorData,
  Competitor,
} from "./types";

// ====== 機關歷史查詢 ======

/**
 * 搜尋某機關的歷史標案，統計得標廠商排名。
 * 1. 先查 Supabase 快取
 * 2. 快取過期或不存在時從 PCC API 取得
 * 3. 結果寫回快取
 */
export async function fetchAgencyHistory(
  unitId: string,
  unitName: string,
  caseId?: string,
): Promise<AgencyHistoryData> {
  // 1. 嘗試讀取快取
  if (caseId) {
    const cached = await getIntelCache(caseId, "agency_history");
    if (cached) {
      return cached.data as unknown as AgencyHistoryData;
    }
  }

  // 2. 從 PCC API 取得機關標案列表（最多 10 頁）
  const allRecords: PCCRecord[] = [];

  const firstPage = await pccApiFetch<PCCSearchResponse>("listByUnit", {
    unit_id: unitId,
    page: 1,
  });
  allRecords.push(...firstPage.records);

  const totalPages = Math.min(firstPage.total_pages, 10);
  for (let page = 2; page <= totalPages; page++) {
    await delay(300); // Rate limiting
    const pageData = await pccApiFetch<PCCSearchResponse>("listByUnit", {
      unit_id: unitId,
      page,
    });
    allRecords.push(...pageData.records);
  }

  // 3. 只保留決標公告
  const awardRecords = allRecords.filter(
    (r) => r.brief.type === "決標公告",
  );

  // 4. 解析為 AgencyCase 格式
  const cases: AgencyCase[] = awardRecords.map((record) =>
    parseRecordToAgencyCase(record),
  );

  // 5. 分析 Top Winners
  const top_winners = analyzeTopWinners(cases);

  const result: AgencyHistoryData = {
    unit_id: unitId,
    unit_name: unitName,
    total_cases: cases.length,
    cases,
    top_winners,
  };

  // 6. 寫入快取
  if (caseId) {
    await saveIntelCache({
      case_id: caseId,
      intel_type: "agency_history",
      data: result as unknown as Record<string, unknown>,
      source: "pcc",
      pcc_unit_id: unitId,
      ttl_days: INTEL_CACHE_TTL.pcc,
    }).catch(() => {
      // 快取寫入失敗不阻塞主流程
    });
  }

  return result;
}

// ====== 競爭對手分析 ======

/**
 * 針對機關歷史中的 Top Winners，逐一搜尋其在其他機關的得標記錄。
 * 分析其專長領域與跨機關佈局。
 */
export async function fetchCompetitorAnalysis(
  agencyHistory: AgencyHistoryData,
  caseId?: string,
): Promise<CompetitorData> {
  // 嘗試讀取快取
  if (caseId) {
    const cached = await getIntelCache(caseId, "competitor");
    if (cached) {
      return cached.data as unknown as CompetitorData;
    }
  }

  // 取前 5 名常勝廠商進行深入分析
  const topN = agencyHistory.top_winners.slice(0, 5);
  const competitors: Competitor[] = [];

  for (const winner of topN) {
    await delay(500); // Rate limiting，避免打太快

    try {
      const compData = await analyzeCompetitor(
        winner.name,
        winner.id,
        agencyHistory,
      );
      competitors.push(compData);
    } catch {
      // 單一競爭對手查詢失敗不影響整體
      competitors.push({
        name: winner.name,
        id: winner.id,
        win_count: winner.win_count,
        total_amount: winner.total_amount,
        consecutive_years: winner.consecutive_years,
        other_agencies: [],
        specializations: [],
      });
    }
  }

  const result: CompetitorData = { competitors };

  // 寫入快取
  if (caseId) {
    await saveIntelCache({
      case_id: caseId,
      intel_type: "competitor",
      data: result as unknown as Record<string, unknown>,
      source: "pcc",
      pcc_unit_id: agencyHistory.unit_id,
      ttl_days: INTEL_CACHE_TTL.pcc,
    }).catch(() => {});
  }

  return result;
}

// ====== 內部輔助函式 ======

/** 從 PCC 搜尋記錄解析為 AgencyCase */
function parseRecordToAgencyCase(record: PCCRecord): AgencyCase {
  const companies = record.brief.companies;
  let winnerName = "";
  let winnerId = "";
  let bidderCount = 0;

  if (companies) {
    // 找出得標廠商
    for (const name of companies.names) {
      if (isWinner(record, name)) {
        winnerName = name;
        // 找對應的統編
        const nameIdx = companies.names.indexOf(name);
        if (nameIdx >= 0 && nameIdx < companies.ids.length) {
          winnerId = companies.ids[nameIdx];
        }
        break;
      }
    }
    bidderCount = companies.ids.length;
  }

  // 解析日期
  const dateStr = String(record.date);
  const awardDate =
    dateStr.length === 8
      ? `${dateStr.slice(0, 4)}/${dateStr.slice(4, 6)}/${dateStr.slice(6, 8)}`
      : dateStr;

  return {
    job_number: record.job_number,
    title: record.brief.title,
    award_date: awardDate,
    award_amount: parseAwardAmountFromRecord(record),
    winner_name: winnerName,
    winner_id: winnerId,
    bidder_count: bidderCount,
  };
}

/** 嘗試從記錄中取得決標金額（搜尋結果通常不含金額，回傳 null） */
function parseAwardAmountFromRecord(record: PCCRecord): number | null {
  // 搜尋結果的 brief 不含金額，需要查 detail
  // 但 detail 需要額外 API 呼叫，這裡先回傳 null
  // 金額資訊會在使用者點擊個別案件時載入
  const detail = record as unknown as Record<string, string>;
  const amountStr = findDetailValue(detail, ":總決標金額");
  return amountStr ? parseAmount(amountStr) : null;
}

/** 分析單一競爭對手的跨機關佈局 */
async function analyzeCompetitor(
  companyName: string,
  companyId: string,
  agencyHistory: AgencyHistoryData,
): Promise<Competitor> {
  // 搜尋該廠商在 PCC 的所有得標記錄
  const searchResult = await pccApiFetch<PCCSearchResponse>(
    "searchByCompany",
    { query: companyName, page: 1 },
  );

  const records = searchResult.records;

  // 統計其他機關（排除當前機關）
  const otherAgencies = new Set<string>();
  const titleKeywords = new Map<string, number>();
  let winCount = 0;
  let totalAmount = 0;

  for (const record of records) {
    if (record.brief.type !== "決標公告") continue;

    if (isWinner(record, companyName)) {
      winCount++;

      // 收集其他機關
      if (record.unit_id !== agencyHistory.unit_id) {
        otherAgencies.add(record.unit_name);
      }

      // 收集案名關鍵字（用於推測專長）
      extractTitleKeywords(record.brief.title, titleKeywords);
    }
  }

  // 找出在當前機關的資料
  const agencyWinner = agencyHistory.top_winners.find(
    (w) => w.name === companyName || w.id === companyId,
  );

  return {
    name: companyName,
    id: companyId,
    win_count: agencyWinner?.win_count ?? winCount,
    total_amount: agencyWinner?.total_amount ?? totalAmount,
    consecutive_years: agencyWinner?.consecutive_years ?? 0,
    other_agencies: Array.from(otherAgencies).slice(0, 10),
    specializations: deriveSpecializations(titleKeywords),
  };
}

/** 從案名提取關鍵字用於推測專長領域 */
function extractTitleKeywords(
  title: string,
  keywordMap: Map<string, number>,
): void {
  const keywords = [
    "活動", "展覽", "演出", "文化", "藝術", "行銷", "推廣",
    "規劃", "設計", "教育", "培訓", "觀光", "旅遊", "資訊",
    "系統", "工程", "研究", "顧問", "影像", "多媒體", "印刷",
  ];

  for (const kw of keywords) {
    if (title.includes(kw)) {
      keywordMap.set(kw, (keywordMap.get(kw) ?? 0) + 1);
    }
  }
}

/** 從關鍵字頻率推導專長領域（取出現 2 次以上的） */
function deriveSpecializations(keywordMap: Map<string, number>): string[] {
  return Array.from(keywordMap.entries())
    .filter(([, count]) => count >= 2)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([keyword]) => keyword);
}
