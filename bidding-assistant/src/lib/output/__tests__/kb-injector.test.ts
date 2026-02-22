import { describe, it, expect } from "vitest";
import { findPlaceholders, validate, injectPlaceholders } from "../kb-injector";
import type { KnowledgeBaseData } from "@/lib/knowledge-base/types";

// ── 測試資料 ──────────────────────────────────────────────────

const mockKBData: KnowledgeBaseData = {
  "00A": [
    {
      id: "M-001",
      name: "黃偉誠",
      title: "計畫主持人",
      status: "在職",
      authorizedRoles: ["計畫主持人", "PM"],
      education: [],
      certifications: [{ name: "PMP", issuer: "PMI", expiry: "2027-01" }],
      experiences: [
        { period: "2019-2024", organization: "文化局", title: "計畫顧問", description: "負責文化活動策劃" },
      ],
      projects: [],
      additionalCapabilities: "",
      entryStatus: "active",
      updatedAt: "2025-01-01",
    },
    {
      id: "E-001",
      name: "林小明",
      title: "活動執行",
      status: "在職",
      authorizedRoles: ["活動執行", "工作人員"],
      education: [],
      certifications: [],
      experiences: [],
      projects: [],
      additionalCapabilities: "",
      entryStatus: "draft",  // draft，不應出現
      updatedAt: "2025-01-02",
    },
  ],
  "00B": [
    {
      id: "P-2025-001",
      projectName: "故宮活化計畫",
      client: "國立故宮博物院",
      contractAmount: "2,500,000",
      period: "民國 114 年 3 月至 8 月",
      entity: "大員洛川股份有限公司",
      role: "得標廠商",
      completionStatus: "已驗收結案",
      teamMembers: "計畫主持人：黃偉誠",
      workItems: [],
      outcomes: "觀眾人次提升 30%",
      documentLinks: "",
      entryStatus: "active",
      updatedAt: "2025-01-10",
    },
    {
      id: "P-2024-001",
      projectName: "文化局特展",
      client: "臺北市文化局",
      contractAmount: "1,200,000",
      period: "民國 113 年 6 月至 11 月",
      entity: "大員洛川股份有限公司",
      role: "得標廠商",
      completionStatus: "已驗收結案",
      teamMembers: "計畫主持人：黃偉誠",
      workItems: [],
      outcomes: "參觀人次 15,000",
      documentLinks: "",
      entryStatus: "active",
      updatedAt: "2024-12-01",
    },
  ],
  "00C": [
    {
      id: "T-EXH",
      templateName: "展覽策展時程",
      applicableType: "展覽策展",
      budgetRange: "100萬-500萬",
      durationRange: "6-12個月",
      phases: [
        { phase: "規劃期", duration: "2個月", deliverables: "策展概念", checkpoints: "概念審查" },
        { phase: "執行期", duration: "4個月", deliverables: "場佈完成", checkpoints: "進場檢查" },
      ],
      warnings: "場地申請耗時常被低估",
      entryStatus: "active",
      updatedAt: "2025-01-01",
    },
  ],
  "00D": [
    {
      id: "R-MED",
      riskName: "媒體危機",
      riskLevel: "高",
      prevention: "建立媒體聯絡清單，定期發新聞稿",
      responseSteps: [
        { step: "1", action: "立即停止活動", responsible: "計畫主持人" },
        { step: "2", action: "通知主管機關", responsible: "PM" },
      ],
      notes: "",
      entryStatus: "active",
      updatedAt: "2025-01-01",
    },
  ],
  "00E": [
    {
      id: "E-2024-001",
      projectName: "113A119失標案",
      result: "未得標",
      year: "2024",
      bidPhaseReview: "L1-L4 分析完整",
      executionReview: "未執行",
      kbUpdateSuggestions: "補充履約實績",
      aiToolFeedback: "評分偏低",
      oneSentenceSummary: "履約實績不足，評分落後競爭對手",
      entryStatus: "active",
      updatedAt: "2025-01-01",
    },
  ],
  lastUpdated: "2025-01-10",
  version: 1,
};

