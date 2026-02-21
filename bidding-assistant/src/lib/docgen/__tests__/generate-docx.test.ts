import { describe, it, expect } from "vitest";
import {
  generateDocx,
  parseTableRow,
  parseInlineFormatting,
  resolveTemplate,
  isTableSeparator,
  isTableRow,
  sanitizeFilename,
  type GenerateDocxOptions,
} from "../generate-docx";
import type { DocumentSettings, CompanySettings } from "@/lib/settings/types";

const defaultDocSettings: DocumentSettings = {
  fonts: {
    body: "標楷體",
    heading: "標楷體",
    headerFooter: "標楷體",
    customFonts: [],
  },
  fontSize: { body: 12, h1: 18, h2: 16, h3: 14, h4: 13 },
  page: {
    size: "A4",
    margins: { top: 1, bottom: 1, left: 1, right: 1 },
    lineSpacing: 1.5,
    paragraphSpacing: { before: 0, after: 6 },
  },
  header: { template: "{{案名}} — {{章節名}}" },
  footer: { template: "{{公司名}} | 第 {{頁碼}} 頁" },
  driveNamingRule: "",
};

const defaultCompanySettings: CompanySettings = {
  name: "測試公司",
  taxId: "12345678",
  brand: "測試",
};

function makeOptions(
  overrides?: Partial<GenerateDocxOptions>
): GenerateDocxOptions {
  return {
    projectName: "測試標案",
    chapters: [
      { title: "第壹章 計畫緣起", content: "這是第一章的內容。" },
      { title: "第貳章 工作方法", content: "這是第二章的內容。\n\n第二段落。" },
    ],
    documentSettings: defaultDocSettings,
    companySettings: defaultCompanySettings,
    ...overrides,
  };
}

// ── resolveTemplate ─────────────────────────────────────────

describe("resolveTemplate", () => {
  it("replaces single variable", () => {
    expect(resolveTemplate("Hello {{name}}", { name: "World" })).toBe(
      "Hello World"
    );
  });

  it("replaces multiple variables", () => {
    expect(
      resolveTemplate("{{案名}} — {{章節名}}", {
        案名: "水利工程",
        章節名: "計畫緣起",
      })
    ).toBe("水利工程 — 計畫緣起");
  });

  it("replaces repeated occurrences", () => {
    expect(
      resolveTemplate("{{x}} and {{x}}", { x: "A" })
    ).toBe("A and A");
  });

  it("leaves unmatched placeholders intact", () => {
    expect(resolveTemplate("{{案名}} {{unknown}}", { 案名: "test" })).toBe(
      "test {{unknown}}"
    );
  });

  it("returns template unchanged when no vars provided", () => {
    expect(resolveTemplate("no vars here", {})).toBe("no vars here");
  });

  it("handles empty template", () => {
    expect(resolveTemplate("", { x: "y" })).toBe("");
  });
});

// ── isTableSeparator ────────────────────────────────────────

describe("isTableSeparator", () => {
  it("recognizes standard separator", () => {
    expect(isTableSeparator("|---|---|")).toBe(true);
  });

  it("recognizes separator with alignment colons", () => {
    expect(isTableSeparator("|:---:|---:|:---|")).toBe(true);
  });

  it("recognizes separator with spaces", () => {
    expect(isTableSeparator("| --- | --- |")).toBe(true);
  });

  it("recognizes long dashes", () => {
    expect(isTableSeparator("|------|------|------|")).toBe(true);
  });

  it("rejects data row", () => {
    expect(isTableSeparator("| abc | def |")).toBe(false);
  });

  it("rejects non-table text", () => {
    expect(isTableSeparator("just text")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isTableSeparator("")).toBe(false);
  });

  it("handles leading/trailing whitespace", () => {
    expect(isTableSeparator("  |---|---|  ")).toBe(true);
  });
});

// ── isTableRow ──────────────────────────────────────────────

