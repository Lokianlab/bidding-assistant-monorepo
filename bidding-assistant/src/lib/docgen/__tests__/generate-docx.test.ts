import { describe, it, expect } from "vitest";
import {
  generateDocx,
  parseTableRow,
  resolveTemplate,
  isTableSeparator,
  isTableRow,
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
