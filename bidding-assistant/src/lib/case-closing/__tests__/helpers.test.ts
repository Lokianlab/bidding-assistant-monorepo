import { describe, it, expect } from "vitest";
import {
  calculateAggregateScore,
  validateScores,
  extractTagsFromText,
  convertToKBItem,
  identifySuccessPatterns,
  validateCaseSummary,
  createCaseLearning,
  formatClosingReport,
} from "../helpers";
import type { CaseAssessment, CaseSummary, CaseLearning } from "../types";

// ── Test Data Builders ──────────────────────────────────────

function makeAssessment(overrides: Partial<CaseAssessment> = {}): CaseAssessment {
  return {
    strategyScore: 8,
    executionScore: 7,
    satisfactionScore: 9,
    tags: ["技術風險", "團隊協作"],
    ...overrides,
  };
}

function makeSummary(overrides: Partial<CaseSummary> = {}): CaseSummary {
  return {
    caseId: "case-001",
    caseName: "標案 #2601",
    sections: {
      whatWeDid: "完成了前端開發和測試",
      whatWeLearned: "API 設計需要更早的規劃",
      nextTimeNotes: "應該在需求確定後立即開始架構設計",
    },
    suggestedTags: ["技術風險"],
    ...overrides,
  };
}

function makeLearning(overrides: Partial<CaseLearning> = {}): CaseLearning {
  return {
    id: "learning-001",
    caseId: "case-001",
    tenantId: "tenant-001",
    title: "標案 #2601 - 結案經驗",
    whatWeDid: "完成了前端開發和測試",
    whatWeLearned: "API 設計需要更早的規劃",
    nextTimeNotes: "應該在需求確定後立即開始架構設計",
    tags: ["技術風險"],
    strategyScore: 8,
    executionScore: 7,
    satisfactionScore: 9,
    createdAt: "2026-02-23T00:00:00Z",
    updatedAt: "2026-02-23T00:00:00Z",
    ...overrides,
  };
}

// ── calculateAggregateScore ──────────────────────────────────

describe("calculateAggregateScore", () => {
  it("計算平均分數（正常情況）", () => {
    const assessment = makeAssessment({ strategyScore: 9, executionScore: 8, satisfactionScore: 7 });
    const result = calculateAggregateScore(assessment);

    expect(result.strategy).toBe(9);
    expect(result.execution).toBe(8);
    expect(result.satisfaction).toBe(7);
    expect(result.total).toBe(8); // (9 + 8 + 7) / 3 = 8
  });

  it("四捨五入到一位小數", () => {
    const assessment = makeAssessment({ strategyScore: 8, executionScore: 8, satisfactionScore: 9 });
    const result = calculateAggregateScore(assessment);

    expect(result.total).toBe(8.3); // (8 + 8 + 9) / 3 = 8.333... → 8.3
  });

  it("全滿分", () => {
    const assessment = makeAssessment({ strategyScore: 10, executionScore: 10, satisfactionScore: 10 });
    const result = calculateAggregateScore(assessment);

    expect(result.total).toBe(10);
  });

  it("全最低分", () => {
    const assessment = makeAssessment({ strategyScore: 1, executionScore: 1, satisfactionScore: 1 });
    const result = calculateAggregateScore(assessment);

    expect(result.total).toBe(1);
  });
});

// ── validateScores ──────────────────────────────────────────

describe("validateScores", () => {
  it("有效的分數（1-10）", () => {
    expect(validateScores({ strategyScore: 5 })).toBe(true);
    expect(validateScores({ executionScore: 1 })).toBe(true);
    expect(validateScores({ satisfactionScore: 10 })).toBe(true);
  });

  it("未定義的分數視為有效", () => {
    expect(validateScores({})).toBe(true);
    expect(validateScores({ strategyScore: undefined })).toBe(true);
  });

  it("超出範圍的分數無效", () => {
    expect(validateScores({ strategyScore: 0 })).toBe(false);
    expect(validateScores({ executionScore: 11 })).toBe(false);
    expect(validateScores({ satisfactionScore: -1 })).toBe(false);
  });

  it("非整數分數無效", () => {
    expect(validateScores({ strategyScore: 5.5 })).toBe(false);
    expect(validateScores({ executionScore: 7.2 })).toBe(false);
  });

  it("混合有效和無效的分數", () => {
    expect(validateScores({ strategyScore: 5, executionScore: 11 })).toBe(false);
    expect(validateScores({ strategyScore: 5, satisfactionScore: 10 })).toBe(true);
  });
});