const emptyKBData: KnowledgeBaseData = {
  "00A": [],
  "00B": [],
  "00C": [],
  "00D": [],
  "00E": [],
  lastUpdated: "2025-01-01",
  version: 1,
};

// ── findPlaceholders ──────────────────────────────────────────

describe("findPlaceholders — KB 佔位符", () => {
  it("解析單個 KB 佔位符", () => {
    const results = findPlaceholders("{{kb:00A:PM}}");
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe("kb");
    expect(results[0].category).toBe("00A");
    expect(results[0].selector).toBe("PM");
    expect(results[0].raw).toBe("{{kb:00A:PM}}");
  });

  it("解析帶數量的 KB 佔位符", () => {
    const results = findPlaceholders("{{kb:00B:recent:3}}");
    expect(results).toHaveLength(1);
    expect(results[0].selector).toBe("recent");
    expect(results[0].limit).toBe(3);
  });

  it("解析多個 KB 佔位符", () => {
    const content = "{{kb:00A:PM}} 和 {{kb:00B:recent:2}}";
    const results = findPlaceholders(content);
    expect(results).toHaveLength(2);
    expect(results[0].category).toBe("00A");
    expect(results[1].category).toBe("00B");
    expect(results[1].limit).toBe(2);
  });

  it("解析 company 佔位符", () => {
    const results = findPlaceholders("{{company:name}}");
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe("company");
    expect(results[0].selector).toBe("name");
  });

  it("解析 project 佔位符", () => {
    const results = findPlaceholders("{{project:name}}");
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe("project");
    expect(results[0].selector).toBe("name");
  });

  it("解析 date 佔位符", () => {
    const results = findPlaceholders("{{date:roc}}");
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe("date");
    expect(results[0].selector).toBe("roc");
  });

  it("空內容回傳空陣列", () => {
    expect(findPlaceholders("")).toHaveLength(0);
  });

  it("無佔位符的普通文字回傳空陣列", () => {
    expect(findPlaceholders("這是一段普通文字，沒有佔位符")).toHaveLength(0);
  });

  it("混合 KB 和品牌佔位符", () => {
    const content = "公司：{{company:name}}\n團隊：{{kb:00A:計畫主持人}}";
    const results = findPlaceholders(content);
    expect(results).toHaveLength(2);
  });
});

// ── validate ──────────────────────────────────────────────────

describe("validate — 佔位符驗證", () => {
  it("可解析的佔位符 → valid=true", () => {
    const placeholders = findPlaceholders("{{kb:00A:PM}}");
    const result = validate(placeholders, mockKBData);
    expect(result.valid).toBe(true);
    expect(result.unresolved).toHaveLength(0);
  });

  it("找不到的 KB → valid=false + unresolved 含該項", () => {
    const placeholders = findPlaceholders("{{kb:00A:不存在的角色}}");
    const result = validate(placeholders, mockKBData);
    expect(result.valid).toBe(false);
    expect(result.unresolved).toHaveLength(1);
    expect(result.unresolved[0].selector).toBe("不存在的角色");
  });

  it("空知識庫全部不可解析", () => {
    const placeholders = findPlaceholders("{{kb:00A:PM}}");
    const result = validate(placeholders, emptyKBData);
    expect(result.valid).toBe(false);
  });

  it("品牌佔位符不納入 KB 驗證", () => {
    const placeholders = findPlaceholders("{{company:name}} {{kb:00A:PM}}");
    const result = validate(placeholders, mockKBData);
    expect(result.valid).toBe(true); // company 不做 KB 驗證
  });

  it("混合可解析和不可解析 → 只回報不可解析的", () => {
    const placeholders = findPlaceholders(
      "{{kb:00A:PM}} {{kb:00A:不存在角色}}"
    );
    const result = validate(placeholders, mockKBData);
    expect(result.valid).toBe(false);
    expect(result.unresolved).toHaveLength(1);
  });
});

// ── injectPlaceholders — KB ───────────────────────────────────

