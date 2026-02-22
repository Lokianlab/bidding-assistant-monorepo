/**
 * P0 巡標 Layer B：Google Drive 資料夾建立
 *
 * 按照命名規則建立備標資料夾，並從範本複製子資料夾。
 * Google Drive API 授權尚未確認，API 呼叫部分預留接口。
 *
 * @see docs/plans/P0-patrol-automation.md
 */

import type { DriveCreateFolderInput, DriveCreateFolderResult } from './types';
import { convertToROCDate } from './converter';

// ============================================================
// 資料夾命名規則
// ============================================================

/**
 * Drive 資料夾命名格式：`({案件唯一碼})({民國年}.{月}.{日}){標案名稱}`
 *
 * 例：(PCC-001)(115.02.22)食農教育推廣計畫
 *
 * @param input - 建資料夾的輸入
 * @returns 格式化的資料夾名稱
 */
export function formatDriveFolderName(input: DriveCreateFolderInput): string {
  const rocDate = convertToROCDate(input.publishDate);
  const cleanTitle = input.title.trim();
  return `(${input.caseUniqueId})(${rocDate})${cleanTitle}`;
}

/**
 * Drive 資料夾的父目錄路徑
 * 位置：共用雲端硬碟/專案執行中心/B. 備標集中區/
 */
export const DRIVE_PARENT_PATH = '共用雲端硬碟/專案執行中心/B. 備標集中區';

/**
 * 範本子資料夾列表
 * 新建的備標資料夾會從範本複製這些子資料夾結構
 */
export const TEMPLATE_SUBFOLDERS = [
  '服務建議書',
  '備標評估文件',
] as const;

// ============================================================
// Drive API 呼叫
// ============================================================

/**
 * Google Drive 建資料夾
 *
 * 完整流程：
 * 1. 在「B. 備標集中區」下建立以命名規則命名的資料夾
 * 2. 在新資料夾中建立子資料夾結構（從範本）
 * 3. 回傳資料夾 ID 和 URL
 *
 * @param input - 建資料夾的輸入
 * @param accessToken - Google Drive OAuth2 access token
 * @param parentFolderId - 父資料夾 ID（B. 備標集中區）
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

/** Google Drive API 回應（簡化） */
interface DriveFileResponse {
  id?: string;
  name?: string;
  webViewLink?: string;
  error?: { message?: string };
}

/**
 * 呼叫 Google Drive API 建立資料夾
 *
 * @param name - 資料夾名稱
 * @param parentId - 父資料夾 ID
 * @param accessToken - OAuth2 access token
 */
async function createGoogleDriveFolder(
  name: string,
  parentId: string,
  accessToken: string,
): Promise<DriveFileResponse> {
  const res = await fetch('https://www.googleapis.com/drive/v3/files', {
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
  });

  const data = (await res.json()) as DriveFileResponse;

  if (!res.ok) {
    throw new Error(data.error?.message ?? `Drive API 錯誤 (${res.status})`);
  }

  return data;
}