describe("isTableRow", () => {
  it("recognizes standard row", () => {
    expect(isTableRow("| a | b |")).toBe(true);
  });

  it("rejects no leading pipe", () => {
    expect(isTableRow("a | b |")).toBe(false);
  });

  it("rejects no trailing pipe", () => {
    expect(isTableRow("| a | b")).toBe(false);
  });

  it("recognizes single-column row", () => {
    expect(isTableRow("| only |")).toBe(true);
  });

  it("rejects empty string", () => {
    expect(isTableRow("")).toBe(false);
  });

  it("rejects plain text", () => {
    expect(isTableRow("no pipes here")).toBe(false);
  });

  it("handles whitespace around pipes", () => {
    expect(isTableRow("  | a | b |  ")).toBe(true);
  });

  it("also matches separator lines (they are rows too)", () => {
    expect(isTableRow("|---|---|")).toBe(true);
  });
});

// ── parseTableRow ───────────────────────────────────────────

describe("parseTableRow", () => {
  it("解析基本表格行", () => {
    expect(parseTableRow("| 欄位一 | 欄位二 | 欄位三 |")).toEqual([
      "欄位一",
      "欄位二",
      "欄位三",
    ]);
  });

  it("處理空白 cell", () => {
    expect(parseTableRow("| 有值 |  | 有值 |")).toEqual(["有值", "", "有值"]);
  });

  it("修剪 cell 前後空白", () => {
    expect(parseTableRow("|  空白多  |正常|")).toEqual(["空白多", "正常"]);
  });

  it("parses single column", () => {
    expect(parseTableRow("| only |")).toEqual(["only"]);
  });

  it("parses many columns", () => {
    expect(parseTableRow("| a | b | c | d | e |")).toEqual([
      "a",
      "b",
      "c",
      "d",
      "e",
    ]);
  });
});

// ── generateDocx ────────────────────────────────────────────

describe("generateDocx", () => {
  it("產出有效的 Blob 且 MIME 類型正確", async () => {
    const blob = await generateDocx(makeOptions());
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
  });

  it("Blob 大小大於零", async () => {
    const blob = await generateDocx(makeOptions());
    expect(blob.size).toBeGreaterThan(0);
  });

  it("單章節正常生成", async () => {
    const blob = await generateDocx(
      makeOptions({
        chapters: [{ title: "唯一章節", content: "內容" }],
      })
    );
    expect(blob.size).toBeGreaterThan(0);
  });

  it("多章節正常生成", async () => {
    const blob = await generateDocx(
      makeOptions({
        chapters: [
          { title: "章一", content: "內容一" },
          { title: "章二", content: "內容二" },
          { title: "章三", content: "內容三" },
          { title: "章四", content: "內容四" },
          { title: "章五", content: "內容五" },
        ],
      })
    );
    expect(blob.size).toBeGreaterThan(0);
  });

  it("空內容章節仍可生成（只有標題）", async () => {
    const blob = await generateDocx(
      makeOptions({
        chapters: [{ title: "空章節", content: "" }],
      })
    );
    expect(blob.size).toBeGreaterThan(0);
  });

  it("多段落內容正確分段", async () => {
    const blob = await generateDocx(
      makeOptions({
        chapters: [
          {
            title: "多段落",
            content: "第一段\n\n第二段\n\n第三段",
          },
        ],
      })
    );
    expect(blob.size).toBeGreaterThan(0);
  });

  it("Letter 紙張尺寸正常生成", async () => {
    const blob = await generateDocx(
      makeOptions({
        documentSettings: {
          ...defaultDocSettings,
          page: { ...defaultDocSettings.page, size: "Letter" },
        },
      })
    );
    expect(blob.size).toBeGreaterThan(0);
  });

  it("自訂紙張尺寸正常生成", async () => {
    const blob = await generateDocx(
      makeOptions({
        documentSettings: {
          ...defaultDocSettings,
          page: {
            ...defaultDocSettings.page,
            size: "custom",
            customWidth: 200,
            customHeight: 280,
          },
        },
      })
    );
    expect(blob.size).toBeGreaterThan(0);
  });

  it("自訂紙張與 A4 尺寸相近時 blob 大小也相近", async () => {
    const a4Blob = await generateDocx(makeOptions());
    const customBlob = await generateDocx(
      makeOptions({
        documentSettings: {
          ...defaultDocSettings,
          page: {
            ...defaultDocSettings.page,
            size: "custom",
            customWidth: 210,
            customHeight: 297,
          },
        },
      })
    );
    const ratio = customBlob.size / a4Blob.size;
    expect(ratio).toBeGreaterThan(0.8);
    expect(ratio).toBeLessThan(1.2);
  });

  it("頁首不含頁碼佔位符時正常生成", async () => {
    const blob = await generateDocx(
      makeOptions({
        documentSettings: {
          ...defaultDocSettings,
          footer: { template: "僅文字頁尾" },
        },
      })
    );
    expect(blob.size).toBeGreaterThan(0);
  });

  it("中文特殊字元不破壞生成", async () => {
    const blob = await generateDocx(
      makeOptions({
        projectName: "「特殊」（字元）【測試】",
        chapters: [
          {
            title: "第壹章 ——破折號",
            content: "含有『引號』、「括弧」、——破折號、……省略號。",
          },
        ],
      })
    );
    expect(blob.size).toBeGreaterThan(0);
  });

  it("長文本不崩潰", async () => {
    const longContent = "這是一段測試文字。".repeat(1000);
    const blob = await generateDocx(
      makeOptions({
        chapters: [{ title: "長文章節", content: longContent }],
      })
    );
    expect(blob.size).toBeGreaterThan(0);
  });
});

