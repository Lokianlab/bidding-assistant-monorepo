import { describe, it, expect } from "vitest";
import { matchKB } from "../kb-matcher";
import type {
  KnowledgeBaseData,
  KBEntry00A,
  KBEntry00B,
  KBEntry00C,
  KBEntry00D,
  KBEntry00E,
} from "@/lib/knowledge-base/types";

// ====== Mock 資料 ======

const mockTeam: KBEntry00A[] = [
  {
    id: "M-001",
    name: "黃偉誠",
    title: "總監",
    status: "在職",
    authorizedRoles: ["計畫主持人"],
    education: [],
    certifications: [],
    experiences: [
      {
        period: "2018-2024",
        organization: "大員洛川",
        title: "活動總監",
        description: "主持多項文化活動與展覽策展計畫",
      },
    ],
    projects: [
      {
        role: "計畫主持人",
        projectName: "臺灣文化節",
        client: "文化部",
        year: "2024",
        outcome: "完成",
      },
    ],
    additionalCapabilities: "活動策劃、展覽策展",
    entryStatus: "active",
    updatedAt: "2025-01-01",
  },
  {
    id: "M-002",
    name: "林小芳",
    title: "設計師",
    status: "在職",
    authorizedRoles: [],
    education: [],
    certifications: [],
    experiences: [
      {
        period: "2020-2024",
        organization: "大員洛川",
        title: "資訊系統開發人員",
        description: "負責系統開發與網站維護",
      },
    ],
    projects: [],
    additionalCapabilities: "資訊系統、網站開發",
    entryStatus: "active",
    updatedAt: "2025-01-01",
  },
];

const mockPortfolio: KBEntry00B[] = [
  {
    id: "P-001",
    projectName: "113 年臺灣文化節活動策展",
    client: "文化部",
    contractAmount: "5,000,000",
    period: "",
    entity: "",
    role: "",
    completionStatus: "",
    teamMembers: "",
    workItems: [],
    outcomes: "",
    documentLinks: "",
    entryStatus: "active",
    updatedAt: "",
  },
  {
    id: "P-002",
    projectName: "城市行銷推廣計畫",
    client: "臺中市政府",
    contractAmount: "2,000,000",
    period: "",
    entity: "",
    role: "",
    completionStatus: "",
    teamMembers: "",
    workItems: [],
    outcomes: "",
    documentLinks: "",
    entryStatus: "active",
    updatedAt: "",
  },
];

const mockTemplates: KBEntry00C[] = [
  {
    id: "T-EXH",
    templateName: "展覽策展時程範本",
    applicableType: "展覽策展",
    budgetRange: "200-1000 萬",
    durationRange: "3-6 個月",
    phases: [],
    warnings: "",
    entryStatus: "active",
    updatedAt: "",
  },
  {
    id: "T-EVT",
    templateName: "活動執行時程範本",
    applicableType: "文化活動",
    budgetRange: "100-500 萬",
    durationRange: "2-4 個月",
    phases: [],
    warnings: "",
    entryStatus: "active",
    updatedAt: "",
  },
];

const mockRisks: KBEntry00D[] = [
  {
    id: "R-WEA",
    riskName: "戶外活動天候風險",
    riskLevel: "高",
    prevention: "備案場地",
    responseSteps: [],
    notes: "",
    entryStatus: "active",
    updatedAt: "",
  },
  {
    id: "R-MED",
    riskName: "媒體公關危機",
    riskLevel: "中",
    prevention: "",
    responseSteps: [],
    notes: "",
    entryStatus: "active",
    updatedAt: "",
  },
];

const mockReviews: KBEntry00E[] = [
  {
    id: "REV-001",
    projectName: "112 年文化節活動檢討",
    result: "得標",
    year: "2023",
    bidPhaseReview: "",
    executionReview: "",
    kbUpdateSuggestions: "",
    aiToolFeedback: "",
    oneSentenceSummary: "順利完成",
    entryStatus: "active",
    updatedAt: "",
  },
];

