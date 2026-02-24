/**
 * Knowledge Base v2 -- Incremental updater
 *
 * Compares current Drive files against the Supabase index and processes
 * only new or modified files.
 */

import { getGoogleAccessToken } from '@/lib/patrol/google-auth';
import { getIndexedFiles, saveCards, deleteCardsByFile } from '@/lib/supabase/cards-client';
import { scanDriveFolders } from './drive-scanner';
import { extractFromBuffer } from './text-extractor';
import { generateCardsForPages } from './card-generator';
import { SUPPORTED_MIME_TYPES, API_DELAY_MS } from './constants';
import type { DriveFile } from './types';
import type { KnowledgeCard } from '@/lib/supabase/types';

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
 * Process a single file for incremental update: download, extract, generate, save.
 */
async function processFileForUpdate(
  file: DriveFile,
  accessToken: string,
  isUpdate: boolean,
): Promise<{ cards: number; error?: string }> {
  const fileType = SUPPORTED_MIME_TYPES[file.mimeType] ?? 'unknown';

  // If updating, delete old cards first
  if (isUpdate) {
    try {
      await deleteCardsByFile(file.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { cards: 0, error: `刪除舊卡片失敗 ${file.name}: ${msg}` };
    }
  }

  // Download
  let buffer: Buffer;
  try {
    buffer = await downloadDriveFile(file.id, accessToken);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { cards: 0, error: `下載失敗 ${file.name}: ${msg}` };
  }

  // Extract
  const pages = await extractFromBuffer(buffer, file.mimeType, file.name);

  // Generate cards
  const generatedCards = await generateCardsForPages(pages, {
    name: file.name,
    folderPath: file.folderPath,
  });

  // Build records
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

  // Save
  if (cardRecords.length > 0) {
    try {
      const result = await saveCards(cardRecords);
      if (result.errors > 0) {
        return { cards: result.saved, error: `${file.name}: ${result.errors} 張卡片儲存失敗` };
      }
      return { cards: result.saved };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { cards: 0, error: `儲存失敗 ${file.name}: ${msg}` };
    }
  }

  return { cards: 0 };
}

/**
 * Run incremental update: only process new or modified files.
 *
 * Comparison logic:
 * - Files in Drive but not in Supabase -> new, process them
 * - Files in Drive with modifiedTime newer than indexed_at -> updated, re-process
 * - Files in Supabase but not in Drive -> orphaned (not deleted, just skipped)
 */
export async function incrementalUpdate(): Promise<{
  new_cards: number;
  updated_cards: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let newCards = 0;
  let updatedCards = 0;

  // 1. Scan current Drive files
  let driveFiles: DriveFile[];
  try {
    driveFiles = await scanDriveFolders();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { new_cards: 0, updated_cards: 0, errors: [`Drive 掃描失敗: ${msg}`] };
  }

  // 2. Get indexed files from Supabase
  let indexedFiles: { source_file_id: string; indexed_at: string }[];
  try {
    indexedFiles = await getIndexedFiles();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { new_cards: 0, updated_cards: 0, errors: [`索引查詢失敗: ${msg}`] };
  }

  // Build lookup map: fileId -> indexed_at
  const indexedMap = new Map<string, string>();
  for (const file of indexedFiles) {
    indexedMap.set(file.source_file_id, file.indexed_at);
  }

  // 3. Determine which files need processing
  const toProcess: Array<{ file: DriveFile; isUpdate: boolean }> = [];

  for (const file of driveFiles) {
    const indexedAt = indexedMap.get(file.id);

    if (!indexedAt) {
      // New file
      toProcess.push({ file, isUpdate: false });
    } else {
      // Check if modified since last index
      const fileModified = new Date(file.modifiedTime).getTime();
      const lastIndexed = new Date(indexedAt).getTime();

      if (fileModified > lastIndexed) {
        toProcess.push({ file, isUpdate: true });
      }
      // Otherwise: up to date, skip
    }
  }

  if (toProcess.length === 0) {
    return { new_cards: 0, updated_cards: 0, errors: [] };
  }

  // 4. Process files
  const accessToken = await getGoogleAccessToken();

  for (const { file, isUpdate } of toProcess) {
    const result = await processFileForUpdate(file, accessToken, isUpdate);

    if (isUpdate) {
      updatedCards += result.cards;
    } else {
      newCards += result.cards;
    }

    if (result.error) {
      errors.push(result.error);
    }

    await delay(API_DELAY_MS);
  }

  return { new_cards: newCards, updated_cards: updatedCards, errors };
}
