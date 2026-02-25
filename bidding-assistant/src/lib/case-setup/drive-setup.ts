/** M01 案件建立模組 — Google Drive 資料夾建立與鷹架複製 */

import { formatDriveFolderName } from './helpers';
import type { DriveCreateFolderInput, DriveItem, ScaffoldCopyResult } from './types';

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';

/** 共用的 Drive API 查詢參數（支援共用雲端硬碟） */
const SHARED_DRIVE_PARAMS = 'supportsAllDrives=true&includeItemsFromAllDrives=true';

/** Google Drive 資料夾 MIME type */
const FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder';

// ── 內部 API 工具函式 ────────────────────────────────────

/** Drive API 檔案清單回應 */
interface DriveListResponse {
  files?: DriveItem[];
  error?: { message: string; code: number };
}

/** Drive API 檔案建立/複製回應 */
interface DriveFileResponse {
  id?: string;
  name?: string;
  error?: { message: string; code: number };
}

/**
 * 列出 Drive 資料夾內容
 */
async function listDriveFolder(
  folderId: string,
  accessToken: string,
): Promise<DriveItem[]> {
  const query = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
  const url = `${DRIVE_API_BASE}/files?q=${query}&fields=files(id,name,mimeType)&${SHARED_DRIVE_PARAMS}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const data: DriveListResponse = await res.json();

  if (!res.ok || data.error) {
    throw new Error(data.error?.message ?? `Drive 列出資料夾失敗 (${res.status})`);
  }

  return data.files ?? [];
}

/**
 * 建立 Google Drive 資料夾
 */
async function createGoogleDriveFolder(
  name: string,
  parentId: string,
  accessToken: string,
): Promise<{ id: string }> {
  const url = `${DRIVE_API_BASE}/files?${SHARED_DRIVE_PARAMS}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      mimeType: FOLDER_MIME_TYPE,
      parents: [parentId],
    }),
  });

  const data: DriveFileResponse = await res.json();

  if (!res.ok || data.error || !data.id) {
    throw new Error(data.error?.message ?? `Drive 建立資料夾失敗 (${res.status})`);
  }

  return { id: data.id };
}

/**
 * 複製 Google Drive 檔案到目標資料夾
 */
async function copyDriveFile(
  fileId: string,
  targetFolderId: string,
  name: string,
  accessToken: string,
): Promise<void> {
  const url = `${DRIVE_API_BASE}/files/${fileId}/copy?${SHARED_DRIVE_PARAMS}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      parents: [targetFolderId],
    }),
  });

  const data: DriveFileResponse = await res.json();

  if (!res.ok || data.error) {
    throw new Error(data.error?.message ?? `Drive 複製檔案失敗: ${name} (${res.status})`);
  }
}

// ── 匯出函式 ────────────────────────────────────────────

/**
 * 建立案件資料夾
 *
 * 在指定的父資料夾下建立格式化命名的案件資料夾。
 *
 * @param input - 資料夾建立參數
 * @param accessToken - Google OAuth2 access token
 * @returns 資料夾 ID 和 URL
 */
export async function createCaseFolder(
  input: DriveCreateFolderInput,
  accessToken: string,
): Promise<{ id: string; url: string }> {
  const folderName = formatDriveFolderName(input);
  const result = await createGoogleDriveFolder(folderName, input.parentFolderId, accessToken);

  return {
    id: result.id,
    url: `https://drive.google.com/drive/folders/${result.id}`,
  };
}

/**
 * 將鷹架範本複製到案件資料夾
 *
 * 遞迴複製 GOOGLE_SCAFFOLD_FOLDER_ID 環境變數指定的範本資料夾結構。
 * 資料夾會重新建立，檔案用 Drive copy API 複製。
 *
 * @param caseFolderId - 目標案件資料夾 ID
 * @param accessToken - Google OAuth2 access token
 * @returns 複製結果（成功數量 + 錯誤清單）
 */
export async function copyScaffoldToCase(
  caseFolderId: string,
  accessToken: string,
): Promise<ScaffoldCopyResult> {
  const scaffoldFolderId = process.env.GOOGLE_SCAFFOLD_FOLDER_ID;
  if (!scaffoldFolderId) {
    throw new Error('GOOGLE_SCAFFOLD_FOLDER_ID 環境變數未設定');
  }

  const result: ScaffoldCopyResult = { copied: 0, errors: [] };

  await copyFolderContents(scaffoldFolderId, caseFolderId, accessToken, result);

  return result;
}

/**
 * 遞迴複製資料夾內容
 *
 * @param sourceFolderId - 來源資料夾 ID
 * @param targetFolderId - 目標資料夾 ID
 * @param accessToken - Google OAuth2 access token
 * @param result - 累積結果物件（mutate）
 */
async function copyFolderContents(
  sourceFolderId: string,
  targetFolderId: string,
  accessToken: string,
  result: ScaffoldCopyResult,
): Promise<void> {
  const items = await listDriveFolder(sourceFolderId, accessToken);

  for (const item of items) {
    try {
      if (item.mimeType === FOLDER_MIME_TYPE) {
        // 子資料夾：建立新資料夾後遞迴
        const newFolder = await createGoogleDriveFolder(item.name, targetFolderId, accessToken);
        await copyFolderContents(item.id, newFolder.id, accessToken, result);
      } else {
        // 檔案：直接複製
        await copyDriveFile(item.id, targetFolderId, item.name, accessToken);
        result.copied += 1;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      result.errors.push(`${item.name}: ${message}`);
    }
  }
}
