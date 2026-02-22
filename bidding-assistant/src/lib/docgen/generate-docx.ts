import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Header,
  Footer,
  PageNumber,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  LevelFormat,
  HeadingLevel,
  TableOfContents,
  convertMillimetersToTwip,
} from "docx";
import type { DocumentSettings, CompanySettings } from "@/lib/settings/types";

// ── Types ─────────────────────────────────────────────────────

export interface ChapterInput {
  title: string;
  content: string;
}

export interface GenerateDocxOptions {
  projectName: string;
  chapters: ChapterInput[];
  documentSettings: DocumentSettings;
  companySettings: CompanySettings;
  /** 是否生成封面頁（預設 true） */
  coverPage?: boolean;
  /** 是否生成目錄（預設 true） */
  tableOfContents?: boolean;
}

export interface InlineSegment {
  text: string;
  bold?: boolean;
  italic?: boolean;
}

interface ContentFormatting {
  bodyFont: string;
  headingFont: string;
  bodySize: number;
  h2Size: number;
  h3Size: number;
  h4Size: number;
  lineSpacing: number;
  paragraphSpacing: { before: number; after: number };
}

// ── Constants ─────────────────────────────────────────────────

const PAGE_SIZES: Record<string, { width: number; height: number }> = {
  A4: { width: 11906, height: 16838 },
  Letter: { width: 12240, height: 15840 },
};

const NUMBERED_LIST_REF = "decimal-numbering";

const HEADING_LEVEL_MAP: Record<number, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
  2: HeadingLevel.HEADING_2,
  3: HeadingLevel.HEADING_3,
  4: HeadingLevel.HEADING_4,
};

/** 取得中華民國年月（標案封面用） */
export function formatROCDate(date: Date = new Date()): string {
  const rocYear = date.getFullYear() - 1911;
  const month = date.getMonth() + 1;
  return `中華民國 ${rocYear} 年 ${month} 月`;
}

// ── Template helpers ──────────────────────────────────────────

export function resolveTemplate(
  template: string,
  vars: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
}

function buildHeaderParagraph(
  template: string,
  vars: Record<string, string>,
  font: string
): Paragraph {
  const text = resolveTemplate(template, vars);
  return new Paragraph({
    children: [new TextRun({ text, font, size: 18 })],
    alignment: AlignmentType.CENTER,
  });
}

function buildFooterParagraph(
  template: string,
  vars: Record<string, string>,
  font: string
): Paragraph {
  const parts = template.split("{{頁碼}}");
  const children: TextRun[] = [];

  for (let i = 0; i < parts.length; i++) {
    const text = resolveTemplate(parts[i], vars);
    if (text) children.push(new TextRun({ text, font, size: 18 }));
    if (i < parts.length - 1) {
      children.push(
        new TextRun({ children: [PageNumber.CURRENT], font, size: 18 })
      );
    }
  }

  return new Paragraph({ children, alignment: AlignmentType.CENTER });
}

// ── Inline formatting ─────────────────────────────────────────

/**
 * 解析 markdown 行內格式，回傳帶 bold/italic 標記的文字片段。
 * 支援：`***粗斜體***`、`**粗體**`、`*斜體*`
 */
export function parseInlineFormatting(text: string): InlineSegment[] {
  if (!text) return [{ text: "" }];

  const segments: InlineSegment[] = [];
  // 依標記長度排序：三星 > 雙星 > 單星（單星排除 ** 開頭避免誤判）
  const regex = /\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*([^*]+?)\*/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index) });
    }
    if (match[1] !== undefined) {
      segments.push({ text: match[1], bold: true, italic: true });
    } else if (match[2] !== undefined) {
      segments.push({ text: match[2], bold: true });
    } else if (match[3] !== undefined) {
      segments.push({ text: match[3], italic: true });
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ text }];
}

/**
 * 將文字轉換為帶行內格式的 TextRun 陣列。
 * @param baseBold 為 true 時所有片段都套用粗體（用於標題）
 */
function toTextRuns(
  text: string,
  font: string,
  size: number,
  baseBold?: boolean,
): TextRun[] {
  return parseInlineFormatting(text).map(
    (seg) =>
      new TextRun({
        text: seg.text,
        font,
        size: size * 2,
        bold: baseBold || seg.bold || undefined,
        italics: seg.italic || undefined,
      })
  );
}

// ── Table helpers ─────────────────────────────────────────────

/** 判斷一行是否為表格分隔行（如 |---|---|） */
export function isTableSeparator(line: string): boolean {
  return /^\|[\s\-:|]+\|$/.test(line.trim());
}

/** 判斷一行是否為表格行（以 | 開頭和結尾） */
export function isTableRow(line: string): boolean {
  const t = line.trim();
  return t.startsWith("|") && t.endsWith("|");
}

/** 解析表格行，取出每個 cell 的文字 */
export function parseTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

