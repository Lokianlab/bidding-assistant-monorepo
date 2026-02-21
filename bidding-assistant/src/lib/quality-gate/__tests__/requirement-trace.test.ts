import { describe, it, expect } from "vitest";
import {
  traceRequirements,
  splitIntoParagraphs,
  extractRequirementKeywords,
} from "../requirement-trace";
import type { Requirement } from "../types";

// ── splitIntoParagraphs ─────────────────────────────────

describe("splitIntoParagraphs", () => {
  it("按換行分割段落", () => {
    const text = "第一段內容。\n\n第二段內容。\n第三段內容。";
    const result = splitIntoParagraphs(text);
    expect(result).toHaveLength(3);
  });

  it("空字串回傳空陣列", () => {
    expect(splitIntoParagraphs("")).toEqual([]);
    expect(splitIntoParagraphs("   ")).toEqual([]);
  });

  it("去除前後空白", () => {
    const result = splitIntoParagraphs("  段落一  \n  段落二  ");
    expect(result[0]).toBe("段落一");
    expect(result[1]).toBe("段落二");
  });

  it("過濾空行", () => {
    const result = splitIntoParagraphs("段落一\n\n\n\n段落二");
    expect(result).toHaveLength(2);
  });
});

// ── extractRequirementKeywords ──────────────────────────

describe("extractRequirementKeywords", () => {
  it("提取有意義的關鍵詞", () => {
    const kws = extractRequirementKeywords("提出社區長照服務推動計畫");
    expect(kws).toContain("社區");
    expect(kws).toContain("長照");
    expect(kws).toContain("服務");
  });

  it("過濾停用詞", () => {
    const kws = extractRequirementKeywords("應該提供相關服務方式");
    expect(kws).not.toContain("應該");
    expect(kws).not.toContain("提供");
    expect(kws).not.toContain("相關");
  });

  it("空描述回傳空陣列", () => {
    expect(extractRequirementKeywords("")).toEqual([]);
  });

  it("純標點回傳空陣列", () => {
    expect(extractRequirementKeywords("，。！？")).toEqual([]);
  });
});

// ── traceRequirements ───────────────────────────────────

