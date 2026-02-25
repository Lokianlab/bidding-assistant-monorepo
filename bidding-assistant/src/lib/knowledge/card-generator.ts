/**
 * Knowledge Base v2 -- AI card generation
 *
 * Generates structured knowledge cards from extracted text using
 * the Claude CLI on the local machine. Falls back to basic heuristic
 * cards if the CLI is unavailable.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { SCAN_BATCH_SIZE, CATEGORIES } from './constants';
import type { ExtractedPage, CardGenerationInput, GeneratedCard } from './types';

const execAsync = promisify(exec);

/**
 * Build a prompt that asks Claude to produce a JSON array of cards.
 * All output in Traditional Chinese.
 */
function buildCardGenerationPrompt(pages: CardGenerationInput[]): string {
  const categoryList = CATEGORIES.join('、');

  const pagesJson = pages.map((p) => ({
    page_number: p.page_number,
    text: p.text.slice(0, 1500), // cap to keep prompt manageable
    source_file_name: p.source_file_name,
    source_folder_path: p.source_folder_path,
  }));

  return `你是一位標案知識整理專家。
請根據以下文件頁面內容，為每一頁產生一張知識卡片。

回覆格式：嚴格 JSON 陣列，不要任何解釋文字。
每張卡片格式：
{
  "title": "簡短標題（繁體中文，15字以內）",
  "summary": "摘要（繁體中文，50-100字）",
  "tags": ["標籤1", "標籤2", "標籤3"],
  "category": "主分類",
  "subcategory": "子分類"
}

主分類必須是以下之一：${categoryList}
子分類可自由命名，但需與主分類相關。
tags 最多 5 個，使用繁體中文。

頁面資料：
${JSON.stringify(pagesJson, null, 2)}

請回覆 JSON 陣列（每頁一張卡片，順序與輸入一致）：`;
}

/**
 * Parse the JSON array from Claude's response.
 * Handles cases where the response contains markdown fences or extra text.
 */
function parseCardResponse(response: string): GeneratedCard[] {
  // Try direct parse first
  try {
    const parsed: unknown = JSON.parse(response.trim());
    if (Array.isArray(parsed)) {
      return validateCards(parsed);
    }
  } catch {
    // not raw JSON -- try extracting
  }

  // Extract JSON from markdown code block
  const fenceMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch?.[1]) {
    try {
      const parsed: unknown = JSON.parse(fenceMatch[1].trim());
      if (Array.isArray(parsed)) {
        return validateCards(parsed);
      }
    } catch {
      // fall through
    }
  }

  // Try to find first [ ... ] in response
  const bracketStart = response.indexOf('[');
  const bracketEnd = response.lastIndexOf(']');
  if (bracketStart !== -1 && bracketEnd > bracketStart) {
    try {
      const parsed: unknown = JSON.parse(response.slice(bracketStart, bracketEnd + 1));
      if (Array.isArray(parsed)) {
        return validateCards(parsed);
      }
    } catch {
      // give up
    }
  }

  return [];
}

/** Validate and sanitize an array of parsed card objects. */
function validateCards(items: unknown[]): GeneratedCard[] {
  const validCategories = new Set<string>(CATEGORIES);

  return items
    .filter((item): item is Record<string, unknown> => {
      return typeof item === 'object' && item !== null && !Array.isArray(item);
    })
    .map((item) => ({
      title: typeof item.title === 'string' ? item.title.slice(0, 100) : '未命名',
      summary: typeof item.summary === 'string' ? item.summary.slice(0, 500) : '',
      tags: Array.isArray(item.tags)
        ? item.tags.filter((t): t is string => typeof t === 'string').slice(0, 5)
        : [],
      category: typeof item.category === 'string' && validCategories.has(item.category)
        ? item.category
        : '其他',
      subcategory: typeof item.subcategory === 'string' ? item.subcategory : '',
    }));
}

/**
 * Generate a basic fallback card from page text when AI is unavailable.
 */
function makeFallbackCard(input: CardGenerationInput): GeneratedCard {
  const titleText = input.text.replace(/\s+/g, ' ').trim();
  return {
    title: titleText.slice(0, 15) || input.source_file_name,
    summary: titleText.slice(0, 100) || `${input.source_file_name} 第 ${input.page_number} 頁`,
    tags: [],
    category: '其他',
    subcategory: '',
  };
}

/**
 * Generate knowledge cards for a set of extracted pages.
 *
 * Batches pages in groups of SCAN_BATCH_SIZE and calls the Claude CLI
 * for each batch. Falls back to heuristic cards on failure.
 */
export async function generateCardsForPages(
  pages: ExtractedPage[],
  sourceFile: { name: string; folderPath: string },
): Promise<GeneratedCard[]> {
  // Only process scannable pages with actual text
  const scannablePages = pages.filter((p) => p.is_scannable && p.text.trim().length > 0);

  if (scannablePages.length === 0) {
    // Return one placeholder card per non-scannable page
    return pages.map((p) =>
      makeFallbackCard({
        page_number: p.page_number,
        text: p.text,
        source_file_name: sourceFile.name,
        source_folder_path: sourceFile.folderPath,
      }),
    );
  }

  const allCards: GeneratedCard[] = [];

  for (let i = 0; i < scannablePages.length; i += SCAN_BATCH_SIZE) {
    const batch = scannablePages.slice(i, i + SCAN_BATCH_SIZE);
    const inputs: CardGenerationInput[] = batch.map((p) => ({
      page_number: p.page_number,
      text: p.text,
      source_file_name: sourceFile.name,
      source_folder_path: sourceFile.folderPath,
    }));

    const prompt = buildCardGenerationPrompt(inputs);

    try {
      // Use Claude CLI (claude) with --print for non-interactive output
      const { stdout } = await execAsync(
        `echo ${JSON.stringify(prompt)} | claude --print`,
        { maxBuffer: 10 * 1024 * 1024, timeout: 120_000 },
      );

      const parsed = parseCardResponse(stdout);

      if (parsed.length === batch.length) {
        allCards.push(...parsed);
      } else if (parsed.length > 0) {
        // Partial match: use what we got, fallback for the rest
        allCards.push(...parsed);
        for (let j = parsed.length; j < batch.length; j++) {
          allCards.push(makeFallbackCard(inputs[j]));
        }
      } else {
        // Complete parse failure
        allCards.push(...inputs.map(makeFallbackCard));
      }
    } catch {
      // CLI not available or timed out -- fallback
      allCards.push(...inputs.map(makeFallbackCard));
    }
  }

  return allCards;
}
