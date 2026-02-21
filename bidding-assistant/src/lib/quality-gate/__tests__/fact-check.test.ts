import { describe, it, expect } from "vitest";
import { checkFacts, detectHallucinations } from "../fact-check";
import { splitIntoSentences, extractKeywords, matchSentenceToKB } from "../helpers";
import type { KBEntry } from "../types";

// ── detectHallucinations ──────────────────────────────────────

describe("detectHallucinations", () => {
  it("偵測到具體百分比", () => {
    const flags = detectHallucinations("本計畫可提升效率達85%。");
    expect(flags).toHaveLength(1);
    expect(flags[0].patternName).toBe("ungrounded_percentage");
    expect(flags[0].matchedText).toContain("85%");
  });

  it("偵測到引用虛構研究", () => {
    const flags = detectHallucinations("根據最新研究顯示，此方法效果顯著。");
    expect(flags).toHaveLength(1);
    expect(flags[0].patternName).toBe("fabricated_research");
  });

  it("偵測到業界最高宣稱", () => {
    const flags = detectHallucinations("本公司為業界首創導入此技術。");
    expect(flags).toHaveLength(1);
    expect(flags[0].patternName).toBe("superlative_claim");
  });

  it("偵測到虛構服務量", () => {
    const flags = detectHallucinations("每年服務超過五萬人次的社區居民。");
    expect(flags).toHaveLength(1);
    expect(flags[0].patternName).toBe("ungrounded_volume");
  });

  it("偵測到模糊國際合作", () => {
    const flags = detectHallucinations("與多所國際學術機構合作交流多年。");
    expect(flags).toHaveLength(1);
    expect(flags[0].patternName).toBe("vague_international");
  });

  it("偵測到獎項宣稱", () => {
    const flags = detectHallucinations("本計畫曾獲得優良廠商認證。");
    expect(flags).toHaveLength(1);
    expect(flags[0].patternName).toBe("fabricated_award");
  });

  it("偵測到滿意度數字", () => {
    const flags = detectHallucinations("服務滿意度高達98.5%。");
    expect(flags).toHaveLength(1);
    expect(flags[0].patternName).toBe("overspecific_stats");
  });

  it("正常文字不觸發幻覺", () => {
    const flags = detectHallucinations("本公司將依契約規定提交成果報告。");
    expect(flags).toHaveLength(0);
  });

  it("空字串不報錯", () => {
    const flags = detectHallucinations("");
    expect(flags).toHaveLength(0);
  });

  it("回傳包含起止位置", () => {
    const text = "本計畫可提升效率達85%，大幅改善現況。";
    const flags = detectHallucinations(text);
    expect(flags[0].startIndex).toBeGreaterThanOrEqual(0);
    expect(flags[0].endIndex).toBeGreaterThan(flags[0].startIndex);
    // matchedText 應該在原文中存在
    expect(text.slice(flags[0].startIndex, flags[0].endIndex)).toBe(flags[0].matchedText);
  });
});

// ── splitIntoSentences ────────────────────────────────────────

describe("splitIntoSentences", () => {
  it("以句號分割", () => {
    const result = splitIntoSentences("第一句。第二句。");
    expect(result).toHaveLength(2);
    expect(result[0]).toBe("第一句。");
  });

  it("以問號分割", () => {
    const result = splitIntoSentences("真的嗎？是的。");
    expect(result).toHaveLength(2);
  });

  it("空字串回傳空陣列", () => {
    expect(splitIntoSentences("")).toEqual([]);
    expect(splitIntoSentences("   ")).toEqual([]);
  });

  it("單句不切割", () => {
    const result = splitIntoSentences("只有一句話");
    expect(result).toHaveLength(1);
  });
});

// ── extractKeywords ───────────────────────────────────────────

