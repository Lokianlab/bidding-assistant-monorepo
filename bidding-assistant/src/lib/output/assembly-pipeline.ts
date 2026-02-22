import type {
  ChapterSource,
  AssemblyResult,
  AssemblyWarning,
  ChapterInput,
} from "./types";
import {
  CHAPTER_MIN_CHARS,
  CHAPTER_MAX_CHARS,
  DUPLICATE_CONTENT_THRESHOLD,
  MIN_PARAGRAPH_LENGTH_FOR_DEDUP,
} from "./constants";

// ── 純函式：字數計算 ──────────────────────────────────────────

export function countChars(content: string): number {
  return content.trim().length;
}

// ── 純函式：警告偵測 ──────────────────────────────────────────

export function detectWarnings(chapters: ChapterSource[]): AssemblyWarning[] {
  const warnings: AssemblyWarning[] = [];

  for (let i = 0; i < chapters.length; i++) {
    const chapter = chapters[i];
    const chars = countChars(chapter.content);

    // 空章節
    if (chars === 0) {
      warnings.push({
        type: "empty_chapter",
        chapter: i,
        message: `第 ${i + 1} 章「${chapter.title}」內容為空`,
      });
      continue; // 空章節不做其他檢查
    }

    // 字數偏少
    if (chars < CHAPTER_MIN_CHARS) {
      warnings.push({
        type: "empty_chapter",
        chapter: i,
        message: `第 ${i + 1} 章「${chapter.title}」字數偏少（${chars} 字，建議至少 ${CHAPTER_MIN_CHARS} 字）`,
      });
    }

    // 章節過長
    if (chars > CHAPTER_MAX_CHARS) {
      warnings.push({
        type: "long_chapter",
        chapter: i,
        message: `第 ${i + 1} 章「${chapter.title}」字數過多（${chars} 字，建議不超過 ${CHAPTER_MAX_CHARS} 字）`,
      });
    }
  }

  // 重複內容偵測（跨章節比對段落）
  const duplicateWarnings = detectDuplicateContent(chapters);
  warnings.push(...duplicateWarnings);

  return warnings;
}

/** 提取章節中的長段落（用於重複偵測） */
function extractParagraphs(content: string): string[] {
  return content
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length >= MIN_PARAGRAPH_LENGTH_FOR_DEDUP);
}

/** 計算兩個文字字串的相似度（0-1） */
function similarity(a: string, b: string): number {
  if (a === b) return 1;
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  if (longer.length === 0) return 1;
  const matchLen = longer.length - editDistance(longer, shorter);
  return matchLen / longer.length;
}

/** Levenshtein 距離（僅對較短文本有效率） */
function editDistance(a: string, b: string): number {
  // 對長文本只取前 200 字元做比較以提升效能
  const maxLen = 200;
  const s1 = a.slice(0, maxLen);
  const s2 = b.slice(0, maxLen);
  const dp: number[][] = Array.from({ length: s1.length + 1 }, (_, i) =>
    Array.from({ length: s2.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      dp[i][j] =
        s1[i - 1] === s2[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[s1.length][s2.length];
}

function detectDuplicateContent(chapters: ChapterSource[]): AssemblyWarning[] {
  const warnings: AssemblyWarning[] = [];
  const paragraphsByChapter = chapters.map((c) => extractParagraphs(c.content));

  for (let i = 0; i < paragraphsByChapter.length; i++) {
    for (let j = i + 1; j < paragraphsByChapter.length; j++) {
      const pA = paragraphsByChapter[i];
      const pB = paragraphsByChapter[j];
      const matchCount = pA.filter((pa) =>
        pB.some((pb) => similarity(pa, pb) >= DUPLICATE_CONTENT_THRESHOLD)
      ).length;

      if (matchCount > 0 && pA.length > 0) {
        const ratio = matchCount / pA.length;
        if (ratio >= 0.3) {
          warnings.push({
            type: "duplicate_content",
            chapter: i,
            message: `第 ${i + 1} 章與第 ${j + 1} 章有 ${matchCount} 段相似內容，請確認是否重複`,
          });
        }
      }
    }
  }

  return warnings;
}

// ── 純函式：收集知識庫引用 ───────────────────────────────────

export function collectKbRefs(chapters: ChapterSource[]): string[] {
  const refs = new Set<string>();
  for (const chapter of chapters) {
    for (const ref of chapter.kbRefs ?? []) {
      refs.add(ref);
    }
  }
  return Array.from(refs).sort();
}

// ── 核心：文件組裝管線 ────────────────────────────────────────

export function assembleDocument(
  chapters: ChapterSource[],
  projectName: string
): AssemblyResult {
  const warnings = detectWarnings(chapters);
  const kbRefsUsed = collectKbRefs(chapters);
  const totalChars = chapters.reduce((sum, c) => sum + countChars(c.content), 0);

  const chapterInputs: ChapterInput[] = chapters.map((c) => ({
    title: c.title,
    content: c.content,
  }));

  return {
    chapters: chapterInputs,
    metadata: {
      projectName,
      totalChars,
      chapterCount: chapters.length,
      kbRefsUsed,
      assembledAt: new Date().toISOString(),
    },
    warnings,
  };
}