describe("injectPlaceholders — KB 替換", () => {
  const brandVars = { companyName: "大員洛川", companyTaxId: "12345678", projectName: "故宮活化案" };

  it("替換 00A 成員（以角色找）", () => {
    const result = injectPlaceholders("{{kb:00A:PM}}", mockKBData, brandVars);
    expect(result).toContain("黃偉誠");
    expect(result).toContain("計畫主持人");
    expect(result).not.toContain("{{kb:00A:PM}}");
  });

  it("只替換 active 成員，draft 不出現", () => {
    const result = injectPlaceholders("{{kb:00A:活動執行}}", mockKBData, brandVars);
    // 林小明是 draft，不應被替換
    expect(result).toBe("{{kb:00A:活動執行}}"); // 原樣保留
  });

  it("替換 00B recent 實績（預設 3 筆）", () => {
    const result = injectPlaceholders("{{kb:00B:recent}}", mockKBData, brandVars);
    expect(result).toContain("故宮活化計畫");
    expect(result).toContain("文化局特展");
  });

  it("替換 00B recent 限制筆數", () => {
    const result = injectPlaceholders("{{kb:00B:recent:1}}", mockKBData, brandVars);
    // 最新的是故宮（updatedAt 2025-01-10），只回傳 1 筆
    expect(result).toContain("故宮活化計畫");
    expect(result).not.toContain("文化局特展");
  });

  it("替換 00C 時程範本", () => {
    const result = injectPlaceholders("{{kb:00C:展覽}}", mockKBData, brandVars);
    expect(result).toContain("展覽策展時程");
    expect(result).toContain("規劃期");
  });

  it("替換 00D 應變 SOP", () => {
    const result = injectPlaceholders("{{kb:00D:媒體}}", mockKBData, brandVars);
    expect(result).toContain("媒體危機");
    expect(result).toContain("立即停止活動");
  });

  it("替換 00E 案後檢討", () => {
    const result = injectPlaceholders("{{kb:00E:113A119}}", mockKBData, brandVars);
    expect(result).toContain("113A119失標案");
    expect(result).toContain("履約實績不足");
  });

  it("找不到的 KB → 原樣保留", () => {
    const result = injectPlaceholders("{{kb:00A:不存在角色}}", mockKBData, brandVars);
    expect(result).toBe("{{kb:00A:不存在角色}}");
  });
});

// ── injectPlaceholders — 品牌 ─────────────────────────────────

describe("injectPlaceholders — 品牌佔位符替換", () => {
  const brandVars = { companyName: "大員洛川", companyTaxId: "12345678", projectName: "故宮活化案" };

  it("替換公司名稱", () => {
    const result = injectPlaceholders("{{company:name}}", emptyKBData, brandVars);
    expect(result).toBe("大員洛川");
  });

  it("替換統一編號", () => {
    const result = injectPlaceholders("{{company:taxId}}", emptyKBData, brandVars);
    expect(result).toBe("12345678");
  });

  it("替換專案名稱", () => {
    const result = injectPlaceholders("{{project:name}}", emptyKBData, brandVars);
    expect(result).toBe("故宮活化案");
  });

  it("替換民國日期（格式正確）", () => {
    const result = injectPlaceholders("{{date:roc}}", emptyKBData, brandVars);
    expect(result).toMatch(/^民國 \d+ 年 \d+ 月 \d+ 日$/);
  });

  it("未提供的品牌變數 → 原樣保留", () => {
    const result = injectPlaceholders("{{company:name}}", emptyKBData, {});
    expect(result).toBe("{{company:name}}");
  });

  it("未知的品牌 key → 原樣保留", () => {
    const result = injectPlaceholders("{{company:unknown}}", emptyKBData, brandVars);
    expect(result).toBe("{{company:unknown}}");
  });
});

// ── 整合測試 ──────────────────────────────────────────────────

describe("injectPlaceholders — 整合", () => {
  it("混合 KB 和品牌佔位符都能替換", () => {
    const content = "提案公司：{{company:name}}\n團隊負責人：{{kb:00A:PM}}";
    const brandVars = { companyName: "大員洛川" };
    const result = injectPlaceholders(content, mockKBData, brandVars);
    expect(result).toContain("大員洛川");
    expect(result).toContain("黃偉誠");
  });

  it("無佔位符的內容原樣返回", () => {
    const content = "這是一段普通文字";
    const result = injectPlaceholders(content, mockKBData, {});
    expect(result).toBe(content);
  });
});
