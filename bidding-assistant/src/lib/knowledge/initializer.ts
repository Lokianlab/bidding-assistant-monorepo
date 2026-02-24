/**
 * Knowledge Base v2 -- Full initialization pipeline
 *
 * Scans all Drive files, extracts text, generates cards, and saves to Supabase.
 * This is a long-running process designed to be called from an API route.
 */

import { getGoogleAccessToken } from '@/lib/patrol/google-auth';
import { saveCards } from '@/lib/supabase/cards-client';
import { scanDriveFolders } from './drive-scanner';
import { extractFromBuffer } from './text-extractor';
import { generateCardsForPages } from './card-generator';
import { SUPPORTED_MIME_TYPES, API_DELAY_MS } from './constants';
import type { DriveFile, InitProgress, IndexStatus } from './types';
import type { KnowledgeCard } from '@/lib/supabase/types';

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Download a file from Google Drive by its file ID.
 */
async function downloadDriveFile(
  fileId: string,
  accessToken: string,
): Promise<Buffer> {
  const res = await fetch(
    `${DRIVE_API_BASE}/files/${fileId}?alt=media&supportsAllDrives=true`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`Drive 下載失敗 (${res.status}): ${errBody}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Process a single Drive file: download, extract, generate cards, save.
 * Returns the number of cards saved.
 */
async function processFile(
  file: DriveFile,
  accessToken: string,
): Promise<{ cardCount: number; errors: string[] }> {
  const errors: string[] = [];
  const fileType = SUPPORTED_MIME_TYPES[file.mimeType] ?? 'unknown';

  // 1. Download
  let buffer: Buffer;
  try {
    buffer = await downloadDriveFile(file.id, accessToken);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { cardCount: 0, errors: [`下載失敗 ${file.name}: ${msg}`] };
  }

  // 2. Extract text
  const pages = await extractFromBuffer(buffer, file.mimeType, file.name);

  // 3. Generate cards
  const generatedCards = await generateCardsForPages(pages, {
    name: file.name,
    folderPath: file.folderPath,
  });

  // 4. Build card records for Supabase
  const cardRecords: Omit<KnowledgeCard, 'id' | 'indexed_at' | 'updated_at'>[] = [];

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const generated = generatedCards[i];

    cardRecords.push({
      source_file_id: file.id,
      source_file_name: file.name,
      source_folder_path: file.folderPath || null,
      page_number: page.page_number,
      card_type: page.card_type,
      title: generated?.title ?? null,
      summary: generated?.summary ?? page.text.slice(0, 200),
      content_text: page.text || null,
      tags: generated?.tags ?? [],
      category: generated?.category ?? null,
      subcategory: generated?.subcategory ?? null,
      file_type: fileType,
      mime_type: file.mimeType,
      is_scannable: page.is_scannable,
      scan_error: page.scan_error ?? null,
      drive_url: file.webViewLink || null,
    });
  }

  // 5. Save to Supabase
  if (cardRecords.length > 0) {
    try {
      const result = await saveCards(cardRecords);
      if (result.errors > 0) {
        errors.push(`${file.name}: ${result.errors} 張卡片儲存失敗`);
      }
      return { cardCount: result.saved, errors };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`儲存失敗 ${file.name}: ${msg}`);
      return { cardCount: 0, errors };
    }
  }

  return { cardCount: 0, errors };
}

/**
 * Run full knowledge base initialization.
 *
 * Scans Drive folders, processes every file, and reports progress through
 * the optional callback.
 */
export async function initializeKnowledgeBase(
  onProgress?: (progress: InitProgress) => void,
): Promise<InitProgress> {
  const progress: InitProgress = {
    total_files: 0,
    processed_files: 0,
    total_cards: 0,
    errors: [],
    status: 'scanning' as IndexStatus,
    started_at: new Date().toISOString(),
  };

  const report = () => {
    if (onProgress) {
      onProgress({ ...progress });
    }
  };

  // 1. Scan Drive folders
  let files: DriveFile[];
  try {
    report();
    files = await scanDriveFolders();
    progress.total_files = files.length;
    progress.status = 'processing';
    report();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    progress.errors.push(`Drive 掃描失敗: ${msg}`);
    progress.status = 'error';
    report();
    return progress;
  }

  if (files.length === 0) {
    progress.status = 'done';
    report();
    return progress;
  }

  // 2. Process each file
  const accessToken = await getGoogleAccessToken();

  for (const file of files) {
    progress.current_file = file.name;
    report();

    const { cardCount, errors } = await processFile(file, accessToken);
    progress.processed_files++;
    progress.total_cards += cardCount;
    progress.errors.push(...errors);
    report();

    // Rate limiting
    await delay(API_DELAY_MS);
  }

  progress.status = progress.errors.length > 0 ? 'done' : 'done';
  progress.current_file = undefined;
  report();

  return progress;
}