describe("traceRequirements", () => {
  const sampleRequirements: Requirement[] = [
    {
      id: "R-01",
      source: "評分項目第1條",
      description: "社區長照服務推動計畫與執行策略",
      weight: 30,
      category: "評分",
    },
    {
      id: "R-02",
      source: "評分項目第2條",
      description: "團隊專業人力配置及分工說明",
      weight: 20,
      category: "評分",
    },
    {
      id: "R-03",
      source: "資格條件",
      description: "最近三年內曾執行類似案件之實績證明",
      weight: null,
      category: "資格",
    },
  ];

  it("完整覆蓋時覆蓋率接近 100%", () => {
    const text = [
      "本社區長照服務推動計畫的執行策略如下：第一階段進行需求調查。",
      "團隊專業人力配置方面，本公司安排五名專業人員，分工如下。",
      "最近三年內曾執行多項類似案件，以下為實績證明。",
    ].join("\n");

    const result = traceRequirements(text, sampleRequirements);
    expect(result.matrix.coverageRate).toBeGreaterThan(70);
    expect(result.score).toBeGreaterThan(70);
  });

  it("部分覆蓋時產生 partial 和 warning", () => {
    const text = "本計畫針對社區長照進行規劃。\n本公司具有豐富經驗。";
    const result = traceRequirements(text, sampleRequirements);

    const hasPartial = result.matrix.coverage.some((c) => c.status === "partial");
    const hasMissing = result.matrix.coverage.some((c) => c.status === "missing");
    // 不是全部都 covered
    expect(hasPartial || hasMissing).toBe(true);
  });

  it("完全不覆蓋時 score 為 0，有 low_coverage error", () => {
    const text = "天氣真好，今天去公園散步。";
    const result = traceRequirements(text, sampleRequirements);

    expect(result.matrix.uncoveredCount).toBe(3);
    expect(result.score).toBe(0);
    expect(result.issues.some((i) => i.type === "low_coverage")).toBe(true);
  });

  it("空需求清單回傳 score 100", () => {
    const result = traceRequirements("任意文字", []);
    expect(result.score).toBe(100);
    expect(result.matrix.requirements).toHaveLength(0);
  });

  it("空文字全部為 missing", () => {
    const result = traceRequirements("", sampleRequirements);
    expect(result.matrix.coverage.every((c) => c.status === "missing")).toBe(true);
  });

  it("高權重未覆蓋需求產生 error 而非 warning", () => {
    const highWeightReq: Requirement[] = [
      {
        id: "R-10",
        source: "評分項目第1條",
        description: "創新服務模式設計與效益評估",
        weight: 30,
        category: "評分",
      },
    ];
    const text = "本公司成立多年，員工約二十人。";
    const result = traceRequirements(text, highWeightReq);

    expect(result.issues.some((i) => i.severity === "error" && i.type === "missing_requirement")).toBe(true);
  });

  it("低權重未覆蓋需求產生 warning", () => {
    const lowWeightReq: Requirement[] = [
      {
        id: "R-11",
        source: "格式規定",
        description: "封面須含公司全名及統一編號",
        weight: 5,
        category: "格式",
      },
    ];
    const text = "本公司成立多年。";
    const result = traceRequirements(text, lowWeightReq);

    const missingIssue = result.issues.find((i) => i.type === "missing_requirement");
    expect(missingIssue?.severity).toBe("warning");
  });

  it("有權重時按權重加權計算分數", () => {
    const reqs: Requirement[] = [
      { id: "R-A", source: "評分", description: "社區長照服務計畫", weight: 70, category: "評分" },
      { id: "R-B", source: "評分", description: "國際交流合作方案", weight: 30, category: "評分" },
    ];
    // 只覆蓋 R-A（權重 70），不覆蓋 R-B（權重 30）
    const text = "本社區長照服務計畫將推動全面照護體系。";
    const result = traceRequirements(text, reqs);

    // 分數應接近 70（而不是 50%）
    expect(result.score).toBeGreaterThan(50);
  });

  it("無權重時等權計算", () => {
    const reqs: Requirement[] = [
      { id: "R-X", source: "格式", description: "社區長照服務計畫", weight: null, category: "格式" },
      { id: "R-Y", source: "格式", description: "國際交流合作方案", weight: null, category: "格式" },
    ];
    const text = "本社區長照服務計畫將推動全面照護體系。";
    const result = traceRequirements(text, reqs);

    // 覆蓋一半，分數接近 50
    expect(result.score).toBeGreaterThanOrEqual(30);
    expect(result.score).toBeLessThanOrEqual(70);
  });

  it("coverageThreshold 可調", () => {
    const reqs: Requirement[] = [
      { id: "R-T", source: "評分", description: "社區長照服務推動策略與執行方案", weight: null, category: "評分" },
    ];
    const text = "簡單提到社區服務。";

    // 高門檻 → 較難 covered
    const strictResult = traceRequirements(text, reqs, { coverageThreshold: 0.8 });
    // 低門檻 → 較容易 covered
    const looseResult = traceRequirements(text, reqs, { coverageThreshold: 0.1 });

    expect(looseResult.score).toBeGreaterThanOrEqual(strictResult.score);
  });

  it("coveredBy 欄位包含匹配段落摘要", () => {
    const reqs: Requirement[] = [
      { id: "R-C", source: "評分", description: "社區長照服務推動計畫", weight: null, category: "評分" },
    ];
    const text = "本社區長照服務推動計畫包含三個階段。";
    const result = traceRequirements(text, reqs);

    const covered = result.matrix.coverage[0];
    if (covered.status !== "missing") {
      expect(covered.coveredBy.length).toBeGreaterThan(0);
      expect(covered.coveredBy[0].length).toBeLessThanOrEqual(50);
    }
  });
});