// ── extractTagsFromText ──────────────────────────────────────

describe("extractTagsFromText", () => {
  it("提取單個標籤", () => {
    const text = "我們遇到了技術風險，導致延期開發";
    const tags = extractTagsFromText(text);
    expect(tags).toContain("技術風險");
  });

  it("提取多個標籤", () => {
    const text = "這個案件涉及時程管理問題，也有客戶溝通的挑戰";
    const tags = extractTagsFromText(text);
    expect(tags).toContain("時程管理");
    expect(tags).toContain("客戶溝通");
  });

  it("無匹配標籤", () => {
    const text = "這是一個簡單的完成報告，沒有特殊問題";
    const tags = extractTagsFromText(text);
    expect(tags).toHaveLength(0);
  });

  it("去重標籤", () => {
    const text = "技術問題導致效能問題，還有其他相容性風險";
    const tags = extractTagsFromText(text);
    // 應該只有一次 "技術風險"
    expect(tags.filter((t) => t === "技術風險")).toHaveLength(1);
  });

  it("大小寫不敏感", () => {
    const text = "我們有成本超支和預算控制問題";
    const tags = extractTagsFromText(text);
    expect(tags).toContain("成本控制");
  });
});

// ── validateCaseSummary ──────────────────────────────────────

describe("validateCaseSummary", () => {
  it("完整的摘要為有效", () => {
    const summary = makeSummary();
    expect(validateCaseSummary(summary)).toBe(true);
  });

  it("空白部分無效", () => {
    const summary = makeSummary({ sections: { whatWeDid: "", whatWeLearned: "內容", nextTimeNotes: "內容" } });
    expect(validateCaseSummary(summary)).toBe(false);
  });

  it("僅空白符號也無效", () => {
    const summary = makeSummary({ sections: { whatWeDid: "   ", whatWeLearned: "內容", nextTimeNotes: "內容" } });
    expect(validateCaseSummary(summary)).toBe(false);
  });

  it("所有部分都空白無效", () => {
    const summary = makeSummary({ sections: { whatWeDid: "", whatWeLearned: "", nextTimeNotes: "" } });
    expect(validateCaseSummary(summary)).toBe(false);
  });
});

// ── createCaseLearning ──────────────────────────────────────

describe("createCaseLearning", () => {
  it("合併摘要與評分", () => {
    const summary = makeSummary();
    const assessment = makeAssessment({ tags: ["技術風險", "客戶溝通"] });

    const learning = createCaseLearning(summary, assessment, assessment.tags);

    expect(learning.caseId).toBe("case-001");
    expect(learning.title).toBe("標案 #2601 - 結案經驗");
    expect(learning.whatWeDid).toBe(summary.sections.whatWeDid);
    expect(learning.whatWeLearned).toBe(summary.sections.whatWeLearned);
    expect(learning.nextTimeNotes).toBe(summary.sections.nextTimeNotes);
    expect(learning.strategyScore).toBe(8);
    expect(learning.executionScore).toBe(7);
    expect(learning.satisfactionScore).toBe(9);
    expect(learning.tags).toEqual(["技術風險", "客戶溝通"]);
  });

  it("沒有 id、tenantId、timestamps（由 DB 自動生成）", () => {
    const summary = makeSummary();
    const assessment = makeAssessment({ tags: [] });

    const learning = createCaseLearning(summary, assessment, []);

    expect(learning).not.toHaveProperty("id");
    expect(learning).not.toHaveProperty("tenantId");
    expect(learning).not.toHaveProperty("createdAt");
    expect(learning).not.toHaveProperty("updatedAt");
  });
});

// ── convertToKBItem ─────────────────────────────────────────

describe("convertToKBItem", () => {
  it("轉換為 KB 項目格式", () => {
    const learning = makeLearning();

    const kbItem = convertToKBItem(learning);

    expect(kbItem.title).toBe(learning.title);
    expect(kbItem.caseId).toBe(learning.caseId);
    expect(kbItem.category).toBe("case_closing");
    expect(kbItem.tags).toEqual(learning.tags);
  });

  it("內容包含三段落", () => {
    const learning = makeLearning();
    const kbItem = convertToKBItem(learning);

    expect(kbItem.content).toContain("完成項目：");
    expect(kbItem.content).toContain("學習重點：");
    expect(kbItem.content).toContain("下次注意：");
  });

  it("內容包含所有文本段", () => {
    const learning = makeLearning();
    const kbItem = convertToKBItem(learning);

    expect(kbItem.content).toContain(learning.whatWeDid);
    expect(kbItem.content).toContain(learning.whatWeLearned);
    expect(kbItem.content).toContain(learning.nextTimeNotes);
  });

  it("metadata 包含評分", () => {
    const learning = makeLearning();
    const kbItem = convertToKBItem(learning);

    expect(kbItem.metadata.strategyScore).toBe(8);
    expect(kbItem.metadata.executionScore).toBe(7);
    expect(kbItem.metadata.satisfactionScore).toBe(9);
  });
});

