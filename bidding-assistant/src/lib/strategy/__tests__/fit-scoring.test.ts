import { describe, it, expect } from "vitest";
import {
  scoreDomain,
  scoreAgency,
  scoreCompetition,
  scoreScale,
  scoreTeam,
  detectRedFlags,
  determineVerdict,
  generateReasons,
  calculateFitScore,
} from "../fit-scoring";
import type { KBEntry00A, KBEntry00B } from "@/lib/knowledge-base/types";
import type { SelfAnalysis, MarketTrend } from "@/lib/pcc/types";
import type { FitScore, FitScoreInput } from "../types";
import type { Partner } from "@/lib/partners/types";

// ====== Mock 資料 ======

function makePortfolio(
  overrides: Partial<KBEntry00B> & { projectName: string },
): KBEntry00B {
  return {
    id: "P-2025-001",
    client: "臺北市政府文化局",
    contractAmount: "3,000,000",
    period: "民國 114 年 3 月至 8 月",
    entity: "大員洛川股份有限公司",
    role: "得標廠商（與機關簽約）",
    completionStatus: "已驗收結案",
    teamMembers: "計畫主持人：黃偉誠（M-001）",
    workItems: [],
    outcomes: "",
    documentLinks: "",
    entryStatus: "active",
    updatedAt: "2025-01-01",
    ...overrides,
  };
}

function makeTeamMember(
  overrides: Partial<KBEntry00A> & { name: string },
): KBEntry00A {
  return {
    id: "M-001",
    title: "總監",
    status: "在職",
    authorizedRoles: [],
    education: [],
    certifications: [],
    experiences: [],
    projects: [],
    additionalCapabilities: "",
    entryStatus: "active",
    updatedAt: "2025-01-01",
    ...overrides,
  };
}

const mockPortfolio: KBEntry00B[] = [
  makePortfolio({
    id: "P-001",
    projectName: "113 年臺灣文化節活動策展計畫",
    client: "文化部",
    contractAmount: "5,000,000",
  }),
  makePortfolio({
    id: "P-002",
    projectName: "臺北市博物館常設展策展及展場設計",
    client: "臺北市政府文化局",
    contractAmount: "8,000,000",
  }),
  makePortfolio({
    id: "P-003",
    projectName: "112 年國慶典禮活動規劃執行",
    client: "國防部",
    contractAmount: "12,000,000",
  }),
  makePortfolio({
    id: "P-004",
    projectName: "客家文化園區導覽解說服務計畫",
    client: "客家委員會",
    contractAmount: "2,000,000",
  }),
  makePortfolio({
    id: "P-005",
    projectName: "城市行銷推廣影片製作",
    client: "臺中市政府觀光旅遊局",
    contractAmount: "1,500,000",
  }),
  makePortfolio({
    id: "P-006",
    projectName: "社區營造工作坊培訓計畫",
    client: "文化部",
    contractAmount: "800,000",
  }),
];