// ── generateDocx — 相對大小比較 ─────────────────────────────

describe("generateDocx — relative size", () => {
  it("5 章節比 1 章節大", async () => {
    const oneChapter = await generateDocx(
      makeOptions({
        chapters: [{ title: "章一", content: "一段內容" }],
      })
    );
    const fiveChapters = await generateDocx(
      makeOptions({
        chapters: Array.from({ length: 5 }, (_, i) => ({
          title: `章${i + 1}`,
          content: `第${i + 1}章的一段內容`,
        })),
      })
    );
    expect(fiveChapters.size).toBeGreaterThan(oneChapter.size);
  });

  it("長內容比短內容大", async () => {
    const short = await generateDocx(
      makeOptions({
        chapters: [{ title: "短", content: "一句話" }],
      })
    );
    const long = await generateDocx(
      makeOptions({
        chapters: [
          {
            title: "長",
            content: "這是一段比較長的測試文字。".repeat(100),
          },
        ],
      })
    );
    expect(long.size).toBeGreaterThan(short.size);
  });
});

// ── generateDocx — 邊界條件 ────────────────────────────────

describe("generateDocx — edge cases", () => {
  it("零章節生成空文件", async () => {
    const blob = await generateDocx(
      makeOptions({ chapters: [] })
    );
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
  });

  it("只有空白的內容視為空", async () => {
    const blob = await generateDocx(
      makeOptions({
        chapters: [{ title: "空白章節", content: "   \n\n   " }],
      })
    );
    expect(blob.size).toBeGreaterThan(0);
  });

  it("空白 projectName 不崩潰", async () => {
    const blob = await generateDocx(
      makeOptions({ projectName: "" })
    );
    expect(blob.size).toBeGreaterThan(0);
  });

  it("空白 companyName 不崩潰", async () => {
    const blob = await generateDocx(
      makeOptions({
        companySettings: { name: "", taxId: "", brand: "" },
      })
    );
    expect(blob.size).toBeGreaterThan(0);
  });

  it("custom 未提供尺寸時使用預設值", async () => {
    const blob = await generateDocx(
      makeOptions({
        documentSettings: {
          ...defaultDocSettings,
          page: {
            ...defaultDocSettings.page,
            size: "custom",
            // customWidth / customHeight omitted → falls back to 210×297
          },
        },
      })
    );
    expect(blob.size).toBeGreaterThan(0);
  });

  it("header/footer 模板為空字串不崩潰", async () => {
    const blob = await generateDocx(
      makeOptions({
        documentSettings: {
          ...defaultDocSettings,
          header: { template: "" },
          footer: { template: "" },
        },
      })
    );
    expect(blob.size).toBeGreaterThan(0);
  });

  it("footer 模板有多個頁碼佔位符", async () => {
    const blob = await generateDocx(
      makeOptions({
        documentSettings: {
          ...defaultDocSettings,
          footer: { template: "第 {{頁碼}} 頁 / 共 {{頁碼}} 頁" },
        },
      })
    );
    expect(blob.size).toBeGreaterThan(0);
  });

  it("內容含連續空行", async () => {
    const blob = await generateDocx(
      makeOptions({
        chapters: [
          { title: "連續空行", content: "第一段\n\n\n\n\n第二段" },
        ],
      })
    );
    expect(blob.size).toBeGreaterThan(0);
  });
});