// ── identifySuccessPatterns ────────────────────────────────

describe("identifySuccessPatterns", () => {
  it("識別高頻標籤（≥minFrequency）", () => {
    const learnings = [
      makeLearning({ tags: ["技術風險", "客戶溝通"] }),
      makeLearning({ tags: ["技術風險", "團隊協作"] }),
      makeLearning({ tags: ["技術風險", "成本控制"] }),
      makeLearning({ tags: ["客戶溝通"] }),
    ];

    const patterns = identifySuccessPatterns(learnings, 3);

    // "技術風險" 出現 3 次，應該被識別
    const techPattern = patterns.find((p) => p.pattern === "技術風險");
    expect(techPattern).toBeDefined();
    expect(techPattern?.frequency).toBe(3);
  });

  it("過濾低頻標籤", () => {
    const learnings = [
      makeLearning({ tags: ["技術風險"] }),
      makeLearning({ tags: ["客戶溝通"] }),
      makeLearning({ tags: ["團隊協作"] }),
    ];

    const patterns = identifySuccessPatterns(learnings, 3);

    // 所有標籤都只出現 1 次，不符合 minFrequency = 3
    expect(patterns).toHaveLength(0);
  });

  it("計算平均分數", () => {
    const learnings = [
      makeLearning({
        tags: ["技術風險"],
        strategyScore: 10,
        executionScore: 9,
        satisfactionScore: 8,
      }),
      makeLearning({
        tags: ["技術風險"],
        strategyScore: 8,
        executionScore: 7,
        satisfactionScore: 6,
      }),
      makeLearning({
        tags: ["技術風險"],
        strategyScore: 6,
        executionScore: 5,
        satisfactionScore: 4,
      }),
    ];

    const patterns = identifySuccessPatterns(learnings, 3);
    const pattern = patterns.find((p) => p.pattern === "技術風險");

    expect(pattern?.avgScores.strategy).toBe(8); // (10 + 8 + 6) / 3 = 8
    expect(pattern?.avgScores.execution).toBe(7); // (9 + 7 + 5) / 3 = 7
    expect(pattern?.avgScores.satisfaction).toBe(6); // (8 + 6 + 4) / 3 = 6
  });

  it("按頻率降序排列", () => {
    const learnings = [
      makeLearning({ tags: ["技術風險", "客戶溝通"] }),
      makeLearning({ tags: ["技術風險", "客戶溝通"] }),
      makeLearning({ tags: ["技術風險", "客戶溝通"] }),
      makeLearning({ tags: ["客戶溝通"] }),
      makeLearning({ tags: ["客戶溝通"] }),
    ];

    const patterns = identifySuccessPatterns(learnings, 3);

    // "技術風險" 出現 3 次，"客戶溝通" 出現 5 次
    expect(patterns[0].pattern).toBe("客戶溝通"); // 頻率最高
    expect(patterns[0].frequency).toBe(5);
  });
});

// ── formatClosingReport ────────────────────────────────────

describe("formatClosingReport", () => {
  it("包含案件標題", () => {
    const learning = makeLearning();
    const report = formatClosingReport(learning);

    expect(report).toContain(`案件：${learning.title}`);
  });

  it("包含所有段落", () => {
    const learning = makeLearning();
    const report = formatClosingReport(learning);

    expect(report).toContain("## 完成項目");
    expect(report).toContain("## 學習重點");
    expect(report).toContain("## 下次注意");
    expect(report).toContain("## 評分");
  });

  it("包含評分資料", () => {
    const learning = makeLearning({
      strategyScore: 8,
      executionScore: 7,
      satisfactionScore: 9,
    });
    const report = formatClosingReport(learning);

    expect(report).toContain("策略評分：8 / 10");
    expect(report).toContain("執行評分：7 / 10");
    expect(report).toContain("滿意度：9 / 10");
  });

  it("包含標籤", () => {
    const learning = makeLearning({ tags: ["技術風險", "客戶溝通"] });
    const report = formatClosingReport(learning);

    expect(report).toContain("標籤：技術風險, 客戶溝通");
  });
});
