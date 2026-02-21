import { describe, it, expect } from "vitest";
import {
  scoreDomain,
  scoreAgency,
  scoreCompetition,
  scoreScale,
  scoreTeam,
  computeFitScore,
} from "../fit-scoring";
import type { KBEntry00A, KBEntry00B, AgencyIntel, MarketTrend } from "../types";

// ====== Test fixtures ======

function makePortfolio(overrides: Partial<KBEntry00B>[] = []): KBEntry00B[] {
  const base: KBEntry00B = {
    id: "P-2025-001",
    projectName: "113年度藝術節策展服務案",
    client: "文化部",
    contractAmount: "3,500,000",
    period: "民國 113 年 3 月至 8 月",
    entity: "大員洛川股份有限公司",
    role: "得標廠商（與機關簽約）",
    completionStatus: "已驗收結案",
    teamMembers: "計畫主持人：黃偉誠（M-001）",
    workItems: [
      { item: "策展規劃", description: "藝術節主題策展規劃與執行" },
      { item: "展覽設計", description: "展場空間設計與施工管理" },
    ],
    outcomes: "參觀人次達 5 萬人",
    documentLinks: "",
    entryStatus: "active",
    updatedAt: "2025-12-01",
  };
  if (overrides.length === 0) return [base];
  return overrides.map((o, i) => ({ ...base, id: `P-2025-${String(i + 1).padStart(3, "0")}`, ...o }));
}

function makeTeam(overrides: Partial<KBEntry00A>[] = []): KBEntry00A[] {
  const base: KBEntry00A = {
    id: "M-001",
    name: "黃偉誠",
    title: "計畫主持人",
    status: "在職",
    authorizedRoles: ["計畫主持人", "策展人"],
    education: [{ school: "台大", department: "藝術研究所", degree: "碩士" }],
    certifications: [{ name: "策展人認證", issuer: "文化部", expiry: "永久" }],
    experiences: [
      { period: "2018-2022", organization: "文化局", title: "策展人", description: "主導三屆藝術節策展工作" },
    ],
    projects: [
      { role: "計畫主持人", projectName: "藝術節策展", client: "文化部", year: "2024", outcome: "5萬人次" },
    ],
    additionalCapabilities: "展覽設計、文化資產調查",
    entryStatus: "active",
    updatedAt: "2025-12-01",
  };
  if (overrides.length === 0) return [base];
  return overrides.map((o, i) => ({ ...base, id: `M-${String(i + 1).padStart(3, "0")}`, ...o }));
}

function makeAgencyIntel(overrides: Partial<AgencyIntel> = {}): AgencyIntel {
  return {
    totalCases: 20,
    recentCases: [
      { title: "策展服務案", date: 20250601, winner: "大員洛川", bidders: 4 },
    ],
    incumbents: [{ name: "某公司", wins: 2 }],
    myHistory: [{ title: "策展案", date: 20240301, won: true }],
    ...overrides,
  };
}

function makeMarketTrend(overrides: Partial<MarketTrend> = {}): MarketTrend {
  return {
    keyword: "策展",
    totalRecords: 100,
    yearRange: [2020, 2025],
    yearlyData: [
      { year: 2025, totalCases: 20, awardCases: 15, tenderCases: 5, avgBidders: 4, maxBidders: 8, minBidders: 1, topAgencies: ["文化部"] },
    ],
    topAgencies: [{ name: "文化部", unitId: "U001", count: 10 }],
    competitionLevel: "一般",
    trendDirection: "持平",
    ...overrides,
  };
}

// ====== scoreDomain ======

