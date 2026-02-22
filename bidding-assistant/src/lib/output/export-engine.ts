import { generateDocx } from "@/lib/docgen/generate-docx";
import type { ExportOptions, ExportResult } from "./types";

// ── 匯出分發器 ────────────────────────────────────────────────
// Phase 1：DOCX 格式
// Phase 2：Markdown 格式
// Phase 3：列印/PDF

export async function exportDocument(options: ExportOptions): Promise<ExportResult> {
  switch (options.format) {
    case "docx":
      return exportDocx(options);
    case "markdown":
      return exportMarkdown(options);
    case "print":
      // Phase 3 實作，目前回傳空 HTML
      return { format: "print", html: "" };
    default:
      throw new Error(`不支援的匯出格式：${options.format}`);
  }
}

async function exportDocx(options: ExportOptions): Promise<ExportResult> {
  const blob = await generateDocx({
    projectName: options.projectName,
    chapters: options.chapters,
    documentSettings: options.documentSettings,
    companySettings: { name: options.companyName, taxId: "", brand: "" },
    coverPage: options.coverPage ?? true,
    tableOfContents: options.tableOfContents ?? true,
  });

  const filename = sanitizeFilename(`${options.projectName}_建議書.docx`);
  return { format: "docx", blob, filename };
}

function exportMarkdown(options: ExportOptions): ExportResult {
  const lines: string[] = [];

  lines.push(`# ${options.projectName}`, "");

  for (const chapter of options.chapters) {
    lines.push(`## ${chapter.title}`, "");
    if (chapter.content.trim()) {
      lines.push(chapter.content.trim(), "");
    }
  }

  const text = lines.join("\n");
  const filename = sanitizeFilename(`${options.projectName}_建議書.md`);
  return { format: "markdown", text, filename };
}

function sanitizeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, "_");
}