const mockKB: KnowledgeBaseData = {
  "00A": mockTeam,
  "00B": mockPortfolio,
  "00C": mockTemplates,
  "00D": mockRisks,
  "00E": mockReviews,
  lastUpdated: "2025-01-01",
  version: 1,
};

const emptyKB: KnowledgeBaseData = {
  "00A": [],
  "00B": [],
  "00C": [],
  "00D": [],
  "00E": [],
  lastUpdated: "",
  version: 1,
};

// ====== 測試 ======

describe("matchKB", () => {
  it("空知識庫 → 五庫都回空陣列", () => {
    const result = matchKB("文化活動策展", "文化部", emptyKB);
    expect(result.team).toHaveLength(0);
    expect(result.portfolio).toHaveLength(0);
    expect(result.templates).toHaveLength(0);
    expect(result.risks).toHaveLength(0);
    expect(result.reviews).toHaveLength(0);
  });

  it("文化活動案 → 匹配相關團隊成員", () => {
    const result = matchKB("文化活動策展", "文化部", mockKB);
    expect(result.team.length).toBeGreaterThan(0);
    // M-001 黃偉誠的經驗包含「活動」和「策展」
    expect(result.team.some((t) => t.entry.name === "黃偉誠")).toBe(true);
  });

  it("資訊系統案 → 匹配 M-002", () => {
    const result = matchKB("資訊系統開發", "某機關", mockKB);
    expect(result.team.some((t) => t.entry.name === "林小芳")).toBe(true);
  });

  it("文化部的案 → 匹配同機關實績", () => {
    const result = matchKB("新案件名稱不含關鍵字", "文化部", mockKB);
    // P-001 client 是文化部
    expect(result.portfolio.some((p) => p.entry.id === "P-001")).toBe(true);
    expect(result.portfolio[0].relevance).toContain("同機關");
  });

  it("策展案 → 匹配展覽範本", () => {
    const result = matchKB("博物館策展展覽", "文化部", mockKB);
    expect(result.templates.length).toBeGreaterThan(0);
    expect(result.templates.some((t) => t.entry.id === "T-EXH")).toBe(true);
  });

  it("活動案 → 匹配活動風險和範本", () => {
    const result = matchKB("戶外文化活動", "文化部", mockKB);
    // T-EVT 適用「文化活動」
    expect(result.templates.some((t) => t.entry.id === "T-EVT")).toBe(true);
    // R-WEA 風險名含「活動」
    expect(result.risks.some((r) => r.entry.id === "R-WEA")).toBe(true);
  });

  it("文化活動案 → 匹配案後檢討", () => {
    const result = matchKB("文化節活動", "文化部", mockKB);
    // REV-001 包含「文化節」和「活動」
    expect(result.reviews.length).toBeGreaterThan(0);
  });

  it("完全無關的案件 → 大部分空", () => {
    const result = matchKB("道路橋梁施工", "交通部公路局", mockKB);
    expect(result.team).toHaveLength(0);
    expect(result.portfolio).toHaveLength(0);
    expect(result.templates).toHaveLength(0);
  });

  it("每個匹配結果都有 relevance 說明", () => {
    const result = matchKB("文化活動策展", "文化部", mockKB);
    for (const match of result.team) {
      expect(match.relevance).toBeTruthy();
    }
    for (const match of result.portfolio) {
      expect(match.relevance).toBeTruthy();
    }
  });

  it("忽略 archived 的知識庫條目", () => {
    const archivedKB: KnowledgeBaseData = {
      ...mockKB,
      "00A": mockTeam.map((m) => ({
        ...m,
        entryStatus: "archived" as const,
      })),
      "00B": mockPortfolio.map((p) => ({
        ...p,
        entryStatus: "archived" as const,
      })),
    };
    const result = matchKB("文化活動策展", "文化部", archivedKB);
    expect(result.team).toHaveLength(0);
    expect(result.portfolio).toHaveLength(0);
  });
});
