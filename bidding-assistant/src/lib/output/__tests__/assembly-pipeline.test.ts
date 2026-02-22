import { describe, it, expect } from "vitest";
import {
  countChars,
  detectWarnings,
  collectKbRefs,
  assembleDocument,
} from "../assembly-pipeline";
import type { ChapterSource } from "../types";

// ── countChars ────────────────────────────────────────────────

describe("countChars", () => {
  it("計算一般字串長度", () => {
    expect(countChars("hello world")).toBe(11);
  });

  it("忽略前後空白", () => {
    expect(countChars("  hello  ")).toBe(5);
  });

  it("空字串回傳 0", () => {
    expect(countChars("")).toBe(0);
    expect(countChars("   ")).toBe(0);
  });

  it("計算中文字元", () => {
    expect(countChars("你好世界")).toBe(4);
  });
});

// ── detectWarnings ────────────────────────────────────────────

describe("detectWarnings", () => {
  const makeChapter = (overrides: Partial<ChapterSource> = {}): ChapterSource => ({
    title: "測試章節",
    content: "這是一段測試內容。".repeat(30), // ~270 字
    ...overrides,
  });

  it("空章節回傳 empty_chapter 警告", () => {
    const chapters: ChapterSource[] = [makeChapter({ content: "" })];
    const warnings = detectWarnings(chapters);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].type).toBe("empty_chapter");
    expect(warnings[0].chapter).toBe(0);
  });

  it("字數偏少回傳 empty_chapter 警告（但不重複）", () => {
    const chapters: ChapterSource[] = [makeChapter({ content: "短文" })];
    const warnings = detectWarnings(chapters);
    // 短文：2 字 < 200，回傳 1 個 empty_chapter
    expect(warnings.length).toBeGreaterThanOrEqual(1);
    expect(warnings.some((w) => w.type === "empty_chapter")).toBe(true);
  });

  it("正常章節無警告", () => {
    const content = "這是足夠長的章節內容。".repeat(25); // ~275 字
    const chapters: ChapterSource[] = [makeChapter({ content })];
    const warnings = detectWarnings(chapters);
    expect(warnings).toHaveLength(0);
  });

  it("字數過多回傳 long_chapter 警告", () => {
    const longContent = "a".repeat(8001);
    const chapters: ChapterSource[] = [makeChapter({ content: longContent })];
    const warnings = detectWarnings(chapters);
    expect(warnings.some((w) => w.type === "long_chapter")).toBe(true);
  });

  it("多個章節各自偵測", () => {
    const chapters: ChapterSource[] = [
      makeChapter({ content: "" }),
      makeChapter({ content: "正常內容。".repeat(60) }),
      makeChapter({ content: "" }),
    ];
    const warnings = detectWarnings(chapters);
    const emptyWarnings = warnings.filter((w) => w.type === "empty_chapter");
    expect(emptyWarnings.length).toBeGreaterThanOrEqual(2);
    expect(emptyWarnings.map((w) => w.chapter)).toContain(0);
    expect(emptyWarnings.map((w) => w.chapter)).toContain(2);
  });

  it("重複內容跨章節偵測", () => {
    const repeatedParagraph =
      "本公司具備豐富的政府採購執行經驗，擁有完整的品質管理系統，並通過相關認證。過去十年間承接超過五十件政府標案，累積完整的跨領域整合能力。";
    const chapterContent = `${repeatedParagraph}\n\n其他段落 ${Math.random()}`;
    const chapters: ChapterSource[] = [
      makeChapter({ content: chapterContent }),
      makeChapter({ content: chapterContent }),
    ];
    const warnings = detectWarnings(chapters);
    expect(warnings.some((w) => w.type === "duplicate_content")).toBe(true);
  });
});

// ── collectKbRefs ─────────────────────────────────────────────

describe("collectKbRefs", () => {
  it("收集不重複的知識庫引用", () => {
    const chapters: ChapterSource[] = [
      { title: "ch1", content: "", kbRefs: ["00A", "00B"] },
      { title: "ch2", content: "", kbRefs: ["00B", "00C"] },
    ];
    expect(collectKbRefs(chapters)).toEqual(["00A", "00B", "00C"]);
  });

  it("沒有引用時回傳空陣列", () => {
    const chapters: ChapterSource[] = [
      { title: "ch1", content: "" },
    ];
    expect(collectKbRefs(chapters)).toEqual([]);
  });

  it("結果依字母排序", () => {
    const chapters: ChapterSource[] = [
      { title: "ch1", content: "", kbRefs: ["00C", "00A", "00B"] },
    ];
    expect(collectKbRefs(chapters)).toEqual(["00A", "00B", "00C"]);
  });
});

// ── assembleDocument ──────────────────────────────────────────

describe("assembleDocument", () => {
  const chapters: ChapterSource[] = [
    { title: "第一章", content: "內容A。".repeat(50), kbRefs: ["00A"] },
    { title: "第二章", content: "內容B。".repeat(50), kbRefs: ["00B"] },
  ];

  it("正確組裝章節", () => {
    const result = assembleDocument(chapters, "測試案件");
    expect(result.chapters).toHaveLength(2);
    expect(result.chapters[0].title).toBe("第一章");
    expect(result.chapters[1].title).toBe("第二章");
  });

  it("metadata 正確", () => {
    const result = assembleDocument(chapters, "測試案件");
    expect(result.metadata.projectName).toBe("測試案件");
    expect(result.metadata.chapterCount).toBe(2);
    expect(result.metadata.kbRefsUsed).toContain("00A");
    expect(result.metadata.kbRefsUsed).toContain("00B");
    expect(result.metadata.totalChars).toBeGreaterThan(0);
    expect(result.metadata.assembledAt).toBeTruthy();
  });

  it("空章節清單組裝不報錯", () => {
    const result = assembleDocument([], "空案件");
    expect(result.chapters).toHaveLength(0);
    expect(result.metadata.totalChars).toBe(0);
  });

  it("警告正確傳遞", () => {
    const chaptersWithEmpty: ChapterSource[] = [
      { title: "空章節", content: "" },
      { title: "正常章節", content: "內容。".repeat(50) },
    ];
    const result = assembleDocument(chaptersWithEmpty, "測試");
    expect(result.warnings.some((w) => w.type === "empty_chapter")).toBe(true);
  });
});