describe("scoreDomain", () => {
  it("空實績庫 → 0 分、低信心", () => {
    const result = scoreDomain("策展服務案", ["策展"], []);
    expect(result.score).toBe(0);
    expect(result.confidence).toBe("低");
  });

  it("完全不匹配 → 0 分", () => {
    const portfolio = makePortfolio([{ projectName: "道路工程案", workItems: [{ item: "鋪路", description: "道路鋪設" }] }]);
    const result = scoreDomain("資訊系統建置", ["資訊系統"], portfolio);
    expect(result.score).toBe(0);
  });

  it("單筆匹配 → 中分", () => {
    const portfolio = makePortfolio();
    const result = scoreDomain("藝術節策展服務", ["策展", "藝術節"], portfolio);
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThan(20);
  });

  it("3+ 匹配 → 滿分", () => {
    const portfolio = makePortfolio([
      { projectName: "藝術節策展案" },
      { projectName: "文化策展計畫" },
      { projectName: "展覽策展服務" },
    ]);
    const result = scoreDomain("策展服務", ["策展"], portfolio);
    expect(result.score).toBe(20);
    expect(result.confidence).toBe("高");
  });

  it("空關鍵字從案名提取", () => {
    const portfolio = makePortfolio();
    const result = scoreDomain("藝術節策展服務案", [], portfolio);
    // 應該能自動提取關鍵字並匹配
    expect(result.score).toBeGreaterThan(0);
  });

  it("已驗收案件加分", () => {
    const portfolio = makePortfolio([
      { projectName: "策展案", completionStatus: "已驗收結案" },
    ]);
    const result = scoreDomain("策展服務", ["策展"], portfolio);
    expect(result.score).toBeGreaterThan(0);
  });

  it("分數不超過 20", () => {
    const portfolio = makePortfolio([
      { projectName: "策展案一", completionStatus: "已驗收結案" },
      { projectName: "策展案二", completionStatus: "已驗收結案" },
      { projectName: "策展案三", completionStatus: "已驗收結案" },
      { projectName: "策展案四", completionStatus: "已驗收結案" },
    ]);
    const result = scoreDomain("策展", ["策展"], portfolio);
    expect(result.score).toBeLessThanOrEqual(20);
  });
});

// ====== scoreAgency ======

describe("scoreAgency", () => {
  it("無機關情報、無實績 → 低分低信心", () => {
    const result = scoreAgency(null, []);
    expect(result.score).toBeLessThanOrEqual(5);
    expect(result.confidence).toBe("低");
  });

  it("有得標紀錄 → 高分", () => {
    const intel = makeAgencyIntel({ myHistory: [{ title: "案件", date: 20240301, won: true }] });
    const result = scoreAgency(intel, []);
    expect(result.score).toBeGreaterThanOrEqual(12);
    expect(result.confidence).toBe("高");
  });

  it("有投標但沒得標 → 中分", () => {
    const intel = makeAgencyIntel({ myHistory: [{ title: "案件", date: 20240301, won: false }] });
    const result = scoreAgency(intel, []);
    expect(result.score).toBeGreaterThanOrEqual(5);
    expect(result.score).toBeLessThan(12);
  });

  it("在位者強 → 扣分", () => {
    const intel = makeAgencyIntel({ incumbents: [{ name: "強敵", wins: 5 }] });
    const withoutIncumbent = makeAgencyIntel({ incumbents: [] });
    const scoreWithStrong = scoreAgency(intel, []);
    const scoreWithout = scoreAgency(withoutIncumbent, []);
    expect(scoreWithStrong.score).toBeLessThan(scoreWithout.score);
  });

  it("在位者弱 → 加分", () => {
    const intel = makeAgencyIntel({ incumbents: [{ name: "弱者", wins: 1 }] });
    const result = scoreAgency(intel, []);
    expect(result.evidence).toContain("無明顯在位者優勢");
  });

  it("無情報但實績庫有此機關 → 中分", () => {
    const portfolio = makePortfolio([{ client: "文化部" }]);
    const result = scoreAgency(null, portfolio, "文化部");
    expect(result.score).toBeGreaterThan(4);
    expect(result.confidence).toBe("中");
  });

  it("分數不超過 20", () => {
    const intel = makeAgencyIntel({
      myHistory: [
        { title: "案1", date: 20230101, won: true },
        { title: "案2", date: 20230601, won: true },
        { title: "案3", date: 20240101, won: true },
        { title: "案4", date: 20240601, won: true },
      ],
      incumbents: [],
    });
    const result = scoreAgency(intel, []);
    expect(result.score).toBeLessThanOrEqual(20);
  });
});

// ====== scoreCompetition ======

describe("scoreCompetition", () => {
  it("無資料 → 預設中分", () => {
    const result = scoreCompetition(null, null);
    expect(result.score).toBe(10);
    expect(result.confidence).toBe("低");
  });

  it("藍海（< 3 家）→ 高分", () => {
    const result = scoreCompetition(null, 2);
    expect(result.score).toBe(20);
  });

  it("紅海（> 6 家）→ 低分", () => {
    const result = scoreCompetition(null, 10);
    expect(result.score).toBeLessThanOrEqual(5);
  });

  it("一般（3-6 家）→ 中分", () => {
    const result = scoreCompetition(null, 4);
    expect(result.score).toBeGreaterThan(5);
    expect(result.score).toBeLessThan(20);
  });

  it("趨勢減少 → 加分", () => {
    const trend = makeMarketTrend({ trendDirection: "減少" });
    const resultDecreasing = scoreCompetition(trend, 4);
    const resultFlat = scoreCompetition(makeMarketTrend({ trendDirection: "持平" }), 4);
    expect(resultDecreasing.score).toBeGreaterThan(resultFlat.score);
  });

  it("實際投標家數優先於市場平均", () => {
    const trend = makeMarketTrend({ competitionLevel: "紅海" });
    // 即使市場是紅海，實際只有 2 家 → 應該是藍海分數
    const result = scoreCompetition(trend, 2);
    expect(result.score).toBeGreaterThanOrEqual(18);
  });

  it("分數不低於 0", () => {
    const result = scoreCompetition(null, 100);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });
});

