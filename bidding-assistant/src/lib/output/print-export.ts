import type { ExportOptions, ExportResult } from "./types";
import type { DocumentSettings } from "@/lib/settings/types";

// ── 列印/PDF 匯出 ─────────────────────────────────────────

/**
 * 產生適合列印的 HTML 字串（含嵌入式 CSS print stylesheet）。
 * 呼叫端可將此 HTML 注入 iframe 並呼叫 contentWindow.print()。
 */
export function generatePrintHtml(options: ExportOptions): ExportResult {
  const { projectName, chapters, documentSettings, coverPage } = options;

  const chaptersHtml = chapters
    .map(
      (ch) => `
<section class="chapter">
  <h2 class="chapter-title">${escapeHtml(ch.title)}</h2>
  <div class="chapter-content">${renderMarkdownToHtml(ch.content)}</div>
</section>`
    )
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(projectName)}</title>
  <style>
${buildCss(documentSettings)}
  </style>
</head>
<body>
  <div class="document">
    ${coverPage !== false ? buildCoverHtml(projectName) : ""}
    ${chaptersHtml}
  </div>
</body>
</html>`;

  return { format: "print", html };
}

// ── CSS 生成 ──────────────────────────────────────────────

function buildCss(ds: DocumentSettings): string {
  const { fonts, fontSize, page } = ds;
  const { margins } = page;

  // 單位轉換：DocumentSettings 的 margins 用 cm（UI 標籤「邊距（cm）」），fontSize 用 pt
  const marginStr = `${margins.top}cm ${margins.right}cm ${margins.bottom}cm ${margins.left}cm`;

  return `
    /* ── 基礎排版 ─────────────────────────── */
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: "${fonts.body}", "新細明體", serif;
      font-size: ${fontSize.body}pt;
      line-height: ${page.lineSpacing};
      color: #000;
      background: #fff;
    }

    .document {
      max-width: 210mm;
      margin: 0 auto;
      padding: ${marginStr};
    }

    /* ── 封面 ─────────────────────────────── */
    .cover {
      text-align: center;
      padding: 60mm 0;
      page-break-after: always;
    }

    .cover-title {
      font-family: "${fonts.heading}", "標楷體", serif;
      font-size: ${fontSize.h1}pt;
      font-weight: bold;
      margin-bottom: 8mm;
    }

    .cover-subtitle {
      font-size: ${fontSize.body + 2}pt;
      color: #444;
    }

    /* ── 章節 ─────────────────────────────── */
    .chapter {
      margin-bottom: ${page.paragraphSpacing.after}mm;
    }

    .chapter + .chapter {
      page-break-before: always;
    }

    .chapter-title {
      font-family: "${fonts.heading}", "標楷體", serif;
      font-size: ${fontSize.h2}pt;
      font-weight: bold;
      border-bottom: 1pt solid #000;
      padding-bottom: 2mm;
      margin-bottom: 5mm;
    }

    .chapter-content h3 {
      font-family: "${fonts.heading}", "標楷體", serif;
      font-size: ${fontSize.h3}pt;
      font-weight: bold;
      margin: 4mm 0 2mm;
    }

    .chapter-content h4 {
      font-family: "${fonts.heading}", "標楷體", serif;
      font-size: ${fontSize.h4}pt;
      font-weight: bold;
      margin: 3mm 0 1.5mm;
    }

    .chapter-content p {
      margin-bottom: ${page.paragraphSpacing.after}mm;
      text-align: justify;
    }

    .chapter-content ul,
    .chapter-content ol {
      padding-left: 6mm;
      margin-bottom: ${page.paragraphSpacing.after}mm;
    }

    .chapter-content li {
      margin-bottom: 1mm;
    }

    /* ── 列印媒體查詢 ─────────────────────── */
    @media print {
      @page {
        size: ${page.size === "A4" ? "A4" : page.size === "Letter" ? "letter" : "A4"} portrait;
        margin: ${marginStr};
      }

      body {
        background: #fff;
      }

      .no-print {
        display: none !important;
      }

      h2, h3, h4 {
        page-break-after: avoid;
      }

      p, li {
        orphans: 3;
        widows: 3;
      }

      .chapter-content {
        page-break-inside: auto;
      }
    }

    /* ── 預覽模式（非列印） ──────────────── */
    @media screen {
      body {
        background: #e0e0e0;
      }

      .document {
        background: #fff;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      }
    }
  `;
}

function buildCoverHtml(projectName: string): string {
  const year = new Date().getFullYear() - 1911;
  const month = new Date().getMonth() + 1;
  return `
<section class="cover">
  <div class="cover-title">${escapeHtml(projectName)}</div>
  <div class="cover-subtitle">投標建議書</div>
  <div class="cover-subtitle" style="margin-top: 4mm;">民國 ${year} 年 ${month} 月</div>
</section>`;
}

// ── Markdown → HTML ───────────────────────────────────────

/** 將 Markdown 內容轉換為 HTML（僅支援常見語法） */
export function renderMarkdownToHtml(content: string): string {
  if (!content.trim()) return "";

  const lines = content.split("\n");
  const result: string[] = [];
  let inList = false;
  let listType: "ul" | "ol" = "ul";

  for (const line of lines) {
    if (line.startsWith("### ")) {
      flushList(result, inList, listType);
      inList = false;
      result.push(`<h4>${applyInlineMarkdown(escapeHtml(line.slice(4)))}</h4>`);
    } else if (line.startsWith("## ")) {
      flushList(result, inList, listType);
      inList = false;
      result.push(`<h3>${applyInlineMarkdown(escapeHtml(line.slice(3)))}</h3>`);
    } else if (line.startsWith("# ")) {
      flushList(result, inList, listType);
      inList = false;
      result.push(`<h3>${applyInlineMarkdown(escapeHtml(line.slice(2)))}</h3>`);
    } else if (/^\d+\. /.test(line)) {
      if (!inList || listType !== "ol") {
        if (inList) flushList(result, inList, listType);
        result.push("<ol>");
        inList = true;
        listType = "ol";
      }
      const text = line.replace(/^\d+\. /, "");
      result.push(`<li>${applyInlineMarkdown(escapeHtml(text))}</li>`);
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      if (!inList || listType !== "ul") {
        if (inList) flushList(result, inList, listType);
        result.push("<ul>");
        inList = true;
        listType = "ul";
      }
      result.push(`<li>${applyInlineMarkdown(escapeHtml(line.slice(2)))}</li>`);
    } else if (line.trim() === "") {
      flushList(result, inList, listType);
      inList = false;
    } else {
      flushList(result, inList, listType);
      inList = false;
      result.push(`<p>${applyInlineMarkdown(escapeHtml(line))}</p>`);
    }
  }

  flushList(result, inList, listType);
  return result.join("\n");
}

function flushList(result: string[], inList: boolean, type: "ul" | "ol"): void {
  if (inList) result.push(`</${type}>`);
}

/** 套用 inline markdown 語法（粗體、斜體） */
function applyInlineMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.+?)__/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/_(.+?)_/g, "<em>$1</em>");
}

/** HTML 特殊字元轉義（防止 XSS） */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