/** 從 markdown 表格行建立 DOCX Table */
function buildTable(
  rows: string[],
  font: string,
  bodySize: number,
): Table {
  const dataRows = rows.filter((r) => !isTableSeparator(r));
  if (dataRows.length === 0) {
    return new Table({ rows: [] });
  }

  const parsedRows = dataRows.map(parseTableRow);
  const colCount = Math.max(...parsedRows.map((r) => r.length));

  const tableRows = parsedRows.map((cells, rowIndex) => {
    const tableCells = Array.from({ length: colCount }, (_, i) => {
      const cellText = cells[i] ?? "";
      const isHeader = rowIndex === 0;
      return new TableCell({
        children: [
          new Paragraph({
            children: toTextRuns(cellText, font, bodySize, isHeader),
          }),
        ],
        width: { size: Math.floor(100 / colCount), type: WidthType.PERCENTAGE },
      });
    });
    return new TableRow({ children: tableCells });
  });

  return new Table({
    rows: tableRows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1 },
      bottom: { style: BorderStyle.SINGLE, size: 1 },
      left: { style: BorderStyle.SINGLE, size: 1 },
      right: { style: BorderStyle.SINGLE, size: 1 },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
      insideVertical: { style: BorderStyle.SINGLE, size: 1 },
    },
  });
}

// ── Content to DOCX blocks ────────────────────────────────────

type DocBlock = Paragraph | Table;

/**
 * 將 markdown 內容轉換為 DOCX 區塊。
 * 支援：段落、表格、標題（##/###/####）、項目符號列表、編號列表、行內粗體/斜體。
 */