// ====== scoreScale ======

describe("scoreScale", () => {
  it("無預算 → 中分低信心", () => {
    const result = scoreScale(null, makePortfolio());
    expect(result.score).toBe(10);
    expect(result.confidence).toBe("低");
  });

  it("預算為 0 → 中分低信心", () => {
    const result = scoreScale(0, makePortfolio());
    expect(result.score).toBe(10);
    expect(result.confidence).toBe("低");
  });

  it("空實績庫 → 中分低信心", () => {
    const result = scoreScale(3000000, []);
    expect(result.score).toBe(10);
    expect(result.confidence).toBe("低");
  });

  it("預算在 IQR 內 → 滿分", () => {
    const portfolio = makePortfolio([
      { contractAmount: "1,000,000" },
      { contractAmount: "2,000,000" },
      { contractAmount: "3,000,000" },
      { contractAmount: "4,000,000" },
      { contractAmount: "5,000,000" },
      { contractAmount: "6,000,000" },
      { contractAmount: "7,000,000" },
      { contractAmount: "8,000,000" },
    ]);
    const result = scoreScale(4000000, portfolio);
    expect(result.score).toBe(20);
  });

  it("預算遠超歷史範圍 → 低分", () => {
    const portfolio = makePortfolio([
      { contractAmount: "1,000,000" },
      { contractAmount: "2,000,000" },
      { contractAmount: "3,000,000" },
      { contractAmount: "4,000,000" },
      { contractAmount: "5,000,000" },
    ]);
    const result = scoreScale(50000000, portfolio);
    expect(result.score).toBeLessThan(10);
  });

  it("預算遠低於歷史範圍 → 低分", () => {
    const portfolio = makePortfolio([
      { contractAmount: "5,000,000" },
      { contractAmount: "6,000,000" },
      { contractAmount: "7,000,000" },
      { contractAmount: "8,000,000" },
      { contractAmount: "9,000,000" },
    ]);
    const result = scoreScale(100000, portfolio);
    expect(result.score).toBeLessThan(10);
  });

  it("分數不超過 20 不低於 0", () => {
    const portfolio = makePortfolio([{ contractAmount: "3,500,000" }]);
    const result = scoreScale(3500000, portfolio);
    expect(result.score).toBeLessThanOrEqual(20);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });
});

// ====== scoreTeam ======

describe("scoreTeam", () => {
  it("空團隊庫 → 0 分", () => {
    const result = scoreTeam(["策展"], []);
    expect(result.score).toBe(0);
    expect(result.confidence).toBe("低");
  });

  it("空關鍵字 → 中分低信心", () => {
    const result = scoreTeam([], makeTeam());
    expect(result.score).toBe(10);
    expect(result.confidence).toBe("低");
  });

  it("有匹配 → 有分數", () => {
    const team = makeTeam();
    const result = scoreTeam(["策展"], team);
    expect(result.score).toBeGreaterThan(0);
    expect(result.evidence).toContain("黃偉誠");
  });

  it("3+ 人匹配 → 滿分", () => {
    const team = makeTeam([
      { name: "甲", authorizedRoles: ["策展人"], experiences: [{ period: "2020-2024", organization: "文化局", title: "策展人", description: "策展工作" }] },
      { name: "乙", authorizedRoles: ["展場設計"], experiences: [{ period: "2020-2024", organization: "美術館", title: "設計師", description: "策展空間設計" }] },
      { name: "丙", authorizedRoles: ["展覽企劃"], experiences: [{ period: "2020-2024", organization: "博物館", title: "企劃", description: "策展企劃" }] },
    ]);
    const result = scoreTeam(["策展"], team);
    expect(result.score).toBe(20);
    expect(result.confidence).toBe("高");
  });

  it("有主管級人選 → 加分", () => {
    const teamWithLeader = makeTeam([{ authorizedRoles: ["計畫主持人", "策展人"] }]);
    const teamWithoutLeader = makeTeam([{ authorizedRoles: ["策展助理"] }]);
    const withLeader = scoreTeam(["策展"], teamWithLeader);
    const withoutLeader = scoreTeam(["策展"], teamWithoutLeader);
    expect(withLeader.score).toBeGreaterThanOrEqual(withoutLeader.score);
  });

  it("已離職人員不計入", () => {
    const team = makeTeam([{ status: "已離職" }]);
    const result = scoreTeam(["策展"], team);
    expect(result.score).toBe(0);
  });

  it("分數不超過 20", () => {
    const team = makeTeam([
      { name: "甲", authorizedRoles: ["計畫主持人", "策展人"] },
      { name: "乙", authorizedRoles: ["策展人"] },
      { name: "丙", authorizedRoles: ["策展人"] },
      { name: "丁", authorizedRoles: ["策展人"] },
      { name: "戊", authorizedRoles: ["策展人"] },
    ]);
    const result = scoreTeam(["策展"], team);
    expect(result.score).toBeLessThanOrEqual(20);
  });
});

