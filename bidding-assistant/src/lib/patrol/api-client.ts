/**
 * P0 巡標：API 客戶端
 *
 * 客戶端（瀏覽器）呼叫 Layer B API routes 的薄包裝。
 * orchestrator 和 UI hooks 透過這些函式間接呼叫伺服器端 API。
 *
 * @see src/app/api/patrol/
 */

import type {
  NotionCaseCreateInput,
  NotionCaseCreateResult,
  NotionCaseUpdateInput,
  NotionCaseUpdateResult,
  DriveCreateFolderInput,
  DriveCreateFolderResult,
  PccTenderDetail,
} from './types';

// ============================================================
// Notion 操作
// ============================================================

/**
 * 呼叫 /api/patrol/notion/create 建立 Notion 案件
 */
export async function apiCreateNotionCase(
  input: NotionCaseCreateInput,
  token: string,
  databaseId: string,
): Promise<NotionCaseCreateResult> {
  try {
    const res = await fetch('/api/patrol/notion/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, databaseId, input }),
    });

    return (await res.json()) as NotionCaseCreateResult;
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : '呼叫建檔 API 失敗',
    };
  }
}

/**
 * 呼叫 /api/patrol/notion/update 更新 Notion 案件
 */
export async function apiUpdateNotionCase(
  input: NotionCaseUpdateInput,
  token: string,
): Promise<NotionCaseUpdateResult> {
  try {
    const res = await fetch('/api/patrol/notion/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, input }),
    });

    return (await res.json()) as NotionCaseUpdateResult;
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : '呼叫更新 API 失敗',
    };
  }
}

// ============================================================
// Drive 操作
// ============================================================

/**
 * 呼叫 /api/patrol/drive/create 建立 Drive 資料夾
 */
export async function apiCreateDriveFolder(
  input: DriveCreateFolderInput,
  accessToken: string,
  parentFolderId: string,
): Promise<DriveCreateFolderResult> {
  try {
    const res = await fetch('/api/patrol/drive/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken, parentFolderId, input }),
    });

    return (await res.json()) as DriveCreateFolderResult;
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : '呼叫建資料夾 API 失敗',
    };
  }
}

// ============================================================
// PCC 操作（Layer A，串接用）
// ============================================================

/**
 * 呼叫既有的 /api/scan 搜尋 PCC
 * 這是 ITEJ 的 W01 scan API，串接時直接使用
 */
export async function apiSearchPcc(
  keywords?: string[],
): Promise<{ results: unknown[]; error?: string }> {
  try {
    const res = await fetch('/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(keywords ? { keywords } : {}),
    });

    return (await res.json()) as { results: unknown[]; error?: string };
  } catch (err: unknown) {
    return {
      results: [],
      error: err instanceof Error ? err.message : '搜尋 PCC 失敗',
    };
  }
}

/**
 * 從 PatrolItem 的 URL 抓取完整公告
 * 目前 Layer A 尚未提供獨立的 tender detail API，
 * 使用 PCC MCP Server 或直接從搜尋結果取得。
 * 這裡提供一個佔位實作，串接時由 Layer A 的實際 API 替換。
 */
export async function apiFetchTenderDetail(
  _unitId: string,
  _jobNumber: string,
): Promise<PccTenderDetail | null> {
  // TODO: 串接 Layer A 的 tender detail API
  // 目前回傳 null，orchestrator 會用 PatrolItem 已有的資料建檔
  return null;
}
