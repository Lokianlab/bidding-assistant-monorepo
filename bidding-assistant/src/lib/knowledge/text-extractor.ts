/**
 * Knowledge Base v2 -- Text extraction from file buffers
 *
 * Supports PDF and DOCX. Uses dynamic imports so the module degrades
 * gracefully if optional dependencies (pdf-parse, mammoth) are missing.
 */

import type { ExtractedPage } from './types';

/** Minimum character count to consider a page scannable (detect scan-only PDFs). */
const MIN_SCANNABLE_CHARS = 100;

/**
 * Dynamically require an optional package.
 * Returns null if the package is not installed.
 */
function tryRequire<T>(moduleName: string): T | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require(moduleName) as T;
  } catch {
    return null;
  }
}

interface PdfParseResult {
  numpages: number;
  text: string;
}

interface MammothResult {
  value: string;
  messages: Array<{ type: string; message: string }>;
}

// ---- PDF extraction ----

async function extractPDF(buffer: Buffer): Promise<ExtractedPage[]> {
  try {
    const pdfParseModule = tryRequire<{
      default?: (buf: Buffer) => Promise<PdfParseResult>;
    }>('pdf-parse');

    if (!pdfParseModule) {
      return [
        {
          page_number: 1,
          text: '',
          card_type: 'document_section',
          is_scannable: false,
          scan_error: 'pdf-parse 套件未安裝，無法解析 PDF',
        },
      ];
    }

    // pdf-parse exports its function as default or directly
    const pdfParse =
      typeof pdfParseModule.default === 'function'
        ? pdfParseModule.default
        : (pdfParseModule as unknown as (buf: Buffer) => Promise<PdfParseResult>);

    const parsed = await pdfParse(buffer);
    const fullText = parsed.text;

    // pdf-parse returns a single text blob. Heuristic split on form-feed
    // characters (\f) which often delimit pages.
    const rawPages = fullText.split('\f').filter((t) => t.trim().length > 0);

    // If no form-feeds found, treat entire text as one page
    const pageTexts = rawPages.length > 0 ? rawPages : [fullText];

    const pages: ExtractedPage[] = pageTexts.map((text, idx) => {
      const trimmed = text.trim();
      const scannable = trimmed.length >= MIN_SCANNABLE_CHARS;
      return {
        page_number: idx + 1,
        text: trimmed,
        card_type: 'document_section' as const,
        is_scannable: scannable,
        ...(scannable
          ? {}
          : {
              scan_error:
                parsed.numpages > 1 && trimmed.length < MIN_SCANNABLE_CHARS
                  ? '疑似掃描檔，文字過少無法辨識'
                  : undefined,
            }),
      };
    });

    // Detect scan-only PDFs: many pages but very little text overall
    if (
      parsed.numpages > 1 &&
      fullText.trim().length < MIN_SCANNABLE_CHARS
    ) {
      return [
        {
          page_number: 1,
          text: fullText.trim(),
          card_type: 'document_section',
          is_scannable: false,
          scan_error: '掃描 PDF，無可辨識文字',
        },
      ];
    }

    return pages;
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : String(err);

    return [
      {
        page_number: 1,
        text: '',
        card_type: 'document_section',
        is_scannable: false,
        scan_error: `PDF 解析失敗: ${message}`,
      },
    ];
  }
}

// ---- DOCX extraction ----

async function extractDOCX(buffer: Buffer): Promise<ExtractedPage[]> {
  try {
    const mammothModule = tryRequire<{
      extractRawText: (opts: { buffer: Buffer }) => Promise<MammothResult>;
    }>('mammoth');

    if (!mammothModule) {
      return [
        {
          page_number: 1,
          text: '',
          card_type: 'document_section',
          is_scannable: false,
          scan_error: 'mammoth 套件未安裝，無法解析 DOCX',
        },
      ];
    }

    const result = await mammothModule.extractRawText({ buffer });
    const text = result.value.trim();

    if (!text) {
      return [
        {
          page_number: 1,
          text: '',
          card_type: 'document_section',
          is_scannable: false,
          scan_error: 'DOCX 無文字內容',
        },
      ];
    }

    // Split long documents into ~2000 char sections (rough page approximation)
    const SECTION_SIZE = 2000;
    const pages: ExtractedPage[] = [];

    if (text.length <= SECTION_SIZE) {
      pages.push({
        page_number: 1,
        text,
        card_type: 'document_section',
        is_scannable: true,
      });
    } else {
      let offset = 0;
      let pageNum = 1;
      while (offset < text.length) {
        let end = offset + SECTION_SIZE;
        // Try to break at a paragraph boundary
        if (end < text.length) {
          const nextNewline = text.indexOf('\n', end);
          if (nextNewline !== -1 && nextNewline - end < 500) {
            end = nextNewline + 1;
          }
        } else {
          end = text.length;
        }
        const section = text.slice(offset, end).trim();
        if (section) {
          pages.push({
            page_number: pageNum,
            text: section,
            card_type: 'document_section',
            is_scannable: section.length >= MIN_SCANNABLE_CHARS,
          });
          pageNum++;
        }
        offset = end;
      }
    }

    return pages;
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : String(err);

    return [
      {
        page_number: 1,
        text: '',
        card_type: 'document_section',
        is_scannable: false,
        scan_error: `DOCX 解析失敗: ${message}`,
      },
    ];
  }
}

// ---- Public API ----

/**
 * Extract pages/sections from a file buffer.
 *
 * Currently supports PDF and DOCX. Other formats return a placeholder
 * page with a scan_error.
 */
export async function extractFromBuffer(
  buffer: Buffer,
  mimeType: string,
  fileName: string,
): Promise<ExtractedPage[]> {
  switch (mimeType) {
    case 'application/pdf':
      return extractPDF(buffer);

    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return extractDOCX(buffer);

    case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
      // PPTX: basic stub -- would need a PPTX parser (e.g. pptx-parser)
      return [
        {
          page_number: 1,
          text: '',
          card_type: 'slide',
          is_scannable: false,
          scan_error: `PPTX 解析尚未實作 (${fileName})`,
        },
      ];

    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      return [
        {
          page_number: 1,
          text: '',
          card_type: 'table',
          is_scannable: false,
          scan_error: `XLSX 解析尚未實作 (${fileName})`,
        },
      ];

    case 'application/vnd.google-apps.document':
    case 'application/vnd.google-apps.presentation':
      return [
        {
          page_number: 1,
          text: '',
          card_type: 'document_section',
          is_scannable: false,
          scan_error: `Google 原生格式需透過 Export API 處理 (${fileName})`,
        },
      ];

    default:
      return [
        {
          page_number: 1,
          text: '',
          card_type: 'document_section',
          is_scannable: false,
          scan_error: `不支援的格式: ${mimeType} (${fileName})`,
        },
      ];
  }
}