// ── generateDocx — 表格 ────────────────────────────────────

describe("generateDocx — 表格", () => {
  it("含 markdown 表格的章節正常生成", async () => {
    const content = `前言段落

| 項目 | 說明 | 預算 |
|------|------|------|
| 第一期 | 需求分析 | 50萬 |
| 第二期 | 系統開發 | 150萬 |

後記段落`;

    const blob = await generateDocx(
      makeOptions({
        chapters: [{ title: "含表格章節", content }],
      })
    );
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
  });

  it("純表格內容正常生成", async () => {
    const content = `| 姓名 | 職稱 |
|------|------|
| 王小明 | 計畫主持人 |
| 李大華 | 協同主持人 |`;

    const blob = await generateDocx(
      makeOptions({
        chapters: [{ title: "人員表", content }],
      })
    );
    expect(blob.size).toBeGreaterThan(0);
  });

  it("多個表格正常生成", async () => {
    const content = `第一個表格：

| A | B |
|---|---|
| 1 | 2 |

中間段落。

| C | D | E |
|---|---|---|
| 3 | 4 | 5 |

最後段落。`;

    const blob = await generateDocx(
      makeOptions({
        chapters: [{ title: "多表格", content }],
      })
    );
    expect(blob.size).toBeGreaterThan(0);
  });

  it("含表格的章節比純文字大", async () => {
    const textOnly = await generateDocx(
      makeOptions({
        chapters: [{ title: "純文字", content: "簡單內容" }],
      })
    );
    const withTable = await generateDocx(
      makeOptions({
        chapters: [
          {
            title: "有表格",
            content: "前言\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\n後記",
          },
        ],
      })
    );
    expect(withTable.size).toBeGreaterThan(textOnly.size);
  });

  it("不完整的表格行不會崩潰", async () => {
    const content = `| 只有一行沒有分隔線 |`;
    const blob = await generateDocx(
      makeOptions({
        chapters: [{ title: "不完整表格", content }],
      })
    );
    expect(blob.size).toBeGreaterThan(0);
  });

  it("不等列數的表格行正常處理", async () => {
    const content = `| A | B | C |
|---|---|---|
| 1 | 2 |
| 3 | 4 | 5 | 6 |`;

    const blob = await generateDocx(
      makeOptions({
        chapters: [{ title: "不等列表格", content }],
      })
    );
    expect(blob.size).toBeGreaterThan(0);
  });
});

// ── 行內格式 ──────────────────────────────────────────────────

