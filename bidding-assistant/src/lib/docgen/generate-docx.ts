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
  convertMillimetersToTwip,
} from "docx";
import type { DocumentSettings, CompanySettings } from "@/lib/settings/types";

export interface ChapterInput {
  title: string;
  content: string;
}

export interface GenerateDocxOptions {
  projectName: string;
  chapters: ChapterInput[];
  documentSettings: DocumentSettings;
  companySettings: CompanySettings;
}

const PAGE_SIZES: Record<string, { width: number; height: number }> = {
  A4: { width: 11906, height: 16838 },
  Letter: { width: 12240, height: 15840 },
};

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
      const text = cells[i] ?? "";
      const isHeader = rowIndex === 0;
      return new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text,
                font,
                size: bodySize * 2,
                bold: isHeader,
              }),
            ],
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

type DocBlock = Paragraph | Table;

/**
 * 將內容文字轉換為 DOCX 區塊（段落 + 表格）。
 * 支援 markdown pipe 表格語法。
 */
function contentToBlocks(
  content: string,
  font: string,
  bodySize: number,
  lineSpacing: number,
  paragraphSpacing: { before: number; after: number }
): DocBlock[] {
  if (!content.trim()) return [];

  const spacing = {
    line: Math.round(lineSpacing * 240),
    before: paragraphSpacing.before * 20,
    after: paragraphSpacing.after * 20,
  };

  const lines = content.split("\n");
  const blocks: DocBlock[] = [];
  let textBuffer: string[] = [];
  let tableBuffer: string[] = [];
  let inTable = false;

  function flushText() {
    const joined = textBuffer.join("\n");
    const paragraphs = joined
      .split(/\n\n+/)
      .map((b) => b.trim())
      .filter(Boolean);
    for (const text of paragraphs) {
      blocks.push(
        new Paragraph({
          children: [new TextRun({ text, font, size: bodySize * 2 })],
          spacing,
        })
      );
    }
    textBuffer = [];
  }

  function flushTable() {
    if (tableBuffer.length > 0) {
      blocks.push(buildTable(tableBuffer, font, bodySize));
      tableBuffer = [];
    }
  }

  for (const line of lines) {
    const isRow = isTableRow(line);
    const isSep = isTableSeparator(line);

    if (isRow || isSep) {
      if (!inTable) {
        flushText();
        inTable = true;
      }
      tableBuffer.push(line);
    } else {
      if (inTable) {
        flushTable();
        inTable = false;
      }
      textBuffer.push(line);
    }
  }

  // Flush remaining
  if (inTable) flushTable();
  else flushText();

  return blocks;
}

export async function generateDocx(
  options: GenerateDocxOptions
): Promise<Blob> {
  const { projectName, chapters, documentSettings, companySettings } = options;
  const { fonts, fontSize, page, header, footer } = documentSettings;

  const pageSize = PAGE_SIZES[page.size] ?? {
    width: convertMillimetersToTwip(page.customWidth ?? 210),
    height: convertMillimetersToTwip(page.customHeight ?? 297),
  };

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
      spacing: { after: 240 },
    });

    const body = contentToBlocks(
      chapter.content,
      fonts.body,
      fontSize.body,
      page.lineSpacing,
      page.paragraphSpacing
    );

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

  const doc = new Document({
    sections,
    creator: companySettings.name,
    title: projectName,
  });

  return Packer.toBlob(doc);
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
