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
import type { ScanResult } from '../scan/types';
import { parseAmount, findDetailValue } from '@/lib/pcc/helpers';

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
): Promise<{ results: ScanResult[]; error?: string }> {
  try {
    const res = await fetch('/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(keywords ? { keywords } : {}),
    });

    return (await res.json()) as { results: ScanResult[]; error?: string };
  } catch (err: unknown) {
    return {
      results: [] as ScanResult[],
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

    return {
      title: findDetailValue(d, ':標案名稱') ?? findDetailValue(d, ':案名') ?? '',
      budget: parseAmount(findDetailValue(d, ':預算金額')),
      agency: findDetailValue(d, ':機關名稱') ?? '',
      deadline: findDetailValue(d, ':截止投標日期') ?? '',
      publishDate: findDetailValue(d, ':公告日期') ?? '',
      jobNumber,
      unitId,
      url: '', // URL 已在 PatrolItem 中，詳情 API 不提供
      awardType: findDetailValue(d, ':決標方式'),
      category: findDetailValue(d, ':採購類別'),
      contractPeriod: findDetailValue(d, ':履約期限'),
      description: findDetailValue(d, ':工作說明') ?? findDetailValue(d, ':採購說明'),
    };
  } catch {
    return null;
  }
}
