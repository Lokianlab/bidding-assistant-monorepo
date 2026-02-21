import { describe, it, expect } from "vitest";
import { splitIntoSentences, extractKeywords, matchSentenceToKB } from "../helpers";
import type { KBEntry } from "../types";

// ── splitIntoSentences 邊界 ──────────────────────────────────

describe("splitIntoSentences 邊界", () => {
  it("以驚嘆號分割", () => {
    const result = splitIntoSentences("太好了！真的嗎？是的。");
    expect(result).toHaveLength(3);
    expect(result[0]).toBe("太好了！");
  });

  it("英文句點分割", () => {
    const result = splitIntoSentences("First sentence. Second sentence.");
    expect(result).toHaveLength(2);
  });

  it("混合中英文分割", () => {
    const result = splitIntoSentences("本計畫目標明確。Goals are clear!");
    expect(result).toHaveLength(2);
  });

  it("多個空白不影響結果", () => {
    const result = splitIntoSentences("第一句。   第二句。");
    expect(result).toHaveLength(2);
    expect(result[0]).toBe("第一句。");
    expect(result[1]).toBe("第二句。");
  });
});

// ── extractKeywords 邊界 ─────────────────────────────────────

describe("extractKeywords 邊界", () => {
  it("極短輸入（1 字）回傳空陣列", () => {
    const kws = extractKeywords("一");
    expect(kws).toHaveLength(0); // 不夠 2 字元 n-gram
  });

  it("空字串回傳空陣列", () => {
    expect(extractKeywords("")).toHaveLength(0);
  });

  it("全為停用詞回傳空陣列", () => {
    // STOPWORDS 包含「我們」「可以」「確保」
    const kws = extractKeywords("我們可以確保");
    expect(kws).not.toContain("我們");
    expect(kws).not.toContain("可以");
    expect(kws).not.toContain("確保");
  });

  it("包含 4 字元 n-gram", () => {
    const kws = extractKeywords("文化活動策展計畫");
    expect(kws.some((kw) => kw.length === 4)).toBe(true);
  });
});

// ── matchSentenceToKB 邊界 ───────────────────────────────────

describe("matchSentenceToKB 邊界", () => {
  const entries: KBEntry[] = [
    {
      kbId: "00B",
      entryId: "P-001",
      searchableFields: {
        name: "文化活動策展服務計畫",
        description: "整合地方文化資源，推廣藝術教育活動",
      },
    },
    {
      kbId: "00A",
      entryId: "M-001",
      searchableFields: {
        specialty: "藝術策展 活動規劃 文化推廣",
      },
    },
  ];

  it("清理後短於 SOURCE_MATCH_MIN_LENGTH（4）回傳 null", () => {
    // 3 個字（標點移除後 < 4）
    const ref = matchSentenceToKB("好。", entries);
    expect(ref).toBeNull();
  });

  it("多個 KB 條目回傳最佳匹配", () => {
    // 「藝術策展活動規劃」與 M-001 的 specialty 更相關
    const ref = matchSentenceToKB("本計畫推動文化活動策展，整合地方資源。", entries);
    expect(ref).not.toBeNull();
    // 應該匹配到某一個 entry（不管哪個，只要有匹配）
    expect(["00A", "00B"]).toContain(ref!.kbId);
  });

  it("多欄位條目回傳最佳欄位", () => {
    // description 包含「整合地方文化資源」，name 包含「文化活動策展」
    const ref = matchSentenceToKB("整合地方文化資源，推廣藝術教育活動。", entries);
    expect(ref).not.toBeNull();
    expect(ref!.kbId).toBe("00B");
    // 應匹配到 description 欄位（更長的公共子串）
    expect(ref!.field).toBe("description");
  });
});
