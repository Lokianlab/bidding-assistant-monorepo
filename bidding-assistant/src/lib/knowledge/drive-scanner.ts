/**
 * Knowledge Base v2 -- Drive folder scanner
 *
 * Recursively scans Google Drive folders and returns a flat list of DriveFile.
 * Reads folder IDs from env GOOGLE_KB_FOLDER_IDS (comma-separated).
 */

import { getGoogleAccessToken } from '@/lib/patrol/google-auth';
import { SUPPORTED_MIME_TYPES, API_DELAY_MS } from './constants';
import type { DriveFile } from './types';

interface DriveListItem {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
}

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const FOLDER_MIME = 'application/vnd.google-apps.folder';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * List immediate children of a Drive folder.
 * Handles pagination via nextPageToken.
 */
async function listDriveFolderContents(
  folderId: string,
  accessToken: string,
): Promise<DriveListItem[]> {
  const items: DriveListItem[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'nextPageToken, files(id, name, mimeType, size, modifiedTime, webViewLink)',
      pageSize: '100',
      supportsAllDrives: 'true',
      includeItemsFromAllDrives: 'true',
    });
    if (pageToken) {
      params.set('pageToken', pageToken);
    }

    const res = await fetch(`${DRIVE_API_BASE}/files?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`Drive API list failed (${res.status}): ${errBody}`);
    }

    const body = (await res.json()) as {
      files?: DriveListItem[];
      nextPageToken?: string;
    };

    if (body.files) {
      items.push(...body.files);
    }
    pageToken = body.nextPageToken;
  } while (pageToken);

  return items;
}

/**
 * Recursively walk a folder tree, collecting supported files into `results`.
 */
async function scanFolderRecursive(
  folderId: string,
  parentPath: string,
  accessToken: string,
  results: DriveFile[],
): Promise<void> {
  const items = await listDriveFolderContents(folderId, accessToken);

  for (const item of items) {
    if (item.mimeType === FOLDER_MIME) {
      // Recurse into sub-folder
      await delay(API_DELAY_MS);
      await scanFolderRecursive(
        item.id,
        parentPath ? `${parentPath}/${item.name}` : item.name,
        accessToken,
        results,
      );
    } else if (item.mimeType in SUPPORTED_MIME_TYPES) {
      results.push({
        id: item.id,
        name: item.name,
        mimeType: item.mimeType,
        size: item.size ? parseInt(item.size, 10) : 0,
        folderPath: parentPath,
        modifiedTime: item.modifiedTime ?? new Date().toISOString(),
        webViewLink: item.webViewLink ?? '',
      });
    }
    // Unsupported types are silently skipped
  }
}

/**
 * Scan all configured Drive folders and return a flat array of supported files.
 *
 * Set env `GOOGLE_KB_FOLDER_IDS` to a comma-separated list of folder IDs.
 */
export async function scanDriveFolders(): Promise<DriveFile[]> {
  const rawIds = process.env.GOOGLE_KB_FOLDER_IDS;
  if (!rawIds) {
    throw new Error('環境變數 GOOGLE_KB_FOLDER_IDS 未設定');
  }

  const folderIds = rawIds
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

  if (folderIds.length === 0) {
    throw new Error('GOOGLE_KB_FOLDER_IDS 為空');
  }

  const accessToken = await getGoogleAccessToken();
  const results: DriveFile[] = [];

  for (const folderId of folderIds) {
    await scanFolderRecursive(folderId, '', accessToken, results);
    await delay(API_DELAY_MS);
  }

  return results;
}
