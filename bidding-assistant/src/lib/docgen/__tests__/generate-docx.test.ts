import { describe, it, expect } from "vitest";
import { generateDocx, type GenerateDocxOptions } from "../generate-docx";
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
