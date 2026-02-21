import { describe, it, expect } from "vitest";
import { generateDocx, parseTableRow, type GenerateDocxOptions } from "../generate-docx";
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
    // 同樣內容、同樣 A4 尺寸，blob 大小差異應在 20% 內
    // 如果自訂尺寸被意外放大 10 倍，XML 中的數字會明顯不同
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

// ── 表格支援 ────────────────────────────────────────────────

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
});

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
    // 表格會產生額外的 XML，所以 blob 應該更大
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
});
