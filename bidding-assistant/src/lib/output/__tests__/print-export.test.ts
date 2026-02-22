import { describe, it, expect } from "vitest";
import { generatePrintHtml, renderMarkdownToHtml } from "../print-export";
import type { ExportOptions } from "../types";
import type { DocumentSettings } from "@/lib/settings/types";

// ── 測試資料 ──────────────────────────────────────────────

const mockDocSettings: DocumentSettings = {
  fonts: { body: "Arial", heading: "Arial", headerFooter: "Arial", customFonts: [] },
  fontSize: { body: 12, h1: 22, h2: 18, h3: 14, h4: 12 },
  page: {
    size: "A4",
    margins: { top: 2.5, bottom: 2.5, left: 3, right: 3 },
    lineSpacing: 1.5,
    paragraphSpacing: { before: 0, after: 5 },
  },
  header: { template: "" },
  footer: { template: "" },
  driveNamingRule: "",
};

const baseOptions: ExportOptions = {
  format: "print",
  template: "proposal-standard",
  chapters: [
    { title: "第壹章 專案理解", content: "這是第一章的內容。" },
    { title: "第貳章 執行計畫", content: "這是第二章的內容。\n\n新段落。" },
  ],
  documentSettings: mockDocSettings,
  projectName: "測試標案",
  companyName: "大員洛川",
  coverPage: true,
  tableOfContents: false,
};

// ── generatePrintHtml ─────────────────────────────────────

describe("generatePrintHtml — 基本結構", () => {
  it("回傳 format: 'print'", () => {
    const result = generatePrintHtml(baseOptions);
    expect(result.format).toBe("print");
  });

  it("HTML 包含 DOCTYPE 和 lang=zh-TW", () => {
    const { html } = generatePrintHtml(baseOptions) as { format: "print"; html: string };
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain('lang="zh-TW"');
  });

  it("HTML 包含案件名稱", () => {
    const { html } = generatePrintHtml(baseOptions) as { format: "print"; html: string };
    expect(html).toContain("測試標案");
  });

  it("HTML 包含所有章節標題", () => {
    const { html } = generatePrintHtml(baseOptions) as { format: "print"; html: string };
    expect(html).toContain("第壹章 專案理解");
    expect(html).toContain("第貳章 執行計畫");
  });

  it("HTML 包含章節內容", () => {
    const { html } = generatePrintHtml(baseOptions) as { format: "print"; html: string };
    expect(html).toContain("這是第一章的內容");
    expect(html).toContain("這是第二章的內容");
  });

  it("HTML 包含封面（coverPage=true）", () => {
    const { html } = generatePrintHtml(baseOptions) as { format: "print"; html: string };
    expect(html).toContain("cover");
    expect(html).toContain("投標建議書");
  });

  it("HTML 不包含封面（coverPage=false）", () => {
    const opts = { ...baseOptions, coverPage: false };
    const { html } = generatePrintHtml(opts) as { format: "print"; html: string };
    expect(html).not.toContain("投標建議書");
  });

  it("HTML 包含 @media print 樣式", () => {
    const { html } = generatePrintHtml(baseOptions) as { format: "print"; html: string };
    expect(html).toContain("@media print");
  });

  it("HTML 包含 CSS A4 頁面設定", () => {
    const { html } = generatePrintHtml(baseOptions) as { format: "print"; html: string };
    expect(html).toContain("A4");
  });
});

describe("generatePrintHtml — 字型和樣式設定", () => {
  it("CSS 包含 font-family 設定", () => {
    const { html } = generatePrintHtml(baseOptions) as { format: "print"; html: string };
    expect(html).toContain("Arial");
  });

  it("CSS 包含 font-size 設定", () => {
    const { html } = generatePrintHtml(baseOptions) as { format: "print"; html: string };
    expect(html).toContain("12pt");
  });

  it("CSS 包含頁邊距設定", () => {
    const { html } = generatePrintHtml(baseOptions) as { format: "print"; html: string };
    // 2.5cm top/bottom, 3cm left/right（UI 標籤「邊距（cm）」）
    expect(html).toContain("2.5cm");
    expect(html).toContain("3cm");
  });
});