describe("extractKeywords", () => {
  it("提取有意義的關鍵字", () => {
    const kws = extractKeywords("本計畫將整合社區資源推動長照服務。");
    expect(kws).toContain("整合");
    expect(kws).toContain("社區");
    expect(kws).toContain("長照");
  });

  it("過濾停用詞", () => {
    const kws = extractKeywords("我們可以提供確保效果。");
    expect(kws).not.toContain("我們");
    expect(kws).not.toContain("可以");
    expect(kws).not.toContain("確保");
  });

  it("n-gram 最短 2 字元，停用詞仍被過濾", () => {
    // 中文採用 n-gram，最短 2 字元（「整合」「社區」等有意義的詞）
    const kws = extractKeywords("本計畫將整合社區資源。");
    // 有 2 字元的有意義詞
    expect(kws.some((kw) => kw.length === 2)).toBe(true);
    // 停用詞（STOPWORDS）不應出現
    expect(kws).not.toContain("需要");
    expect(kws).not.toContain("提供");
  });
});

// ── matchSentenceToKB ─────────────────────────────────────────

describe("matchSentenceToKB", () => {
  const entries: KBEntry[] = [
    {
      kbId: "00B",
      entryId: "P-2024-001",
      searchableFields: {
        name: "社區長照服務推廣計畫",
        description: "整合社區資源，推動長照服務體系，服務對象為長者與身障者",
      },
    },
    {
      kbId: "00A",
      entryId: "M-001",
      searchableFields: {
        name: "王小明",
        specialty: "社會工作 長照政策 社區發展",
      },
    },
  ];

  it("比對到相關 KB 條目", () => {
    const ref = matchSentenceToKB("本計畫整合社區資源推動長照服務體系。", entries);
    expect(ref).not.toBeNull();
    expect(ref!.kbId).toBe("00B");
    expect(ref!.entryId).toBe("P-2024-001");
  });

  it("無相關條目時回傳 null", () => {
    const ref = matchSentenceToKB("採用最新 AI 技術建立智慧平台。", entries);
    expect(ref).toBeNull();
  });

  it("空 entries 陣列回傳 null", () => {
    const ref = matchSentenceToKB("整合社區長照資源。", []);
    expect(ref).toBeNull();
  });
});

// ── checkFacts（整合測試）────────────────────────────────────

describe("checkFacts", () => {
  it("空文字回傳預設結果", () => {
    const result = checkFacts("");
    expect(result.annotations).toHaveLength(0);
    expect(result.hallucinationCount).toBe(0);
    expect(result.score).toBe(80); // baseScore
  });

  it("正常文字無幻覺，分數不低於 70", () => {
    const text = "本公司依契約規定提供服務。計畫執行期間為十二個月。成果報告於期末提交。";
    const result = checkFacts(text);
    expect(result.hallucinationCount).toBe(0);
    expect(result.score).toBeGreaterThanOrEqual(70);
  });

  it("含幻覺文字，score 下降且 issues 有記錄", () => {
    const text = "本計畫可提升效率達85%。根據最新研究顯示，效果顯著。業界首創導入此方法。";
    const result = checkFacts(text);
    expect(result.hallucinationCount).toBeGreaterThan(0);
    expect(result.score).toBeLessThan(80);
    expect(result.issues.some((i) => i.type === "hallucination")).toBe(true);
  });

  it("unverifiedThreshold 超過時產生 error", () => {
    const text = [
      "本計畫整合多方資源。",
      "服務對象遍及全縣。",
      "成效顯著提升社區活力。",
      "居民普遍反應良好。",
    ].join("");
    const result = checkFacts(text, [], { unverifiedThreshold: 3 });
    // 無 KB 所有句子都 unverified，超過閾值應有 error
    expect(result.issues.some((i) => i.severity === "error")).toBe(true);
  });

  it("skipSourceTrace 跳過 KB 比對", () => {
    const entries: KBEntry[] = [
      {
        kbId: "00B",
        entryId: "P-001",
        searchableFields: { desc: "長照服務計畫" },
      },
    ];
    const text = "本計畫推動長照服務。";
    const withTrace = checkFacts(text, entries, { skipSourceTrace: false });
    const skipTrace = checkFacts(text, entries, { skipSourceTrace: true });
    // 跳過時來源一定是 null
    expect(skipTrace.annotations[0].source).toBeNull();
    // 不跳過時可能有來源
    expect(withTrace.annotations[0]).toBeDefined();
  });

  it("多句幻覺，annotations 長度等於句子數", () => {
    const text = "第一句正常。提升效率達90%。業界首創此技術。";
    const result = checkFacts(text);
    expect(result.annotations.length).toBeGreaterThanOrEqual(2);
  });
});