function contentToBlocks(
  content: string,
  fmt: ContentFormatting,
): DocBlock[] {
  if (!content.trim()) return [];

  const spacing = {
    line: Math.round(fmt.lineSpacing * 240),
    before: fmt.paragraphSpacing.before * 20,
    after: fmt.paragraphSpacing.after * 20,
  };

  const lines = content.split("\n");
  const blocks: DocBlock[] = [];
  let textBuffer: string[] = [];
  let tableBuffer: string[] = [];
  let listBuffer: { type: "bullet" | "numbered"; items: string[] } | null =
    null;

  function flushText() {
    const joined = textBuffer.join("\n");
    const paragraphs = joined
      .split(/\n\n+/)
      .map((b) => b.trim())
      .filter(Boolean);
    for (const para of paragraphs) {
      blocks.push(
        new Paragraph({
          children: toTextRuns(para, fmt.bodyFont, fmt.bodySize),
          spacing,
        })
      );
    }
    textBuffer = [];
  }

  function flushTable() {
    if (tableBuffer.length > 0) {
      blocks.push(buildTable(tableBuffer, fmt.bodyFont, fmt.bodySize));
      tableBuffer = [];
    }
  }

  function flushList() {
    if (!listBuffer) return;
    for (const itemText of listBuffer.items) {
      const children = toTextRuns(itemText, fmt.bodyFont, fmt.bodySize);
      if (listBuffer.type === "bullet") {
        blocks.push(new Paragraph({ children, spacing, bullet: { level: 0 } }));
      } else {
        blocks.push(
          new Paragraph({
            children,
            spacing,
            numbering: { reference: NUMBERED_LIST_REF, level: 0 },
          })
        );
      }
    }
    listBuffer = null;
  }

  function flushAll() {
    if (textBuffer.length) flushText();
    if (tableBuffer.length) flushTable();
    if (listBuffer) flushList();
  }

  const headingSizeMap: Record<number, number> = {
    2: fmt.h2Size,
    3: fmt.h3Size,
    4: fmt.h4Size,
  };

  for (const line of lines) {
    const trimmed = line.trim();

    // ── Heading (## H2, ### H3, #### H4) ──
    const headingMatch = trimmed.match(/^(#{2,4})\s+(.+)$/);
    if (headingMatch) {
      flushAll();
      const level = headingMatch[1].length;
      const hSize = headingSizeMap[level] ?? fmt.bodySize;
      blocks.push(
        new Paragraph({
          children: toTextRuns(headingMatch[2], fmt.headingFont, hSize, true),
          heading: HEADING_LEVEL_MAP[level],
          spacing: { before: 240, after: 120 },
        })
      );
      continue;
    }

    // ── Table ──
    if (isTableRow(line) || isTableSeparator(line)) {
      if (textBuffer.length) flushText();
      if (listBuffer) flushList();
      tableBuffer.push(line);
      continue;
    }
    if (tableBuffer.length) flushTable();

    // ── Bullet list (- item) ──
    const bulletMatch = trimmed.match(/^-\s+(.+)$/);
    if (bulletMatch) {
      if (textBuffer.length) flushText();
      if (listBuffer && listBuffer.type !== "bullet") flushList();
      if (!listBuffer) listBuffer = { type: "bullet", items: [] };
      listBuffer.items.push(bulletMatch[1]);
      continue;
    }

    // ── Numbered list (1. item) ──
    const numberedMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    if (numberedMatch) {
      if (textBuffer.length) flushText();
      if (listBuffer && listBuffer.type !== "numbered") flushList();
      if (!listBuffer) listBuffer = { type: "numbered", items: [] };
      listBuffer.items.push(numberedMatch[1]);
      continue;
    }

    // ── Plain text ──
    if (listBuffer) flushList();
    textBuffer.push(line);
  }

  flushAll();
  return blocks;
}

// ── Main ──────────────────────────────────────────────────────

export async function generateDocx(
  options: GenerateDocxOptions
): Promise<Blob> {
  const { projectName, chapters, documentSettings, companySettings } = options;
  const { fonts, fontSize, page, header, footer } = documentSettings;

  const pageSize = PAGE_SIZES[page.size] ?? {
    width: convertMillimetersToTwip(page.customWidth ?? 210),
    height: convertMillimetersToTwip(page.customHeight ?? 297),
  };

  // 設定值存 cm，乘 10 轉 mm 後再由 convertMillimetersToTwip 轉 twip
  const margin = {
    top: convertMillimetersToTwip(page.margins.top * 10),
    bottom: convertMillimetersToTwip(page.margins.bottom * 10),
    left: convertMillimetersToTwip(page.margins.left * 10),
    right: convertMillimetersToTwip(page.margins.right * 10),
  };

  const templateVars = {
    案名: projectName,
    公司名: companySettings.name,
  };

  const fmt: ContentFormatting = {
    bodyFont: fonts.body,
    headingFont: fonts.heading,
    bodySize: fontSize.body,
    h2Size: fontSize.h2,
    h3Size: fontSize.h3,
    h4Size: fontSize.h4,
    lineSpacing: page.lineSpacing,
    paragraphSpacing: page.paragraphSpacing,
  };

  const sections = chapters.map((chapter) => {
    const chapterVars = { ...templateVars, 章節名: chapter.title };

    const heading = new Paragraph({
      children: [
        new TextRun({
          text: chapter.title,
          font: fonts.heading,
          size: fontSize.h1 * 2,
          bold: true,
        }),
      ],
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 240 },
    });

    const body = contentToBlocks(chapter.content, fmt);

    return {
      properties: {
        page: {
          size: { width: pageSize.width, height: pageSize.height },
          margin,
        },
      },
      headers: {
        default: new Header({
          children: [
            buildHeaderParagraph(header.template, chapterVars, fonts.headerFooter),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            buildFooterParagraph(footer.template, chapterVars, fonts.headerFooter),
          ],
        }),
      },
      children: [heading, ...body],
    };
  });

  // ── 封面頁 + 目錄 ──
  const showCover = options.coverPage !== false;
  const showToc = options.tableOfContents !== false;

  const coverSection = {
    properties: {
      page: {
        size: { width: pageSize.width, height: pageSize.height },
        margin,
      },
    },
    children: [
      new Paragraph({ spacing: { before: 4000 } }),
      new Paragraph({
        children: [
          new TextRun({
            text: projectName,
            font: fonts.heading,
            size: 52,
            bold: true,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 600 },
      }),
      new Paragraph({ spacing: { before: 1200 } }),
      new Paragraph({
        children: [
          new TextRun({
            text: companySettings.name,
            font: fonts.heading,
            size: 36,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: formatROCDate(),
            font: fonts.heading,
            size: 28,
          }),
        ],
        alignment: AlignmentType.CENTER,
      }),
    ],
  };

  const tocSection = {
    properties: {
      page: {
        size: { width: pageSize.width, height: pageSize.height },
        margin,
      },
    },
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text: "目錄",
            font: fonts.heading,
            size: fontSize.h1 * 2,
            bold: true,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      }),
      new TableOfContents("目錄", {
        hyperlink: true,
        headingStyleRange: "1-4",
      }),
    ],
  };

  const finalSections = [
    ...(showCover ? [coverSection] : []),
    ...(showToc ? [tocSection] : []),
    ...sections,
  ];

  const doc = new Document({
    styles: {
      paragraphStyles: [
        {
          id: "Heading1",
          name: "heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { font: fonts.heading, size: fontSize.h1 * 2, bold: true },
          paragraph: { spacing: { after: 240 } },
        },
        {
          id: "Heading2",
          name: "heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { font: fonts.heading, size: fontSize.h2 * 2, bold: true },
          paragraph: { spacing: { before: 240, after: 120 } },
        },
        {
          id: "Heading3",
          name: "heading 3",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { font: fonts.heading, size: fontSize.h3 * 2, bold: true },
          paragraph: { spacing: { before: 240, after: 120 } },
        },
        {
          id: "Heading4",
          name: "heading 4",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { font: fonts.heading, size: fontSize.h4 * 2, bold: true },
          paragraph: { spacing: { before: 240, after: 120 } },
        },
      ],
    },
    numbering: {
      config: [
        {
          reference: NUMBERED_LIST_REF,
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: "%1.",
              alignment: AlignmentType.START,
              style: {
                paragraph: {
                  indent: {
                    left: convertMillimetersToTwip(10),
                    hanging: convertMillimetersToTwip(5),
                  },
                },
              },
            },
          ],
        },
      ],
    },
    sections: finalSections,
    creator: companySettings.name,
    title: projectName,
  });

  return Packer.toBlob(doc);
}

/** 清除檔名中不安全的字元（Windows + 通用檔案系統） */
export function sanitizeFilename(name: string): string {
  return name.replace(/[/\\:*?"<>|]/g, "_").trim() || "untitled";
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = sanitizeFilename(filename);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