describe("generatePrintHtml — HTML 轉義安全", () => {
  it("章節標題中的 HTML 特殊字元被轉義", () => {
    const opts = {
      ...baseOptions,
      chapters: [{ title: "<script>alert('xss')</script>", content: "" }],
    };
    const { html } = generatePrintHtml(opts) as { format: "print"; html: string };
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("章節內容中的 & 符號被轉義", () => {
    const opts = {
      ...baseOptions,
      chapters: [{ title: "章節", content: "A & B" }],
    };
    const { html } = generatePrintHtml(opts) as { format: "print"; html: string };
    expect(html).toContain("A &amp; B");
  });
});

// ── renderMarkdownToHtml ──────────────────────────────────

describe("renderMarkdownToHtml — 標題", () => {
  it("# 標題 → <h3>", () => {
    const result = renderMarkdownToHtml("# 大標題");
    expect(result).toContain("<h3>大標題</h3>");
  });

  it("## 標題 → <h3>（章節內用 h3）", () => {
    const result = renderMarkdownToHtml("## 中標題");
    expect(result).toContain("<h3>中標題</h3>");
  });

  it("### 標題 → <h4>", () => {
    const result = renderMarkdownToHtml("### 小標題");
    expect(result).toContain("<h4>小標題</h4>");
  });
});

describe("renderMarkdownToHtml — 段落", () => {
  it("一般文字行 → <p>", () => {
    const result = renderMarkdownToHtml("這是一段文字");
    expect(result).toContain("<p>這是一段文字</p>");
  });

  it("空行不產生 <p>", () => {
    const result = renderMarkdownToHtml("第一段\n\n第二段");
    expect(result).toContain("<p>第一段</p>");
    expect(result).toContain("<p>第二段</p>");
    expect(result).not.toContain("<p></p>");
  });

  it("空字串回傳空字串", () => {
    expect(renderMarkdownToHtml("")).toBe("");
    expect(renderMarkdownToHtml("   ")).toBe("");
  });
});

describe("renderMarkdownToHtml — 列表", () => {
  it("- 項目 → <ul><li>", () => {
    const result = renderMarkdownToHtml("- 項目一\n- 項目二");
    expect(result).toContain("<ul>");
    expect(result).toContain("<li>項目一</li>");
    expect(result).toContain("<li>項目二</li>");
    expect(result).toContain("</ul>");
  });

  it("* 項目也支援", () => {
    const result = renderMarkdownToHtml("* 項目一");
    expect(result).toContain("<ul>");
    expect(result).toContain("<li>項目一</li>");
  });

  it("數字列表 → <ol><li>", () => {
    const result = renderMarkdownToHtml("1. 第一項\n2. 第二項");
    expect(result).toContain("<ol>");
    expect(result).toContain("<li>第一項</li>");
    expect(result).toContain("<li>第二項</li>");
    expect(result).toContain("</ol>");
  });
});

describe("renderMarkdownToHtml — inline 語法", () => {
  it("**粗體** → <strong>", () => {
    const result = renderMarkdownToHtml("**粗體文字**");
    expect(result).toContain("<strong>粗體文字</strong>");
  });

  it("*斜體* → <em>", () => {
    const result = renderMarkdownToHtml("*斜體文字*");
    expect(result).toContain("<em>斜體文字</em>");
  });

  it("__粗體__ → <strong>", () => {
    const result = renderMarkdownToHtml("__粗體文字__");
    expect(result).toContain("<strong>粗體文字</strong>");
  });

  it("混合粗體和斜體", () => {
    const result = renderMarkdownToHtml("**粗體** 和 *斜體*");
    expect(result).toContain("<strong>粗體</strong>");
    expect(result).toContain("<em>斜體</em>");
  });
});