describe("parseInlineFormatting", () => {
  it("純文字不拆分", () => {
    expect(parseInlineFormatting("普通文字")).toEqual([{ text: "普通文字" }]);
  });

  it("空字串回傳空文字片段", () => {
    expect(parseInlineFormatting("")).toEqual([{ text: "" }]);
  });

  it("解析粗體 **text**", () => {
    expect(parseInlineFormatting("前文**粗體**後文")).toEqual([
      { text: "前文" },
      { text: "粗體", bold: true },
      { text: "後文" },
    ]);
  });

  it("解析斜體 *text*", () => {
    expect(parseInlineFormatting("前文*斜體*後文")).toEqual([
      { text: "前文" },
      { text: "斜體", italic: true },
      { text: "後文" },
    ]);
  });

  it("解析粗斜體 ***text***", () => {
    expect(parseInlineFormatting("***粗斜體***")).toEqual([
      { text: "粗斜體", bold: true, italic: true },
    ]);
  });

  it("同一行多個格式", () => {
    const result = parseInlineFormatting("正常**粗體**中間*斜體*結尾");
    expect(result).toEqual([
      { text: "正常" },
      { text: "粗體", bold: true },
      { text: "中間" },
      { text: "斜體", italic: true },
      { text: "結尾" },
    ]);
  });

  it("不含星號的文字不受影響", () => {
    const text = "這段文字沒有任何標記，1+2=3";
    expect(parseInlineFormatting(text)).toEqual([{ text }]);
  });

  it("單獨的星號不觸發格式", () => {
    // 沒有閉合的 * 不應被當作格式標記
    expect(parseInlineFormatting("評分 5 * 3")).toEqual([
      { text: "評分 5 * 3" },
    ]);
  });
});

// ── 標題支援 ──────────────────────────────────────────────────

describe("generateDocx — 標題", () => {
  it("含 ## H2 標題的章節正常生成", async () => {
    const content = `前言\n\n## 第一節 背景\n\n第一節內容`;
    const blob = await generateDocx(
      makeOptions({
        chapters: [{ title: "含標題章節", content }],
      })
    );
    expect(blob.size).toBeGreaterThan(0);
  });

  it("含 ### H3 和 #### H4 標題", async () => {
    const content = `## 大節\n\n段落一\n\n### 小節\n\n段落二\n\n#### 最小節\n\n段落三`;
    const blob = await generateDocx(
      makeOptions({
        chapters: [{ title: "多層標題", content }],
      })
    );
    expect(blob.size).toBeGreaterThan(0);
  });

  it("標題比純文字生成更大的 blob（含格式資訊）", async () => {
    const plain = await generateDocx(
      makeOptions({
        chapters: [{ title: "A", content: "段落一\n\n段落二" }],
      })
    );
    const withHeading = await generateDocx(
      makeOptions({
        chapters: [{ title: "A", content: "## 節標題\n\n段落一\n\n段落二" }],
      })
    );
    expect(withHeading.size).toBeGreaterThan(plain.size);
  });
});

// ── 項目符號列表 ──────────────────────────────────────────────

describe("generateDocx — 項目符號列表", () => {
  it("含 bullet list 的章節正常生成", async () => {
    const content = `工作項目：\n\n- 需求分析\n- 系統設計\n- 程式開發\n\n以上為主要工作。`;
    const blob = await generateDocx(
      makeOptions({
        chapters: [{ title: "有列表", content }],
      })
    );
    expect(blob.size).toBeGreaterThan(0);
  });

  it("bullet list 比純文字大（含列表格式）", async () => {
    const textOnly = await generateDocx(
      makeOptions({
        chapters: [{ title: "A", content: "項目一\n項目二\n項目三" }],
      })
    );
    const withBullets = await generateDocx(
      makeOptions({
        chapters: [
          { title: "A", content: "- 項目一\n- 項目二\n- 項目三" },
        ],
      })
    );
    expect(withBullets.size).toBeGreaterThan(textOnly.size);
  });
});

// ── 編號列表 ──────────────────────────────────────────────────

