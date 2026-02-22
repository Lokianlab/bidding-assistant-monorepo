/**
 * P0 巡標 Layer B：Google Drive 資料夾建立
 *
 * 在共用雲端硬碟的「B. 備標集中區」自動建立備標資料夾。
 * 用 OAuth2 refresh token 自動換 access token，不需手動管理。
 *
 * @see docs/plans/P0-patrol-automation.md
 */

import type { DriveCreateFolderInput, DriveCreateFolderResult } from './types';
import { convertToROCDate } from './converter';
import { getGoogleAccessToken } from './google-auth';

// ============================================================
// 資料夾命名規則
// ============================================================

/**
 * Drive 資料夾命名格式：`({案件唯一碼})({民國年}.{月}.{日}){標案名稱}`
 *
 * 例：(PCC-001)(115.02.22)食農教育推廣計畫
 */
export function formatDriveFolderName(input: DriveCreateFolderInput): string {
  const rocDate = convertToROCDate(input.publishDate);
  const cleanTitle = input.title.trim();
  return `(${input.caseUniqueId})(${rocDate})${cleanTitle}`;
}

/**
 * Drive 資料夾的父目錄路徑（參考用，實際用 GOOGLE_SHARED_DRIVE_FOLDER_ID）
 */
export const DRIVE_PARENT_PATH = '共用雲端硬碟/專案執行中心/B. 備標集中區';

/**
 * 範本子資料夾列表
 */
export const TEMPLATE_SUBFOLDERS = [
  '服務建議書',
  '備標評估文件',
] as const;

// ============================================================
// 對外 API（自動處理認證）
// ============================================================

/**
 * 建立備標 Drive 資料夾（自動取 token）
 *
 * 從環境變數讀取 OAuth 憑證和父資料夾 ID，全自動。
 * 流程：換 access token → 建主資料夾 → 建子資料夾 → 回傳結果
 */
export async function createDriveFolderAuto(
  input: DriveCreateFolderInput,
): Promise<DriveCreateFolderResult> {
  const parentFolderId = process.env.GOOGLE_SHARED_DRIVE_FOLDER_ID;
  if (!parentFolderId) {
    return { success: false, error: '未設定 GOOGLE_SHARED_DRIVE_FOLDER_ID' };
  }

  try {
    const accessToken = await getGoogleAccessToken();
    return await createDriveFolder(input, accessToken, parentFolderId);
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : '取得 Google 授權失敗',
    };
  }
}

// ============================================================
// 核心邏輯（可手動傳 token，方便測試）
// ============================================================

/**
 * Google Drive 建資料夾
 *
 * 1. 在父資料夾下建立以命名規則命名的資料夾
 * 2. 在新資料夾中建立子資料夾結構
 * 3. 回傳資料夾 ID 和 URL
 */
export async function createDriveFolder(
  input: DriveCreateFolderInput,
  accessToken: string,
  parentFolderId: string,
): Promise<DriveCreateFolderResult> {
  if (!accessToken) {
    return { success: false, error: '缺少 Google Drive access token' };
  }

  if (!parentFolderId) {
    return { success: false, error: '缺少父資料夾 ID' };
  }

  if (!input.caseUniqueId || !input.title) {
    return { success: false, error: '缺少必要欄位（caseUniqueId 或 title）' };
  }

  const folderName = formatDriveFolderName(input);

  try {
    // Step 1: 建立主資料夾
    const mainFolder = await createGoogleDriveFolder(
      folderName,
      parentFolderId,
      accessToken,
    );

    if (!mainFolder.id) {
      return { success: false, error: '建立主資料夾失敗' };
    }

    // Step 2: 建立子資料夾
    await Promise.all(
      TEMPLATE_SUBFOLDERS.map((name) =>
        createGoogleDriveFolder(name, mainFolder.id!, accessToken),
      ),
    );

    return {
      success: true,
      folderId: mainFolder.id,
      folderUrl: `https://drive.google.com/drive/folders/${mainFolder.id}`,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : '建立資料夾錯誤',
    };
  }
}

// ============================================================
// Google Drive API 底層呼叫
// ============================================================

interface DriveFileResponse {
  id?: string;
  name?: string;
  webViewLink?: string;
  error?: { message?: string };
}

/**
 * 呼叫 Google Drive API 建立資料夾
 *
 * 加上 supportsAllDrives 支援共用雲端硬碟
 */
async function createGoogleDriveFolder(
  name: string,
  parentId: string,
  accessToken: string,
): Promise<DriveFileResponse> {
  const res = await fetch(
    'https://www.googleapis.com/drive/v3/files?supportsAllDrives=true',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentId],
      }),
    },
  );

  const data = (await res.json()) as DriveFileResponse;

  if (!res.ok) {
    throw new Error(data.error?.message ?? `Drive API 錯誤 (${res.status})`);
  }

  return data;
}