function makePartner(
  overrides: Partial<Partner> & { name: string },
): Partner {
  return {
    id: "P-EXT-001",
    tenant_id: "tenant-001",
    category: [],
    contact_name: "聯絡人",
    phone: "02-1234-5678",
    email: "contact@partner.com",
    url: "",
    rating: 4,
    notes: "",
    cooperation_count: 1,
    last_used: new Date().toISOString(),
    tags: [],
    status: "active",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

const mockTeam: KBEntry00A[] = [
  makeTeamMember({
    id: "M-001",
    name: "黃偉誠",
    title: "總監",
    authorizedRoles: ["計畫主持人"],
    experiences: [
      {
        period: "2018-2024",
        organization: "大員洛川",
        title: "活動總監",
        description: "主持多項文化活動與展覽策展計畫",
      },
    ],
    certifications: [
      { name: "專案管理師 PMP", issuer: "PMI", expiry: "永久" },
    ],
    projects: [
      {
        role: "計畫主持人",
        projectName: "臺灣文化節",
        client: "文化部",
        year: "2024",
        outcome: "圓滿完成",
      },
    ],
    additionalCapabilities: "活動策劃、展覽策展、文化推廣",
  }),
  makeTeamMember({
    id: "M-002",
    name: "林小芳",
    title: "設計師",
    experiences: [
      {
        period: "2020-2024",
        organization: "大員洛川",
        title: "視覺設計師",
        description: "負責展覽視覺設計與多媒體製作",
      },
    ],
    additionalCapabilities: "平面設計、展場設計、視覺",
  }),
  makeTeamMember({
    id: "M-003",
    name: "陳大明",
    title: "企劃",
    experiences: [
      {
        period: "2019-2024",
        organization: "大員洛川",
        title: "專案企劃",
        description: "文化活動企劃與行銷推廣",
      },
    ],
    additionalCapabilities: "活動企劃、行銷、社群媒體",
  }),
  makeTeamMember({
    id: "M-004",
    name: "王小華",
    title: "行政專員",
    status: "已離職",
    additionalCapabilities: "行政庶務",
  }),
];

const mockPartners: Partner[] = [
  makePartner({
    id: "P-EXT-001",
    name: "文化策展顧問有限公司",
    category: ["文化顧問", "展覽策劃"],
    rating: 5,
    cooperation_count: 8,
    tags: ["推薦", "定期合作"],
  }),
  makePartner({
    id: "P-EXT-002",
    name: "視覺設計工作室",
    category: ["視覺設計", "展場設計"],
    rating: 4,
    cooperation_count: 5,
    tags: ["推薦"],
  }),
  makePartner({
    id: "P-EXT-003",
    name: "道路施工承包商",
    category: ["工程施工", "工地主任"],
    rating: 3,
    cooperation_count: 2,
    tags: ["待評估"],
    status: "archived",
  }),
];

const mockSelfAnalysis: SelfAnalysis = {
  totalRecords: 50,
  awardRecords: 30,
  wins: 18,
  losses: 12,
  winRate: 0.6,
  competitors: [],
  agencies: [
    {
      unitId: "A01",
      unitName: "文化部",
      totalCases: 10,
      myWins: 5,
      myLosses: 5,
      avgBidders: 4,
    },
    {
      unitId: "A02",
      unitName: "臺北市政府文化局",
      totalCases: 8,
      myWins: 2,
      myLosses: 6,
      avgBidders: 5,
    },
    {
      unitId: "A03",
      unitName: "新北市政府文化局",
      totalCases: 3,
      myWins: 0,
      myLosses: 3,
      avgBidders: 7,
    },
  ],
  yearlyStats: [],
};

const mockMarketTrend: MarketTrend = {
  keyword: "文化活動",
  totalRecords: 200,
  yearRange: [2022, 2025],
  yearlyData: [
    {
      year: 2025,
      totalCases: 60,
      awardCases: 40,
      tenderCases: 20,
      avgBidders: 4.5,
      maxBidders: 12,
      minBidders: 1,
      topAgencies: ["文化部", "臺北市政府"],
    },
  ],
  topAgencies: [{ name: "文化部", unitId: "A01", count: 25 }],
  competitionLevel: "一般",
  trendDirection: "持平",
};

// ====== scoreDomain 測試 ======

describe("scoreDomain", () => {
  it("空實績 → 0 分低信心", () => {
    const result = scoreDomain("文化活動策展", []);
    expect(result.score).toBe(0);
    expect(result.confidence).toBe("低");
  });

  it("完全無關的案名 → 低分", () => {
    const result = scoreDomain("道路鋪設工程", mockPortfolio);
    expect(result.score).toBeLessThanOrEqual(5);
    expect(result.confidence).toBe("低");
  });

  it("1-2 筆匹配 → 中等分數", () => {
    // "影像攝影" 只匹配 P-005（影片）
    const result = scoreDomain("觀光旅遊遊程規劃", mockPortfolio);
    expect(result.score).toBeGreaterThanOrEqual(10);
    expect(result.score).toBeLessThanOrEqual(16);
    expect(result.confidence).toBe("中");
  });

  it("多筆匹配（活動+文化+策展）→ 滿分", () => {
    const result = scoreDomain("臺灣文化節活動策展", mockPortfolio);
    expect(result.score).toBe(20);
    expect(result.confidence).toBe("高");
  });

  it("忽略 archived 實績", () => {
    const archived = [
      makePortfolio({
        projectName: "活動策展",
        entryStatus: "archived",
      }),
    ];
    const result = scoreDomain("活動策展", archived);
    expect(result.score).toBe(0);
    expect(result.confidence).toBe("低");
  });

  it("無法辨識的案名 → 5 分低信心", () => {
    const result = scoreDomain("XYZ-123 案", mockPortfolio);
    expect(result.score).toBe(5);
    expect(result.confidence).toBe("低");
  });
});

// ====== scoreAgency 測試 ======

describe("scoreAgency", () => {
  it("無歷史資料 → 5 分低信心", () => {
    const result = scoreAgency("文化部", null);
    expect(result.score).toBe(5);
    expect(result.confidence).toBe("低");
  });

  it("多次得標（≥3）→ 滿分", () => {
    const result = scoreAgency("文化部", mockSelfAnalysis);
    expect(result.score).toBe(20);
    expect(result.confidence).toBe("高");
    expect(result.evidence).toContain("得標 5 次");
  });

  it("少量得標（1-2）→ 高分", () => {
    const result = scoreAgency("臺北市政府文化局", mockSelfAnalysis);
    expect(result.score).toBeGreaterThanOrEqual(14);
    expect(result.confidence).toBe("高");
  });

  it("投標但未得標 → 中等", () => {
    const result = scoreAgency("新北市政府文化局", mockSelfAnalysis);
    expect(result.score).toBe(8);
    expect(result.confidence).toBe("中");
  });

  it("從未接觸的機關 → 5 分中信心", () => {
    const result = scoreAgency("高雄市政府", mockSelfAnalysis);
    expect(result.score).toBe(5);
    expect(result.confidence).toBe("中");
    expect(result.evidence).toContain("新開發機關");
  });

  it("空 agencies 列表 → 5 分低信心", () => {
    const empty: SelfAnalysis = {
      ...mockSelfAnalysis,
      agencies: [],
    };
    const result = scoreAgency("文化部", empty);
    expect(result.score).toBe(5);
    expect(result.confidence).toBe("低");
  });

  it("有機關紀錄但 totalCases = 0 → 5 分低信心", () => {
    const touched: SelfAnalysis = {
      ...mockSelfAnalysis,
      agencies: [
        { unitId: "A99", unitName: "國科會", totalCases: 0, myWins: 0, myLosses: 0, avgBidders: 0 },
      ],
    };
    const result = scoreAgency("國科會", touched);
    expect(result.score).toBe(5);
    expect(result.confidence).toBe("低");
    expect(result.evidence).toContain("有接觸");
  });
});

// ====== scoreCompetition 測試 ======

describe("scoreCompetition", () => {
  it("藍海（≤3 家）→ 滿分", () => {
    const result = scoreCompetition(null, 2);
    expect(result.score).toBe(20);
    expect(result.confidence).toBe("高");
  });

  it("紅海（>6 家）→ 低分", () => {
    const result = scoreCompetition(null, 10);
    expect(result.score).toBeLessThanOrEqual(5);
    expect(result.evidence).toContain("紅海");
  });

  it("中等競爭（4 家）→ 中間分數", () => {
    const result = scoreCompetition(null, 4);
    expect(result.score).toBeGreaterThan(8);
    expect(result.score).toBeLessThan(20);
  });

  it("無實際家數、有市場趨勢 → 用趨勢", () => {
    const result = scoreCompetition(mockMarketTrend, null);
    expect(result.score).toBe(12); // 一般 = 12
    expect(result.confidence).toBe("中");
  });

  it("趨勢減少 → 加分", () => {
    const cooling: MarketTrend = {
      ...mockMarketTrend,
      competitionLevel: "一般",
      trendDirection: "減少",
    };
    const result = scoreCompetition(cooling, null);
    expect(result.score).toBe(14); // 12 + 2
  });

  it("趨勢增加 → 扣分", () => {
    const heating: MarketTrend = {
      ...mockMarketTrend,
      competitionLevel: "一般",
      trendDirection: "增加",
    };
    const result = scoreCompetition(heating, null);
    expect(result.score).toBe(10); // 12 - 2
  });

  it("完全無資料 → 10 分低信心", () => {
    const result = scoreCompetition(null, null);
    expect(result.score).toBe(10);
    expect(result.confidence).toBe("低");
  });

  it("實際家數優先於市場趨勢", () => {
    const result = scoreCompetition(mockMarketTrend, 2);
    expect(result.score).toBe(20); // 用實際的 2 家，不用趨勢
    expect(result.confidence).toBe("高");
  });

  it("市場趨勢為藍海 → 18 分", () => {
    const blueOcean: MarketTrend = { ...mockMarketTrend, competitionLevel: "藍海", trendDirection: "持平" };
    const result = scoreCompetition(blueOcean, null);
    expect(result.score).toBe(18);
    expect(result.confidence).toBe("中");
  });

  it("市場趨勢為紅海 → 5 分", () => {
    const redSea: MarketTrend = { ...mockMarketTrend, competitionLevel: "紅海", trendDirection: "持平" };
    const result = scoreCompetition(redSea, null);
    expect(result.score).toBe(5);
    expect(result.confidence).toBe("中");
  });
});

// ====== scoreScale 測試 ======

describe("scoreScale", () => {
  it("無預算 → 10 分低信心", () => {
    const result = scoreScale(null, mockPortfolio);
    expect(result.score).toBe(10);
    expect(result.confidence).toBe("低");
  });

  it("預算在 IQR 內 → 滿分", () => {
    // 實績金額：800K, 1.5M, 2M, 3M, 5M, 8M, 12M
    // Q1 ≈ 1.5M, Q3 ≈ 8M
    const result = scoreScale(3_000_000, mockPortfolio);
    expect(result.score).toBe(20);
    expect(result.confidence).toBe("高");
  });

  it("預算略超出範圍 → 中等", () => {
    const result = scoreScale(10_000_000, mockPortfolio);
    expect(result.score).toBeGreaterThanOrEqual(8);
    expect(result.score).toBeLessThanOrEqual(14);
  });

  it("預算遠超範圍 → 低分", () => {
    const result = scoreScale(100_000_000, mockPortfolio);
    expect(result.score).toBeLessThanOrEqual(8);
  });

  it("預算遠低於範圍 → 低分", () => {
    const result = scoreScale(10_000, mockPortfolio);
    // 10K vs portfolio 800K-12M → 應明確偏低
    expect(result.score).toBeLessThanOrEqual(8);
  });

  it("實績不足 4 筆 → 10 分低信心", () => {
    const few = mockPortfolio.slice(0, 2);
    const result = scoreScale(3_000_000, few);
    expect(result.score).toBe(10);
    expect(result.confidence).toBe("低");
  });

  it("預算大幅超出但未到極端 → 8 分中信心", () => {
    // Q1=1.5M, Q3=8M, IQR=6.5M
    // q3+iqr*0.5=11.25M, q3+iqr*1.5=17.75M
    // 15M 落在 (11.25M, 17.75M] → score=8
    const result = scoreScale(15_000_000, mockPortfolio);
    expect(result.score).toBe(8);
    expect(result.confidence).toBe("中");
  });
});

// ====== scoreTeam 測試 ======

describe("scoreTeam", () => {
  it("空團隊 → 0 分", () => {
    const result = scoreTeam("文化活動", []);
    expect(result.score).toBe(0);
    expect(result.confidence).toBe("低");
  });

  it("多名成員匹配 + 有主持人 → 滿分", () => {
    const result = scoreTeam("文化活動策展計畫", mockTeam);
    expect(result.score).toBe(20);
    expect(result.confidence).toBe("高");
    expect(result.evidence).toContain("計畫主持人");
  });

  it("1-2 名匹配 → 中等分數", () => {
    const result = scoreTeam("行銷推廣", mockTeam);
    expect(result.score).toBeGreaterThanOrEqual(10);
    expect(result.score).toBeLessThanOrEqual(16);
  });

  it("無匹配但有人 → 低分", () => {
    const result = scoreTeam("道路工程施工", mockTeam);
    expect(result.score).toBeLessThanOrEqual(5);
    expect(result.confidence).toBe("低");
  });

  it("忽略已離職成員", () => {
    // M-004 王小華已離職，不應計入
    const allInactive = mockTeam.map((m) => ({
      ...m,
      status: "已離職" as const,
    }));
    const result = scoreTeam("文化活動", allInactive);
    expect(result.score).toBe(0);
  });

  it("案件要求主持人但團隊沒有 → 扣分", () => {
    const noPI = mockTeam.map((m) => ({
      ...m,
      authorizedRoles: [],
      projects: m.projects.map((p) => ({ ...p, role: "專案成員" })),
    }));
    const result = scoreTeam("計畫主持人帶領之文化活動", noPI);
    // Should lose 5 points for missing PI
    expect(result.evidence).toContain("計畫主持人");
  });

  it("只有 1 名在職成員且無匹配 → 2 分", () => {
    // 黃偉誠無道路工程相關經驗，1 人 < 3 → score=2
    const singleMember = mockTeam.filter((m) => m.name === "黃偉誠");
    const result = scoreTeam("道路工程施工", singleMember);
    expect(result.score).toBe(2);
    expect(result.confidence).toBe("低");
  });

  it("M03-M07 整合：內部團隊 + 外部夥伴 → 混合評分", () => {
    // 案件需要展覽策劃：內部有 1-2 人匹配 + 外部夥伴專精此領域 → 應該提高分數
    // M07 Partner 提供額外資源（文化策展顧問 rating:5, 視覺設計工作室 rating:4）
    const result = scoreTeam("文化展覽策展計畫", mockTeam, mockPartners.filter(p => p.status === "active"));

    // 期望分數 > 單純內部團隊（~13 分）
    expect(result.score).toBeGreaterThan(13);
    expect(result.confidence).toBe("高");
    expect(result.evidence).toContain("文化策展");
  });

  it("M03-M07 整合：無符合夥伴 → 保持原分", () => {
    // 案件是道路工程：外部夥伴全是文化相關，不匹配 → 分數不變
    const result = scoreTeam("道路工程施工", mockTeam.slice(0, 1), mockPartners.filter(p => p.status === "active"));
    expect(result.score).toBe(2); // 單個成員無匹配 → 2 分
  });

  it("M03-M07 整合：高評分夥伴提升信心度", () => {
    // 案件需要特定技能，雖然內部團隊少，但有高評分夥伴補充 → 信心度提升
    const limitedTeam = mockTeam.slice(0, 1); // 只有主持人
    const result = scoreTeam("文化活動策展", limitedTeam, mockPartners.filter(p => p.status === "active"));

    expect(result.confidence).toBe("高"); // 由於夥伴品質高，信心度提升
    expect(result.evidence).toContain("文化");
  });
});

// ====== detectRedFlags 測試 ======

describe("detectRedFlags", () => {
  it("正常案名 → 無紅旗", () => {
    expect(detectRedFlags("文化活動策展計畫")).toHaveLength(0);
  });

  it("限制性招標 → 偵測", () => {
    const flags = detectRedFlags("限制性招標：文化展覽");
    expect(flags).toHaveLength(1);
    expect(flags[0]).toContain("限制性招標");
  });

  it("最有利標 → 偵測", () => {
    const flags = detectRedFlags("最有利標文化活動");
    expect(flags).toHaveLength(1);
    expect(flags[0]).toContain("最有利標");
  });

  it("多重紅旗", () => {
    const flags = detectRedFlags("限制性招標統包文化中心");
    expect(flags).toHaveLength(2);
  });
});

// ====== determineVerdict 測試 ======

describe("determineVerdict", () => {
  const makeDimensions = (
    scores: number[],
    confidences: ("高" | "中" | "低")[] = ["高", "高", "高", "高", "高"],
  ): FitScore["dimensions"] => ({
    domain: { score: scores[0], confidence: confidences[0], evidence: "" },
    agency: { score: scores[1], confidence: confidences[1], evidence: "" },
    competition: {
      score: scores[2],
      confidence: confidences[2],
      evidence: "",
    },
    scale: { score: scores[3], confidence: confidences[3], evidence: "" },
    team: { score: scores[4], confidence: confidences[4], evidence: "" },
  });

  it("高分 → 建議投標", () => {
    expect(determineVerdict(80, makeDimensions([16, 16, 16, 16, 16]))).toBe(
      "建議投標",
    );
  });

  it("中分 → 值得評估", () => {
    expect(determineVerdict(60, makeDimensions([12, 12, 12, 12, 12]))).toBe(
      "值得評估",
    );
  });

  it("低分 → 不建議", () => {
    expect(determineVerdict(30, makeDimensions([6, 6, 6, 6, 6]))).toBe(
      "不建議",
    );
  });

  it("≥3 維低信心 → 資料不足", () => {
    expect(
      determineVerdict(
        80,
        makeDimensions(
          [16, 16, 16, 16, 16],
          ["低", "低", "低", "高", "高"],
        ),
      ),
    ).toBe("資料不足");
  });

  it("邊界值：剛好 70 → 建議投標", () => {
    expect(determineVerdict(70, makeDimensions([14, 14, 14, 14, 14]))).toBe(
      "建議投標",
    );
  });

  it("邊界值：剛好 50 → 值得評估", () => {
    expect(determineVerdict(50, makeDimensions([10, 10, 10, 10, 10]))).toBe(
      "值得評估",
    );
  });
});

// ====== generateReasons 測試 ======

describe("generateReasons", () => {
  it("有明確強弱項時生成多條理由", () => {
    const dims: FitScore["dimensions"] = {
      domain: { score: 20, confidence: "高", evidence: "多筆匹配" },
      agency: { score: 15, confidence: "高", evidence: "得標 3 次" },
      competition: { score: 12, confidence: "中", evidence: "一般競爭" },
      scale: { score: 5, confidence: "中", evidence: "偏大" },
      team: { score: 18, confidence: "高", evidence: "3 人匹配" },
    };
    const reasons = generateReasons(dims);
    expect(reasons.length).toBeGreaterThanOrEqual(2);
    expect(reasons.some((r) => r.includes("優勢"))).toBe(true);
    expect(reasons.some((r) => r.includes("風險"))).toBe(true);
  });

  it("中等分數（50-69）生成「條件中等」總評", () => {
    // total = 10+12+12+10+10 = 54，無項目 ≥15 也無項目 ≤8
    const dims: FitScore["dimensions"] = {
      domain: { score: 10, confidence: "中", evidence: "" },
      agency: { score: 12, confidence: "中", evidence: "" },
      competition: { score: 12, confidence: "中", evidence: "" },
      scale: { score: 10, confidence: "中", evidence: "" },
      team: { score: 10, confidence: "中", evidence: "" },
    };
    const reasons = generateReasons(dims);
    expect(reasons.some((r) => r.includes("中等"))).toBe(true);
  });

  it("低分（<50）生成「整體條件不利」總評", () => {
    // total = 3+5+3+5+2 = 18
    const dims: FitScore["dimensions"] = {
      domain: { score: 3, confidence: "低", evidence: "" },
      agency: { score: 5, confidence: "中", evidence: "" },
      competition: { score: 3, confidence: "中", evidence: "" },
      scale: { score: 5, confidence: "中", evidence: "" },
      team: { score: 2, confidence: "低", evidence: "" },
    };
    const reasons = generateReasons(dims);
    expect(reasons.some((r) => r.includes("不利"))).toBe(true);
  });
});

// ====== calculateFitScore 整合測試 ======

describe("calculateFitScore", () => {
  const emptyKB = {
    "00A": [] as KBEntry00A[],
    "00B": [] as KBEntry00B[],
    "00C": [],
    "00D": [],
    "00E": [],
    lastUpdated: "",
    version: 1,
  };

  it("完全無資料 → 資料不足", () => {
    const input: FitScoreInput = {
      caseName: "文化活動",
      agency: "文化部",
      budget: null,
      intelligence: {
        selfAnalysis: null,
        marketTrend: null,
        tenderSummary: null,
      },
      kb: emptyKB,
    };
    const result = calculateFitScore(input);
    expect(result.verdict).toBe("資料不足");
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.total).toBeLessThanOrEqual(100);
  });

  it("高匹配案件 → 建議投標", () => {
    const input: FitScoreInput = {
      caseName: "114 年臺灣文化節活動策展計畫",
      agency: "文化部",
      budget: 5_000_000,
      intelligence: {
        selfAnalysis: mockSelfAnalysis,
        marketTrend: mockMarketTrend,
        tenderSummary: {
          title: "",
          agency: "文化部",
          budget: 5_000_000,
          floorPrice: null,
          awardAmount: null,
          bidderCount: 3,
          awardDate: null,
          deadline: null,
          procurementType: null,
          awardMethod: null,
        },
      },
      kb: {
        ...emptyKB,
        "00A": mockTeam,
        "00B": mockPortfolio,
      },
    };
    const result = calculateFitScore(input);
    expect(result.total).toBeGreaterThanOrEqual(70);
    expect(result.verdict).toBe("建議投標");
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it("低匹配案件 → 不建議", () => {
    const input: FitScoreInput = {
      caseName: "高速公路施工工程",
      agency: "交通部公路局",
      budget: 500_000_000,
      intelligence: {
        selfAnalysis: mockSelfAnalysis,
        marketTrend: null,
        tenderSummary: {
          title: "",
          agency: "交通部公路局",
          budget: 500_000_000,
          floorPrice: null,
          awardAmount: null,
          bidderCount: 15,
          awardDate: null,
          deadline: null,
          procurementType: null,
          awardMethod: null,
        },
      },
      kb: {
        ...emptyKB,
        "00A": mockTeam,
        "00B": mockPortfolio,
      },
    };
    const result = calculateFitScore(input);
    expect(result.total).toBeLessThan(50);
    expect(result.verdict).toBe("不建議");
  });

  it("紅旗偵測正確", () => {
    const input: FitScoreInput = {
      caseName: "限制性招標：博物館策展",
      agency: "故宮博物院",
      budget: 3_000_000,
      intelligence: {
        selfAnalysis: null,
        marketTrend: null,
        tenderSummary: null,
      },
      kb: {
        ...emptyKB,
        "00A": mockTeam,
        "00B": mockPortfolio,
      },
    };
    const result = calculateFitScore(input);
    expect(result.redFlags.length).toBeGreaterThan(0);
    expect(result.redFlags[0]).toContain("限制性招標");
  });

  it("總分在 0-100 之間", () => {
    const input: FitScoreInput = {
      caseName: "活動",
      agency: "文化部",
      budget: 1_000_000,
      intelligence: {
        selfAnalysis: mockSelfAnalysis,
        marketTrend: mockMarketTrend,
        tenderSummary: null,
      },
      kb: {
        ...emptyKB,
        "00A": mockTeam,
        "00B": mockPortfolio,
      },
    };
    const result = calculateFitScore(input);
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.total).toBeLessThanOrEqual(100);
  });

  it("自訂權重正確正規化", () => {
    const input: FitScoreInput = {
      caseName: "臺灣文化節活動策展",
      agency: "文化部",
      budget: 5_000_000,
      intelligence: {
        selfAnalysis: mockSelfAnalysis,
        marketTrend: mockMarketTrend,
        tenderSummary: null,
      },
      kb: {
        ...emptyKB,
        "00A": mockTeam,
        "00B": mockPortfolio,
      },
    };

    // 加重領域權重
    const domainHeavy = calculateFitScore(input, {
      domain: 40,
      agency: 15,
      competition: 15,
      scale: 15,
      team: 15,
    });

    expect(domainHeavy.total).toBeGreaterThanOrEqual(0);
    expect(domainHeavy.total).toBeLessThanOrEqual(100);
  });
});
