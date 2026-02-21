import { describe, it, expect } from "vitest";
import { matchKB } from "../kb-matcher";
import type { KnowledgeBaseData } from "../types";

// ====== Test fixtures ======

function makeEmptyKB(): KnowledgeBaseData {
  return {
    "00A": [],
    "00B": [],
    "00C": [],
    "00D": [],
    "00E": [],
    lastUpdated: "2025-12-01",
    version: 1,
  };
}

function makePopulatedKB(): KnowledgeBaseData {
  return {
    "00A": [
      {
        id: "M-001",
        name: "黃偉誠",
        title: "計畫主持人",
        status: "在職",
        authorizedRoles: ["計畫主持人", "策展人"],
        education: [{ school: "台大", department: "藝術研究所", degree: "碩士" }],
        certifications: [{ name: "策展人認證", issuer: "文化部", expiry: "永久" }],
        experiences: [{ period: "2018-2022", organization: "文化局", title: "策展人", description: "策展工作" }],
        projects: [{ role: "計畫主持人", projectName: "藝術節策展", client: "文化部", year: "2024", outcome: "5萬人次" }],
        additionalCapabilities: "展覽設計、文化資產調查",
        entryStatus: "active",
        updatedAt: "2025-12-01",
      },
      {
        id: "M-002",
        name: "李美玲",
        title: "設計師",
        status: "在職",
        authorizedRoles: ["平面設計"],
        education: [],
        certifications: [],
        experiences: [{ period: "2020-2024", organization: "設計公司", title: "設計師", description: "平面設計與包裝設計" }],
        projects: [],
        additionalCapabilities: "包裝設計",
        entryStatus: "active",
        updatedAt: "2025-12-01",
      },
    ],
    "00B": [
      {
        id: "P-2025-001",
        projectName: "113年度藝術節策展服務案",
        client: "文化部",
        contractAmount: "3,500,000",
        period: "民國 113 年 3 月至 8 月",
        entity: "大員洛川股份有限公司",
        role: "得標廠商（與機關簽約）",
        completionStatus: "已驗收結案",
        teamMembers: "計畫主持人：黃偉誠",
        workItems: [
          { item: "策展規劃", description: "藝術節主題策展規劃與執行" },
          { item: "展覽設計", description: "展場空間設計" },
        ],
        outcomes: "參觀人次達 5 萬人",
        documentLinks: "",
        entryStatus: "active",
        updatedAt: "2025-12-01",
      },
      {
        id: "P-2025-002",
        projectName: "教育推廣活動委託案",
        client: "教育部",
        contractAmount: "1,200,000",
        period: "民國 113 年 5 月至 10 月",
        entity: "大員洛川股份有限公司",
        role: "得標廠商（與機關簽約）",
        completionStatus: "履約中",
        teamMembers: "計畫主持人：黃偉誠",
        workItems: [{ item: "教育推廣", description: "教育推廣活動規劃" }],
        outcomes: "",
        documentLinks: "",
        entryStatus: "active",
        updatedAt: "2025-12-01",
      },
    ],
    "00C": [
      {
        id: "T-EXH",
        templateName: "展覽策展時程範本",
        applicableType: "展覽策展",
        budgetRange: "200萬-800萬",
        durationRange: "4-8個月",
        phases: [
          { phase: "前置期", duration: "1個月", deliverables: "策展計畫書", checkpoints: "計畫書審查" },
        ],
        warnings: "常見低估：搬運時間",
        entryStatus: "active",
        updatedAt: "2025-12-01",
      },
    ],
    "00D": [
      {
        id: "R-WEA",
        riskName: "戶外活動天候風險",
        riskLevel: "中",
        prevention: "備有室內替代方案",
        responseSteps: [{ step: "1", action: "啟動替代方案", responsible: "計畫主持人" }],
        notes: "適用於戶外展覽、藝術節",
        entryStatus: "active",
        updatedAt: "2025-12-01",
      },
    ],
    "00E": [
      {
        id: "REV-001",
        projectName: "文化部 112 年度策展案",
        result: "得標",
        year: "2023",
        bidPhaseReview: "策展規劃獲高分",
        executionReview: "時程控制良好",
        kbUpdateSuggestions: "",
        aiToolFeedback: "",
        oneSentenceSummary: "策展核心能力獲肯定",
        entryStatus: "active",
        updatedAt: "2025-12-01",
      },
    ],
    lastUpdated: "2025-12-01",
    version: 1,
  };
}

