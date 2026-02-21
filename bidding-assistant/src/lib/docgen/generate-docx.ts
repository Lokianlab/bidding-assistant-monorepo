import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Header,
  Footer,
  PageNumber,
  AlignmentType,
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

function resolveTemplate(
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

function contentToParagraphs(
  content: string,
  font: string,
  bodySize: number,
  lineSpacing: number,
  paragraphSpacing: { before: number; after: number }
): Paragraph[] {
  if (!content.trim()) return [];

  const spacing = {
    line: Math.round(lineSpacing * 240),
    before: paragraphSpacing.before * 20, // pt to twips
    after: paragraphSpacing.after * 20,
  };

  return content
    .split(/\n\n+/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map(
      (text) =>
        new Paragraph({
          children: [new TextRun({ text, font, size: bodySize * 2 })],
          spacing,
        })
    );
}

export async function generateDocx(
  options: GenerateDocxOptions
): Promise<Blob> {
  const { projectName, chapters, documentSettings, companySettings } = options;
  const { fonts, fontSize, page, header, footer } = documentSettings;

  const pageSize = PAGE_SIZES[page.size] ?? {
    width: convertMillimetersToTwip((page.customWidth ?? 210) * 10),
    height: convertMillimetersToTwip((page.customHeight ?? 297) * 10),
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

    const body = contentToParagraphs(
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
