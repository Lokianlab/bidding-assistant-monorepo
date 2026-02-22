/**
 * orchestrateAccept 整合測試
 *
 * 驗證一鍵上新的完整編排流程：
 * Notion 建檔 → Drive 資料夾 → 摘要/情蒐 → 回寫 Notion
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { orchestrateAccept, type AcceptConfig } from '../orchestrator';
import type { PatrolItem } from '../types';

// Mock api-client（不 mock fetch，mock 高階函式）
vi.mock('../api-client', () => ({
  apiCreateNotionCase: vi.fn(),
  apiUpdateNotionCase: vi.fn(),
  apiCreateDriveFolder: vi.fn(),
  apiFetchTenderDetail: vi.fn(),
}));

// Mock converter
vi.mock('../converter', () => ({
  convertToNotionInput: vi.fn(),
}));

import {
  apiCreateNotionCase,
  apiUpdateNotionCase,
  apiCreateDriveFolder,
  apiFetchTenderDetail,
} from '../api-client';
import { convertToNotionInput } from '../converter';

const mockCreateNotion = apiCreateNotionCase as ReturnType<typeof vi.fn>;
const mockUpdateNotion = apiUpdateNotionCase as ReturnType<typeof vi.fn>;
const mockCreateDrive = apiCreateDriveFolder as ReturnType<typeof vi.fn>;
const mockFetchDetail = apiFetchTenderDetail as ReturnType<typeof vi.fn>;
const mockConvert = convertToNotionInput as ReturnType<typeof vi.fn>;

// ── 測試資料 ───────────────────────────────────────────

const sampleItem: PatrolItem = {
  id: 'unit001-JOB001',
  title: '114年度食農教育推廣計畫',
  budget: 500_000,
  agency: '教育局',
  deadline: '2026-03-15',
  publishDate: '2026-02-27',
  jobNumber: 'JOB001',
  unitId: 'unit001',
  url: 'https://pcc.g0v.ronny.tw/tender/JOB001',
  category: 'definite',
  status: 'new',
};

const fullConfig: AcceptConfig = {
  notionToken: 'ntn_test_token',
  notionDatabaseId: 'db_test_id',
  driveAccessToken: 'ya29.test_drive_token',
  driveParentFolderId: 'folder_parent_id',
};

const notionOnlyConfig: AcceptConfig = {
  notionToken: 'ntn_test_token',
  notionDatabaseId: 'db_test_id',
  // 沒有 Drive 設定
};

// ── 測試 ─────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  // 預設：apiFetchTenderDetail 回傳 null（沒有完整詳情）
  mockFetchDetail.mockResolvedValue(null);
  // 預設：update 成功
  mockUpdateNotion.mockResolvedValue({ success: true });
});

describe('orchestrateAccept — 完整流程', () => {
  it('Notion + Drive 都成功時回傳完整結果', async () => {
    mockCreateNotion.mockResolvedValue({
      success: true,
      notionPageId: 'page-123',
      caseUniqueId: 'PCC-JOB001',
    });
    mockCreateDrive.mockResolvedValue({
      success: true,
      folderId: 'drive-folder-123',
      folderUrl: 'https://drive.google.com/folder-123',
    });

    const result = await orchestrateAccept(sampleItem, fullConfig);

    expect(result.notion.success).toBe(true);
    expect(result.notion.caseUniqueId).toBe('PCC-JOB001');
    expect(result.drive.success).toBe(true);
    expect(result.drive.folderId).toBe('drive-folder-123');
    // 摘要和情蒐是佔位文字（非空）
    expect(result.summary).toBeTruthy();
    expect(result.intelligence).toBeTruthy();
  });

  it('Notion 失敗時 Drive 被跳過', async () => {
    mockCreateNotion.mockResolvedValue({
      success: false,
      error: 'Notion API 403 Forbidden',
    });

    const result = await orchestrateAccept(sampleItem, fullConfig);

    expect(result.notion.success).toBe(false);
    expect(result.drive.success).toBe(false);
    expect(result.drive.error).toContain('Notion 建檔失敗');
    // Drive 函式不應被呼叫
    expect(mockCreateDrive).not.toHaveBeenCalled();
    // Update 也不應被呼叫
    expect(mockUpdateNotion).not.toHaveBeenCalled();
  });

  it('Notion 回傳 success 但缺 caseUniqueId 時視為失敗', async () => {
    mockCreateNotion.mockResolvedValue({
      success: true,
      notionPageId: 'page-123',
      // 缺少 caseUniqueId
    });

    const result = await orchestrateAccept(sampleItem, fullConfig);

    expect(result.notion.success).toBe(true); // 原始結果保留
    expect(result.drive.success).toBe(false);
    expect(result.drive.error).toContain('Notion 建檔失敗');
    expect(mockCreateDrive).not.toHaveBeenCalled();
  });

  it('沒有 Drive 設定時跳過 Drive、其他照做', async () => {
    mockCreateNotion.mockResolvedValue({
      success: true,
      notionPageId: 'page-456',
      caseUniqueId: 'PCC-JOB001',
    });

    const result = await orchestrateAccept(sampleItem, notionOnlyConfig);

    expect(result.notion.success).toBe(true);
    expect(result.drive.success).toBe(false);
    expect(result.drive.error).toContain('Drive 尚未設定');
    // Drive 函式不應被呼叫
    expect(mockCreateDrive).not.toHaveBeenCalled();
    // 但 Notion update 還是會被呼叫（回寫摘要/情蒐）
    expect(mockUpdateNotion).toHaveBeenCalled();
  });

  it('Drive 失敗時 Notion 仍然成功', async () => {
    mockCreateNotion.mockResolvedValue({
      success: true,
      notionPageId: 'page-789',
      caseUniqueId: 'PCC-JOB001',
    });
    mockCreateDrive.mockResolvedValue({
      success: false,
      error: 'Drive API quota exceeded',
    });

    const result = await orchestrateAccept(sampleItem, fullConfig);

    expect(result.notion.success).toBe(true);
    expect(result.drive.success).toBe(false);
    expect(result.drive.error).toBe('Drive API quota exceeded');
    // 摘要仍有產出
    expect(result.summary).toBeTruthy();
  });

  it('非預期 throw 被外層 catch 捕獲', async () => {
    mockCreateNotion.mockRejectedValue(new Error('Unexpected network failure'));

    const result = await orchestrateAccept(sampleItem, fullConfig);

    expect(result.notion.success).toBe(false);
    expect(result.notion.error).toContain('Unexpected network failure');
    expect(result.drive.success).toBe(false);
    expect(result.summary).toBe('');
    expect(result.intelligence).toBe('');
  });
});

describe('orchestrateAccept — Layer A 整合', () => {
  it('有完整詳情時用 convertToNotionInput', async () => {
    const detail = {
      title: '完整標題',
      budget: 1_000_000,
      agency: '文化局',
      deadline: '2026-04-01',
      publishDate: '2026-02-20',
      jobNumber: 'JOB002',
      unitId: 'unit002',
      url: 'https://pcc.g0v.ronny.tw/tender/JOB002',
      awardType: '最有利標',
      category: '服務採購',
      contractPeriod: '6個月',
      description: '工作說明',
    };
    mockFetchDetail.mockResolvedValue(detail);
    mockConvert.mockReturnValue({
      title: '轉換後標題',
      jobNumber: 'JOB002',
      agency: '文化局',
      budget: 1_000_000,
      publishDate: '2026-02-20',
      deadline: '2026-04-01',
    });
    mockCreateNotion.mockResolvedValue({
      success: true,
      notionPageId: 'page-conv',
      caseUniqueId: 'PCC-JOB002',
    });

    await orchestrateAccept(sampleItem, notionOnlyConfig);

    // 應該呼叫 converter
    expect(mockConvert).toHaveBeenCalledWith(detail);
    // 不應該用 PatrolItem 直接建檔
    expect(mockCreateNotion).toHaveBeenCalledWith(
      expect.objectContaining({ title: '轉換後標題' }),
      expect.any(String),
      expect.any(String),
    );
  });

  it('沒有完整詳情時從 PatrolItem 直接建檔', async () => {
    mockFetchDetail.mockResolvedValue(null);
    mockCreateNotion.mockResolvedValue({
      success: true,
      notionPageId: 'page-direct',
      caseUniqueId: 'PCC-JOB001',
    });

    await orchestrateAccept(sampleItem, notionOnlyConfig);

    // 不應呼叫 converter
    expect(mockConvert).not.toHaveBeenCalled();
    // 應用 PatrolItem 欄位直接建檔
    expect(mockCreateNotion).toHaveBeenCalledWith(
      expect.objectContaining({
        title: sampleItem.title,
        jobNumber: sampleItem.jobNumber,
        agency: sampleItem.agency,
        budget: sampleItem.budget,
      }),
      expect.any(String),
      expect.any(String),
    );
  });
});

describe('orchestrateAccept — Notion 回寫', () => {
  beforeEach(() => {
    mockCreateNotion.mockResolvedValue({
      success: true,
      notionPageId: 'page-wb',
      caseUniqueId: 'PCC-JOB001',
    });
    mockCreateDrive.mockResolvedValue({
      success: true,
      folderId: 'folder-wb',
    });
  });

  it('Drive 成功時 progressFlags 包含「Drive 資料夾已建」', async () => {
    await orchestrateAccept(sampleItem, fullConfig);

    expect(mockUpdateNotion).toHaveBeenCalledWith(
      expect.objectContaining({
        notionPageId: 'page-wb',
        progressFlags: expect.arrayContaining(['Drive 資料夾已建']),
      }),
      fullConfig.notionToken,
    );
  });

  it('Drive 失敗時 progressFlags 不含「Drive 資料夾已建」', async () => {
    mockCreateDrive.mockResolvedValue({ success: false, error: 'fail' });

    await orchestrateAccept(sampleItem, fullConfig);

    const updateCall = mockUpdateNotion.mock.calls[0];
    const input = updateCall[0];
    expect(input.progressFlags).not.toContain('Drive 資料夾已建');
  });

  it('回寫包含摘要和情蒐', async () => {
    await orchestrateAccept(sampleItem, fullConfig);

    expect(mockUpdateNotion).toHaveBeenCalledWith(
      expect.objectContaining({
        summary: expect.any(String),
        intelligenceReport: expect.any(String),
      }),
      fullConfig.notionToken,
    );
  });
});
