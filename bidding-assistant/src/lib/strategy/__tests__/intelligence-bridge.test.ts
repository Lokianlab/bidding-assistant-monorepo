import { describe, it, expect, beforeEach } from "vitest";
import { readCachedIntelligence } from "../intelligence-bridge";
import { cacheSet } from "@/lib/pcc/cache";
import type { SelfAnalysis, MarketTrend } from "@/lib/pcc/types";

// ── Helpers ──────────────────────────────────────────────

function makeSelfAnalysis(overrides: Partial<SelfAnalysis> = {}): SelfAnalysis {
  return {
    totalRecords: 10,
    awardRecords: 5,
    wins: 2,
    losses: 3,
    winRate: 0.4,
    competitors: [],
    agencies: [
      {
        unitId: "U001",
        unitName: "文化部",
        totalCases: 3,
        myWins: 1,
        myLosses: 2,
        avgBidders: 4,
      },
    ],
    yearlyStats: [{ year: 113, total: 5, wins: 2 }],
    ...overrides,
  };
}

function makeMarketTrend(keyword: string): MarketTrend {
  return {
    keyword,
    totalRecords: 20,
    yearRange: [112, 114],
    yearlyData: [
      {
        year: 114,
        totalCases: 10,
        awardCases: 8,
        tenderCases: 2,
        avgBidders: 4.5,
        maxBidders: 8,
        minBidders: 2,
        topAgencies: ["文化部"],
      },
    ],
    topAgencies: [{ name: "文化部", unitId: "U001", count: 5 }],
    competitionLevel: "一般",
    trendDirection: "持平",
  };
}

beforeEach(() => {
  localStorage.clear();
});

// ── Tests ────────────────────────────────────────────────

describe("readCachedIntelligence", () => {
  it("無快取時全部回傳 null", () => {
    const result = readCachedIntelligence("大員洛川", "文化節策展");
    expect(result.selfAnalysis).toBeNull();
    expect(result.marketTrend).toBeNull();
    expect(result.tenderSummary).toBeNull();
  });

  it("有競爭分析快取時讀出 selfAnalysis", () => {
    const analysis = makeSelfAnalysis();
    cacheSet("analysis", "competitor:大員洛川", analysis);

    const result = readCachedIntelligence("大員洛川", "文化節策展");
    expect(result.selfAnalysis).not.toBeNull();
    expect(result.selfAnalysis!.wins).toBe(2);
    expect(result.selfAnalysis!.agencies[0].unitName).toBe("文化部");
  });

  it("公司品牌不匹配時 selfAnalysis 為 null", () => {
    cacheSet("analysis", "competitor:大員洛川", makeSelfAnalysis());

    const result = readCachedIntelligence("其他公司", "文化節策展");
    expect(result.selfAnalysis).toBeNull();
  });

  it("公司品牌為空時 selfAnalysis 為 null", () => {
    cacheSet("analysis", "competitor:大員洛川", makeSelfAnalysis());

    const result = readCachedIntelligence("", "文化節策展");
    expect(result.selfAnalysis).toBeNull();
  });

  it("有市場趨勢快取且關鍵字匹配時讀出 marketTrend", () => {
    cacheSet("analysis", "market:文化節", makeMarketTrend("文化節"));

    const result = readCachedIntelligence("大員洛川", "114年文化節策展計畫");
    expect(result.marketTrend).not.toBeNull();
    expect(result.marketTrend!.keyword).toBe("文化節");
  });

  it("市場趨勢關鍵字不在案件名稱中時回傳 null", () => {
    cacheSet("analysis", "market:導覽服務", makeMarketTrend("導覽服務"));

    const result = readCachedIntelligence("大員洛川", "文化節策展計畫");
    expect(result.marketTrend).toBeNull();
  });

  it("多筆市場趨勢快取時選擇最長匹配關鍵字", () => {
    cacheSet("analysis", "market:文化", makeMarketTrend("文化"));
    cacheSet("analysis", "market:文化節策展", makeMarketTrend("文化節策展"));

    const result = readCachedIntelligence("大員洛川", "114年文化節策展計畫");
    expect(result.marketTrend!.keyword).toBe("文化節策展");
  });

  it("案件名稱為空時 marketTrend 為 null", () => {
    cacheSet("analysis", "market:文化節", makeMarketTrend("文化節"));

    const result = readCachedIntelligence("大員洛川", "");
    expect(result.marketTrend).toBeNull();
  });

  it("同時有競爭分析和市場趨勢快取", () => {
    cacheSet("analysis", "competitor:大員洛川", makeSelfAnalysis());
    cacheSet("analysis", "market:策展", makeMarketTrend("策展"));

    const result = readCachedIntelligence("大員洛川", "文化節策展計畫");
    expect(result.selfAnalysis).not.toBeNull();
    expect(result.marketTrend).not.toBeNull();
    expect(result.tenderSummary).toBeNull();
  });

  it("tenderSummary 永遠為 null（尚未實作）", () => {
    const result = readCachedIntelligence("大員洛川", "文化節策展");
    expect(result.tenderSummary).toBeNull();
  });
});