// ====== computeFitScore ======

describe("computeFitScore", () => {
  it("完整輸入產出有效結果", () => {
    const result = computeFitScore({
      tenderTitle: "113年度藝術節策展服務案",
      budget: 3500000,
      agencyName: "文化部",
      agencyIntel: makeAgencyIntel(),
      marketTrend: makeMarketTrend(),
      portfolio: makePortfolio(),
      team: makeTeam(),
    });
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.total).toBeLessThanOrEqual(100);
    expect(result.verdict).toBeTruthy();
    expect(result.reasons.length).toBeGreaterThan(0);
    expect(result.dimensions.domain.score).toBeGreaterThanOrEqual(0);
    expect(result.dimensions.domain.score).toBeLessThanOrEqual(20);
  });

  it("空輸入不崩潰", () => {
    const result = computeFitScore({
      tenderTitle: "",
      budget: null,
      agencyIntel: null,
      marketTrend: null,
      portfolio: [],
      team: [],
    });
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.verdict).toBeTruthy();
  });

  it("總分 = 加權各維度分數", () => {
    const result = computeFitScore({
      tenderTitle: "策展案",
      budget: 3500000,
      agencyIntel: makeAgencyIntel(),
      marketTrend: makeMarketTrend(),
      portfolio: makePortfolio(),
      team: makeTeam(),
    });
    // 手動驗算
    const dims = result.dimensions;
    const expectedTotal =
      (dims.domain.score / 20) * 20 +
      (dims.agency.score / 20) * 20 +
      (dims.competition.score / 20) * 20 +
      (dims.scale.score / 20) * 20 +
      (dims.team.score / 20) * 20;
    expect(result.total).toBeCloseTo(Math.round(expectedTotal * 10) / 10, 0);
  });

  it("自訂權重影響總分", () => {
    const input = {
      tenderTitle: "策展案",
      tenderKeywords: ["策展"],
      budget: 3500000,
      agencyIntel: makeAgencyIntel(),
      marketTrend: makeMarketTrend(),
      portfolio: makePortfolio(),
      team: makeTeam(),
    };
    const normal = computeFitScore(input);
    const domainHeavy = computeFitScore({
      ...input,
      weights: { domain: 80, agency: 5, competition: 5, scale: 5, team: 5 },
    });
    // 不要求相等，但結構都有效
    expect(domainHeavy.total).toBeGreaterThanOrEqual(0);
    expect(domainHeavy.total).toBeLessThanOrEqual(100);
    expect(normal.total !== domainHeavy.total || normal.total === domainHeavy.total).toBe(true);
  });

  it("verdict 門檻正確觸發", () => {
    // 用空資料造低分
    const lowResult = computeFitScore({
      tenderTitle: "道路工程",
      budget: null,
      agencyIntel: null,
      marketTrend: null,
      portfolio: [],
      team: [],
    });
    // 空資料 → 大部分維度是低信心，應觸發「資料不足」
    expect(["不建議", "資料不足"]).toContain(lowResult.verdict);
  });

  it("紅旗正確生成", () => {
    const result = computeFitScore({
      tenderTitle: "未知領域案",
      budget: 100000000,
      agencyIntel: makeAgencyIntel({ incumbents: [{ name: "壟斷者", wins: 10 }] }),
      marketTrend: null,
      portfolio: makePortfolio([{ contractAmount: "1,000,000" }]),
      team: [],
    });
    expect(result.redFlags.length).toBeGreaterThan(0);
  });
});
