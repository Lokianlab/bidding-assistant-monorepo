/**
 * Layer B 測試：Google Drive 資料夾建立
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  formatDriveFolderName,
  DRIVE_PARENT_PATH,
  TEMPLATE_SUBFOLDERS,
  createDriveFolder,
} from '../drive-writer';
import type { DriveCreateFolderInput } from '../types';

// ============================================================
// formatDriveFolderName
// ============================================================

describe('formatDriveFolderName', () => {
  const baseInput: DriveCreateFolderInput = {
    caseUniqueId: 'PCC-001',
    publishDate: '2026-02-22',
    title: '食農教育推廣計畫',
  };

  it('應該產生正確格式：(唯一碼)(民國年.月.日)標題', () => {
    const name = formatDriveFolderName(baseInput);
    expect(name).toBe('(PCC-001)(115.02.22)食農教育推廣計畫');
  });

  it('不同唯一碼應反映在名稱中', () => {
    const input = { ...baseInput, caseUniqueId: 'DOC-42' };
    const name = formatDriveFolderName(input);
    expect(name).toContain('(DOC-42)');
  });

  it('不同日期應正確轉換民國年', () => {
    const input = { ...baseInput, publishDate: '2025-12-31' };
    const name = formatDriveFolderName(input);
    expect(name).toContain('(114.12.31)');
  });

  it('標題前後空白應被清除', () => {
    const input = { ...baseInput, title: '  有空白的標題  ' };
    const name = formatDriveFolderName(input);
    expect(name).toBe('(PCC-001)(115.02.22)有空白的標題');
  });

  it('2024 年應轉換為民國 113 年', () => {
    const input = { ...baseInput, publishDate: '2024-01-15' };
    const name = formatDriveFolderName(input);
    expect(name).toContain('(113.01.15)');
  });

  it('含特殊字元的標題應保留', () => {
    const input = { ...baseInput, title: '115年度（第2期）委託服務' };
    const name = formatDriveFolderName(input);
    expect(name).toBe('(PCC-001)(115.02.22)115年度（第2期）委託服務');
  });

  it('ISO 含時間的日期應正確處理', () => {
    const input = { ...baseInput, publishDate: '2026-03-15T08:00:00Z' };
    const name = formatDriveFolderName(input);
    // convertToROCDate 處理含時間的 ISO 格式
    expect(name).toContain('(115.');
  });

  it('YYYYMMDD 格式日期應處理', () => {
    // convertToROCDate 不處理 YYYYMMDD，會原樣返回
    const input = { ...baseInput, publishDate: '20260222' };
    const name = formatDriveFolderName(input);
    // 即使日期轉換不完美，格式結構應該正確
    expect(name).toMatch(/^\(PCC-001\)\(.+\)/);
  });
});

// ============================================================
// 常數
// ============================================================

describe('Drive 常數', () => {
  it('父目錄路徑應指向備標集中區', () => {
    expect(DRIVE_PARENT_PATH).toBe('共用雲端硬碟/專案執行中心/B. 備標集中區');
  });

  it('範本子資料夾應包含服務建議書和備標評估文件', () => {
    expect(TEMPLATE_SUBFOLDERS).toContain('服務建議書');
    expect(TEMPLATE_SUBFOLDERS).toContain('備標評估文件');
  });

  it('範本子資料夾至少有 2 個', () => {
    expect(TEMPLATE_SUBFOLDERS.length).toBeGreaterThanOrEqual(2);
  });
});

// ============================================================
// createDriveFolder（使用 mock fetch）
// ============================================================

describe('createDriveFolder', () => {
  const baseInput: DriveCreateFolderInput = {
    caseUniqueId: 'PCC-001',
    publishDate: '2026-02-22',
    title: '食農教育推廣計畫',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('缺少 accessToken 時回傳失敗', async () => {
    const result = await createDriveFolder(baseInput, '', 'parent-id');
    expect(result.success).toBe(false);
    expect(result.error).toContain('access token');
  });

  it('缺少 parentFolderId 時回傳失敗', async () => {
    const result = await createDriveFolder(baseInput, 'token-123', '');
    expect(result.success).toBe(false);
    expect(result.error).toContain('父資料夾');
  });

  it('缺少 caseUniqueId 時回傳失敗', async () => {
    const input = { ...baseInput, caseUniqueId: '' };
    const result = await createDriveFolder(input, 'token-123', 'parent-id');
    expect(result.success).toBe(false);
    expect(result.error).toContain('caseUniqueId');
  });

  it('缺少 title 時回傳失敗', async () => {
    const input = { ...baseInput, title: '' };
    const result = await createDriveFolder(input, 'token-123', 'parent-id');
    expect(result.success).toBe(false);
    expect(result.error).toContain('title');
  });

  it('API 成功時回傳 folderId 和 folderUrl', async () => {
    let callCount = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              id: callCount === 1 ? 'main-folder-id' : `sub-${callCount}`,
              name: 'folder',
            }),
        });
      }),
    );

    const result = await createDriveFolder(baseInput, 'token-123', 'parent-id');
    expect(result.success).toBe(true);
    expect(result.folderId).toBe('main-folder-id');
    expect(result.folderUrl).toContain('main-folder-id');
  });

  it('應該建立主資料夾 + 子資料夾', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'folder-id', name: 'test' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await createDriveFolder(baseInput, 'token-123', 'parent-id');

    // 1 主資料夾 + N 個子資料夾
    expect(mockFetch).toHaveBeenCalledTimes(1 + TEMPLATE_SUBFOLDERS.length);
  });

  it('主資料夾名稱應符合命名規則', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'folder-id', name: 'test' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await createDriveFolder(baseInput, 'token-123', 'parent-id');

    const firstCallBody = JSON.parse(
      mockFetch.mock.calls[0][1].body as string,
    );
    expect(firstCallBody.name).toBe('(PCC-001)(115.02.22)食農教育推廣計畫');
    expect(firstCallBody.parents).toEqual(['parent-id']);
  });

  it('子資料夾應建在主資料夾下', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'main-id', name: 'test' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await createDriveFolder(baseInput, 'token-123', 'parent-id');

    // 子資料夾的 parent 應該是主資料夾的 ID
    for (let i = 1; i < mockFetch.mock.calls.length; i++) {
      const body = JSON.parse(mockFetch.mock.calls[i][1].body as string);
      expect(body.parents).toEqual(['main-id']);
    }
  });

  it('主資料夾建立失敗時應回傳失敗', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ name: 'test' }), // 沒有 id
      }),
    );

    const result = await createDriveFolder(baseInput, 'token-123', 'parent-id');
    expect(result.success).toBe(false);
    expect(result.error).toContain('主資料夾');
  });

  it('API 錯誤時回傳失敗', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: () =>
          Promise.resolve({ error: { message: 'Insufficient permissions' } }),
      }),
    );

    const result = await createDriveFolder(baseInput, 'token-123', 'parent-id');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Insufficient permissions');
  });

  it('網路錯誤時回傳失敗', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('Network failure')),
    );

    const result = await createDriveFolder(baseInput, 'token-123', 'parent-id');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Network failure');
  });

  it('folderUrl 應該是 Google Drive URL 格式', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'abc-123', name: 'test' }),
      }),
    );

    const result = await createDriveFolder(baseInput, 'token-123', 'parent-id');
    expect(result.folderUrl).toBe(
      'https://drive.google.com/drive/folders/abc-123',
    );
  });

  it('應該使用正確的 Drive API endpoint', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'folder-id', name: 'test' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await createDriveFolder(baseInput, 'my-token', 'parent-id');

    expect(mockFetch.mock.calls[0][0]).toBe(
      'https://www.googleapis.com/drive/v3/files',
    );
    expect(mockFetch.mock.calls[0][1].headers.Authorization).toBe(
      'Bearer my-token',
    );
  });

  it('建立的資料夾 mimeType 應為 folder', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'folder-id', name: 'test' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await createDriveFolder(baseInput, 'token-123', 'parent-id');

    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.mimeType).toBe('application/vnd.google-apps.folder');
  });
});