// ====== matchKB ======

describe("matchKB", () => {
  it("空知識庫回傳空結果", () => {
    const result = matchKB("策展案", ["策展"], "文化部", makeEmptyKB());
    expect(result.team).toEqual([]);
    expect(result.portfolio).toEqual([]);
    expect(result.templates).toEqual([]);
    expect(result.risks).toEqual([]);
    expect(result.reviews).toEqual([]);
  });

  it("匹配 00A 團隊成員", () => {
    const result = matchKB("策展服務案", ["策展"], "文化部", makePopulatedKB());
    expect(result.team.length).toBeGreaterThan(0);
    expect(result.team[0].entry.name).toBe("黃偉誠");
    expect(result.team[0].relevance).toBeTruthy();
  });

  it("匹配 00B 實績 — 關鍵字", () => {
    const result = matchKB("藝術節策展", ["策展", "藝術節"], "教育部", makePopulatedKB());
    // P-2025-001 的案名含「藝術節策展」
    expect(result.portfolio.some((p) => p.entry.id === "P-2025-001")).toBe(true);
  });

  it("匹配 00B 實績 — 機關名稱", () => {
    const result = matchKB("某委託案", ["委託"], "文化部", makePopulatedKB());
    // P-2025-001 的 client 是「文化部」
    expect(result.portfolio.some((p) => p.entry.client === "文化部")).toBe(true);
  });

  it("匹配 00C 時程範本", () => {
    const result = matchKB("展覽策展案", ["展覽", "策展"], "文化部", makePopulatedKB());
    expect(result.templates.length).toBeGreaterThan(0);
    expect(result.templates[0].entry.id).toBe("T-EXH");
  });

  it("匹配 00D 應變 SOP", () => {
    const kb = makePopulatedKB();
    const result = matchKB("戶外藝術節", ["戶外", "藝術節"], "文化部", kb);
    // R-WEA 的 riskName 含「戶外」
    expect(result.risks.some((r) => r.entry.id === "R-WEA")).toBe(true);
  });

  it("匹配 00E 案後檢討", () => {
    const result = matchKB("策展案", ["策展"], "文化部", makePopulatedKB());
    // REV-001 的案名含「策展」且有「文化部」
    expect(result.reviews.length).toBeGreaterThan(0);
  });

  it("不匹配已封存的 entry", () => {
    const kb = makePopulatedKB();
    kb["00A"][0].entryStatus = "archived";
    const result = matchKB("策展", ["策展"], "文化部", kb);
    expect(result.team.every((t) => t.entry.entryStatus === "active")).toBe(true);
  });

  it("不匹配已離職的團隊成員", () => {
    const kb = makePopulatedKB();
    kb["00A"][0].status = "已離職";
    const result = matchKB("策展", ["策展"], "文化部", kb);
    expect(result.team.every((t) => t.entry.status !== "已離職")).toBe(true);
  });

  it("自動從案名提取關鍵字", () => {
    const result = matchKB("113年度藝術節策展服務案", [], "文化部", makePopulatedKB());
    // 即使 tenderKeywords 為空，也應該自動提取並匹配
    expect(result.portfolio.length).toBeGreaterThan(0);
  });

  it("結果按匹配度排序", () => {
    const result = matchKB("策展服務", ["策展"], "文化部", makePopulatedKB());
    if (result.portfolio.length >= 2) {
      // 第一筆的匹配原因應該 >= 第二筆
      expect(
        result.portfolio[0].relevance.split("、").length,
      ).toBeGreaterThanOrEqual(
        result.portfolio[1].relevance.split("、").length,
      );
    }
  });
});
