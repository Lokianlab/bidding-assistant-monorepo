import { describe, it, expect, vi, beforeEach } from "vitest";
import { exportDocument } from "../export-engine";
import type { ExportOptions } from "../types";
import type { DocumentSettings } from "@/lib/settings/types";

// mock generate-docx
vi.mock("@/lib/docgen/generate-docx", () => ({
  generateDocx: vi.fn().mockResolvedValue(new Blob(["mock docx"], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" })),
}));

const mockDocumentSettings: DocumentSettings = {
  fonts: { body: "標楷體", heading: "標楷體", headerFooter: "標楷體", customFonts: [] },
  fontSize: { body: 12, h1: 18, h2: 16, h3: 14, h4: 13 },
  page: {
    size: "A4",
    margins: { top: 1, bottom: 1, left: 1, right: 1 },
    lineSpacing: 1.5,
    paragraphSpacing: { before: 0, after: 6 },
  },
  header: { template: "{{案名}}" },
  footer: { template: "第 {{頁碼}} 頁" },
  driveNamingRule: "",
};

const baseOptions: ExportOptions = {
  format: "docx",
  template: "proposal-standard",
  chapters: [
    { title: "第一章", content: "內容一" },
    { title: "第二章", content: "內容二" },
  ],
  documentSettings: mockDocumentSettings,
  projectName: "測試案件",
  companyName: "測試公司",
  coverPage: true,
  tableOfContents: true,
};

describe("exportDocument — DOCX", () => {
  it("回傳 format: docx 和 Blob", async () => {
    const result = await exportDocument(baseOptions);
    expect(result.format).toBe("docx");
    if (result.format === "docx") {
      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.filename).toContain(".docx");
    }
  });

  it("檔名包含案件名稱", async () => {
    const result = await exportDocument(baseOptions);
    if (result.format === "docx") {
      expect(result.filename).toContain("測試案件");
    }
  });

  it("檔名特殊字元被替換", async () => {
    const result = await exportDocument({ ...baseOptions, projectName: "案件/測試:名稱" });
    if (result.format === "docx") {
      expect(result.filename).not.toContain("/");
      expect(result.filename).not.toContain(":");
    }
  });
});

describe("exportDocument — Markdown", () => {
  it("回傳 format: markdown 和文字", async () => {
    const result = await exportDocument({ ...baseOptions, format: "markdown" });
    expect(result.format).toBe("markdown");
    if (result.format === "markdown") {
      expect(typeof result.text).toBe("string");
      expect(result.filename).toContain(".md");
    }
  });

  it("Markdown 包含章節標題", async () => {
    const result = await exportDocument({ ...baseOptions, format: "markdown" });
    if (result.format === "markdown") {
      expect(result.text).toContain("## 第一章");
      expect(result.text).toContain("## 第二章");
    }
  });

  it("Markdown 包含案件名稱作為 H1", async () => {
    const result = await exportDocument({ ...baseOptions, format: "markdown" });
    if (result.format === "markdown") {
      expect(result.text).toContain("# 測試案件");
    }
  });

  it("Markdown 包含章節內容", async () => {
    const result = await exportDocument({ ...baseOptions, format: "markdown" });
    if (result.format === "markdown") {
      expect(result.text).toContain("內容一");
      expect(result.text).toContain("內容二");
    }
  });
});

describe("exportDocument — Print", () => {
  it("回傳 format: print 且 HTML 非空", async () => {
    const result = await exportDocument({ ...baseOptions, format: "print" });
    expect(result.format).toBe("print");
    if (result.format === "print") {
      expect(result.html.length).toBeGreaterThan(100);
    }
  });

  it("HTML 包含案件名稱和章節標題", async () => {
    const result = await exportDocument({ ...baseOptions, format: "print" });
    if (result.format === "print") {
      expect(result.html).toContain("測試案件");
      expect(result.html).toContain("第一章");
      expect(result.html).toContain("第二章");
    }
  });

  it("HTML 包含 @media print 樣式", async () => {
    const result = await exportDocument({ ...baseOptions, format: "print" });
    if (result.format === "print") {
      expect(result.html).toContain("@media print");
    }
  });
});

describe("exportDocument — 不支援格式", () => {
  it("未知格式拋出錯誤", async () => {
    await expect(
      exportDocument({ ...baseOptions, format: "unknown" as "docx" })
    ).rejects.toThrow();
  });
});
