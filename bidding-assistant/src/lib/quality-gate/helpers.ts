/** M04 品質閘門 — 輔助函式 */

import { SOURCE_MATCH_MIN_LENGTH } from "./constants";
import type { KBEntry, KBSourceRef } from "./types";

/**
 * 將文字切割成句子陣列。
 * 按中文句尾標點（。！？）和英文句點切割。
 */
export function splitIntoSentences(text: string): string[] {
  if (!text.trim()) return [];
  const parts = text
    .split(/(?<=[。！？.!?])\s*/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return parts;
}

/**
 * 從句子中提取中文詞組（n-gram 方式）用於 KB 比對。
 * 中文沒有空格分詞，改為提取 2-4 字元的連續子串。
 *
 * @remarks Phase 2 預留：目前 matchSentenceToKB 改用 LCS 直接比對，此函式尚未接入生產路徑。
 */
export function extractKeywords(sentence: string): string[] {
  // 移除標點符號
  const cleaned = sentence.replace(
    /[，。！？、「」『』【】《》〈〉…—\-_:：;；,!?."'()（）\s]/g,
    "",
  );

  const keywords = new Set<string>();

  // 提取 2-4 字元 n-gram（長度由 n 保證 ≥ 2，不需再過濾）
  for (let n = 2; n <= 4; n++) {
    for (let i = 0; i <= cleaned.length - n; i++) {
      const gram = cleaned.slice(i, i + n);
      if (!STOPWORDS.has(gram)) {
        keywords.add(gram);
      }
    }
  }

  return Array.from(keywords);
}

/**
 * 比對句子和 KB 條目，回傳最佳匹配的來源引用或 null。
 * 使用雙向包含比對：KB 內容含有句子片段 or 句子含有 KB 內容片段。
 */
export function matchSentenceToKB(
  sentence: string,
  entries: KBEntry[],
): KBSourceRef | null {
  if (!entries.length) return null;

  // 清理句子（移除標點）
  const cleanedSentence = sentence.replace(/[，。！？、「」『』【】《》\s]/g, "");
  if (cleanedSentence.length < SOURCE_MATCH_MIN_LENGTH) return null;

  let bestMatch: { ref: KBSourceRef; score: number } | null = null;

  for (const entry of entries) {
    for (const [field, content] of Object.entries(entry.searchableFields)) {
      if (!content) continue;
      const cleanedContent = content.replace(/[，。！？、「」『』【】《》\s]/g, "");

      // 計算最長公共子串長度作為相似度
      const lcsLen = longestCommonSubstringLength(cleanedSentence, cleanedContent);
      const score =
        lcsLen / Math.min(cleanedSentence.length, cleanedContent.length);

      // 最長公共子串 ≥ 4 字元且覆蓋率 ≥ 30% 才算匹配
      if (lcsLen >= 4 && score >= 0.3 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = {
          score,
          ref: {
            kbId: entry.kbId,
            entryId: entry.entryId,
            field,
            matchedText: getMatchedText(cleanedSentence, cleanedContent, lcsLen),
          },
        };
      }
    }
  }

  return bestMatch?.ref ?? null;
}

// ── 私有輔助 ────────────────────────────────────────────

/**
 * 計算兩個字串的最長公共子串長度（sliding window）。
 */
function longestCommonSubstringLength(a: string, b: string): number {
  if (!a || !b) return 0;
  let maxLen = 0;
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b.length; j++) {
      let len = 0;
      while (i + len < a.length && j + len < b.length && a[i + len] === b[j + len]) {
        len++;
      }
      if (len > maxLen) maxLen = len;
    }
  }
  return maxLen;
}

/**
 * 從兩個字串找到最長公共子串並回傳（最多 10 字元）。
 */
function getMatchedText(a: string, b: string, maxLen: number): string {
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b.length; j++) {
      let len = 0;
      while (i + len < a.length && j + len < b.length && a[i + len] === b[j + len]) {
        len++;
      }
      if (len === maxLen) {
        return a.slice(i, i + Math.min(len, 10));
      }
    }
  }
  return "";
}

/** 中文常見停用詞（不用來比對） */
const STOPWORDS = new Set([
  "我們", "他們", "這個", "那個", "一個", "這些", "那些",
  "因此", "所以", "然而", "但是", "而且", "以及", "如果",
  "可以", "能夠", "應該", "需要", "進行", "提供", "採用",
  "相關", "包括", "具有", "透過", "針對", "有效", "確保",
]);
