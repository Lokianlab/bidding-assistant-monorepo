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
 * 從 /api/pcc 抓取完整公告詳情（Layer A → Layer C 串接）
 *
 * 呼叫既有的 /api/pcc?action=getTenderDetail，將 PCC 動態 key-value
 * 欄位解析為 PccTenderDetail。欄位名稱以中文後綴匹配（同 pcc/helpers.ts）。
 * 任何錯誤（網路、格式、API 錯誤）都回傳 null，orchestrator 自動用 PatrolItem fallback。
 */
export async function apiFetchTenderDetail(
  unitId: string,
  jobNumber: string,
): Promise<PccTenderDetail | null> {
  try {
    const res = await fetch('/api/pcc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'getTenderDetail', data: { unitId, jobNumber } }),
    });

    if (!res.ok) return null;

    const raw = await res.json() as { detail?: Record<string, unknown>; error?: string };
    if (!raw.detail || raw.error) return null;

    const d = raw.detail;

    // 以 key 後綴匹配取值（PCC API key 有前綴但後綴固定）
    const getValue = (suffix: string): string | null => {
      for (const [key, val] of Object.entries(d)) {
        if (key.endsWith(suffix) && typeof val === 'string') return val;
      }
      return null;
    };

    // 解析金額字串 "318,600元" → number
    const parseAmt = (str: string | null): number | null => {
      if (!str) return null;
      const num = Number(str.replace(/[,，元\s]/g, ''));
      return isNaN(num) ? null : num;
    };

    return {
      title: getValue(':標案名稱') ?? getValue(':案名') ?? '',
      budget: parseAmt(getValue(':預算金額')),
      agency: getValue(':機關名稱') ?? '',
      deadline: getValue(':截止投標日期') ?? '',
      publishDate: getValue(':公告日期') ?? '',
      jobNumber,
      unitId,
      url: '', // URL 已在 PatrolItem 中，詳情 API 不提供
      awardType: getValue(':決標方式'),
      category: getValue(':採購類別'),
      contractPeriod: getValue(':履約期限'),
      description: getValue(':工作說明') ?? getValue(':採購說明'),
    };
  } catch {
    return null;
  }
}
