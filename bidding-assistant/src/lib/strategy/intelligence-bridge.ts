// ====== M01→M03 情報橋接 ======
// 從 PCC 快取被動讀取已有的情報資料，供戰略分析使用。
// 不發 API 請求——只用已快取的資料。

import { cacheGet } from "@/lib/pcc/cache";
import type { SelfAnalysis, MarketTrend } from "@/lib/pcc/types";
import type { IntelligenceInputs } from "./types";

/**
 * 從 PCC localStorage 快取讀取情報資料。
 * 快取存在就用，不存在就回傳 null（降級處理）。
 *
 * @param companyBrand 公司品牌名（用來查競爭分析快取 key）
 * @param caseName 案件名稱（用來匹配市場趨勢快取）
 */
export function readCachedIntelligence(
  companyBrand: string,
  caseName: string,
): IntelligenceInputs {
  // 1. 競爭分析（SelfAnalysis）——以公司品牌名為 key
  const selfAnalysis = companyBrand
    ? cacheGet<SelfAnalysis>("analysis", `competitor:${companyBrand}`)
    : null;

  // 2. 市場趨勢（MarketTrend）——掃描快取找關鍵字匹配
  const marketTrend = findCachedMarketTrend(caseName);

  return {
    selfAnalysis,
    marketTrend,
    tenderSummary: null, // 需要知道具體標案編號才能查，暫不實作
  };
}

/**
 * 掃描 localStorage 中的市場趨勢快取，找到與案件名稱最相關的一筆。
 * 匹配邏輯：市場趨勢的搜尋關鍵字出現在案件名稱中。
 */
function findCachedMarketTrend(caseName: string): MarketTrend | null {
  if (!caseName.trim() || typeof window === "undefined") return null;

  const prefix = "pcc-cache:analysis:market:";
  let bestMatch: MarketTrend | null = null;
  let bestKeywordLen = 0;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(prefix)) continue;

    const keyword = key.slice(prefix.length);
    // 關鍵字出現在案件名稱中才算匹配
    if (keyword && caseName.includes(keyword) && keyword.length > bestKeywordLen) {
      const trend = cacheGet<MarketTrend>("analysis", `market:${keyword}`);
      if (trend) {
        bestMatch = trend;
        bestKeywordLen = keyword.length;
      }
    }
  }

  return bestMatch;
}