describe("generateDocx — 編號列表", () => {
  it("含 numbered list 的章節正常生成", async () => {
    const content = `步驟：\n\n1. 第一步\n2. 第二步\n3. 第三步\n\n完成。`;
    const blob = await generateDocx(
      makeOptions({
        chapters: [{ title: "有編號列表", content }],
      })
    );
    expect(blob.size).toBeGreaterThan(0);
  });

  it("numbered list 比純文字大", async () => {
    const textOnly = await generateDocx(
      makeOptions({
        chapters: [{ title: "A", content: "步驟一\n步驟二\n步驟三" }],
      })
    );
    const withNumbers = await generateDocx(
      makeOptions({
        chapters: [
          { title: "A", content: "1. 步驟一\n2. 步驟二\n3. 步驟三" },
        ],
      })
    );
    expect(withNumbers.size).toBeGreaterThan(textOnly.size);
  });
});

// ── 行內格式生成 ──────────────────────────────────────────────

describe("generateDocx — 行內格式", () => {
  it("含粗體/斜體的章節正常生成", async () => {
    const content = `這段有**粗體**和*斜體*以及***粗斜體***。`;
    const blob = await generateDocx(
      makeOptions({
        chapters: [{ title: "行內格式", content }],
      })
    );
    expect(blob.size).toBeGreaterThan(0);
  });

  it("行內格式比純文字大（含 bold/italic 標記）", async () => {
    const plain = await generateDocx(
      makeOptions({
        chapters: [{ title: "A", content: "重要的文字" }],
      })
    );
    const formatted = await generateDocx(
      makeOptions({
        chapters: [{ title: "A", content: "**重要的**文字" }],
      })
    );
    expect(formatted.size).toBeGreaterThan(plain.size);
  });
});

// ── 混合格式 ──────────────────────────────────────────────────

describe("generateDocx — 混合格式", () => {
  it("同時含標題+列表+表格+行內格式正常生成", async () => {
    const content = `## 計畫概述

本案採用**敏捷開發**方法，分三期實施。

### 工作項目

- 需求分析與*使用者訪談*
- 系統設計
- 程式開發與測試

### 時程表

| 階段 | 期程 | 產出 |
|------|------|------|
| 第一期 | 3個月 | 需求規格書 |
| 第二期 | 6個月 | 系統原型 |

### 工作步驟

1. 蒐集使用者需求
2. 撰寫**需求規格書**
3. 設計系統架構

以上為完整工作計畫。`;

    const blob = await generateDocx(
      makeOptions({
        chapters: [{ title: "第壹章 計畫概述", content }],
      })
    );
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
  });

  it("混合格式章節 blob 大於純文字章節", async () => {
    const plain = await generateDocx(
      makeOptions({
        chapters: [{ title: "A", content: "簡單的純文字內容" }],
      })
    );
    const mixed = await generateDocx(
      makeOptions({
        chapters: [
          {
            title: "A",
            content:
              "## 標題\n\n**粗體**段落\n\n- 列表一\n- 列表二\n\n1. 編號一\n2. 編號二\n\n| A | B |\n|---|---|\n| 1 | 2 |",
          },
        ],
      })
    );
    expect(mixed.size).toBeGreaterThan(plain.size);
  });
});

// ====== sanitizeFilename ======

describe("sanitizeFilename", () => {
  it("returns name unchanged if no unsafe chars", () => {
    expect(sanitizeFilename("report.docx")).toBe("report.docx");
  });

  it("replaces Windows-unsafe characters with underscore", () => {
    expect(sanitizeFilename('file/name\\with:bad*chars?"<>|')).toBe(
      "file_name_with_bad_chars_____",
    );
  });

  it("handles Chinese filenames", () => {
    expect(sanitizeFilename("提案書_v2.docx")).toBe("提案書_v2.docx");
  });

  it("trims whitespace", () => {
    expect(sanitizeFilename("  report.docx  ")).toBe("report.docx");
  });

  it("returns 'untitled' for empty string", () => {
    expect(sanitizeFilename("")).toBe("untitled");
  });

  it("returns 'untitled' for whitespace-only", () => {
    expect(sanitizeFilename("   ")).toBe("untitled");
  });

  it("preserves dots and hyphens", () => {
    expect(sanitizeFilename("my-file.v2.1.docx")).toBe("my-file.v2.1.docx");
  });
});
