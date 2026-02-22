/**
 * Layer C 編排流程測試
 * 合併：JDNE（工廠 mock + converter 路徑）+ AINL（完整成功流程）
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  orchestrateAccept,
  validateOrchestrationResult,
  getProgressFromResult,
  type AcceptConfig,
} from '../orchestrator';
import type { AcceptResult, PatrolItem } from '../types';

// ── Mocks ──────────────────────────────────────────────────

vi.mock('../api-client', () => ({
  apiCreateNotionCase: vi.fn(),
  apiUpdateNotionCase: vi.fn(),
  apiCreateDriveFolder: vi.fn(),
  apiFetchTenderDetail: vi.fn(),
}));

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

// ── 共用測試資料 ───────────────────────────────────────────

const PATROL_ITEM: PatrolItem = {
  id: 'unit-001-J001',
  title: '食農教育推廣計畫',
  budget: 500_000,
  agency: '新北市教育局',
  deadline: '2026-04-01',
  publishDate: '2026-03-01',
  jobNumber: 'J001',
  unitId: 'unit-001',
  url: 'https://pcc.gov.tw/unit-001/J001',
  category: 'definite',
  status: 'new',
};

const BASE_CONFIG: AcceptConfig = {
  notionToken: 'notion-tok',
  notionDatabaseId: 'db-123',
};

const CONFIG_WITH_DRIVE: AcceptConfig = {
  ...BASE_CONFIG,
  driveAccessToken: 'drive-tok',
  driveParentFolderId: 'parent-folder',
};

// ── 測試主體 ───────────────────────────────────────────────

describe('orchestrator - 編排流程', () => {
  describe('orchestrateAccept', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      // Layer A 尚未實作，預設回傳 null
      mockFetchDetail.mockResolvedValue(null);
    });

    it('完整成功流程：Notion + Drive 均建立，回寫摘要/情蒐', async () => {
      mockCreateNotion.mockResolvedValue({
        success: true,
        notionPageId: 'page-1',
        caseUniqueId: 'case-1',
      });
      mockCreateDrive.mockResolvedValue({
        success: true,
        folderId: 'folder-1',
        folderUrl: 'https://drive.google.com/drive/folders/folder-1',
      });
      mockUpdateNotion.mockResolvedValue({ success: true });

      const result = await orchestrateAccept(PATROL_ITEM, CONFIG_WITH_DRIVE);

      expect(result.notion.success).toBe(true);
      expect(result.drive.success).toBe(true);
      expect(result.summary).toBeTruthy();
      expect(result.intelligence).toBeTruthy();
      expect(mockUpdateNotion).toHaveBeenCalledOnce();
    });

    it('Notion 建檔失敗時提前返回，跳過 Drive 和更新', async () => {
      mockCreateNotion.mockResolvedValue({ success: false, error: 'Notion API 錯誤' });

      const result = await orchestrateAccept(PATROL_ITEM, BASE_CONFIG);

      expect(result.notion.success).toBe(false);
      expect(result.drive.success).toBe(false);
      expect(result.drive.error).toMatch(/Notion 建檔失敗/);
      expect(mockCreateDrive).not.toHaveBeenCalled();
      expect(mockUpdateNotion).not.toHaveBeenCalled();
    });

    it('無 Drive config 時，Drive 回傳「尚未設定」錯誤，不呼叫 apiCreateDriveFolder', async () => {
      mockCreateNotion.mockResolvedValue({
        success: true,
        notionPageId: 'page-1',
        caseUniqueId: 'C001',
      });
      mockUpdateNotion.mockResolvedValue({ success: true });

      const result = await orchestrateAccept(PATROL_ITEM, BASE_CONFIG);

      expect(result.notion.success).toBe(true);
      expect(result.drive.success).toBe(false);
      expect(result.drive.error).toMatch(/Drive 尚未設定/);
      expect(mockCreateDrive).not.toHaveBeenCalled();
    });

    it('有 Drive config 時呼叫 apiCreateDriveFolder 並回傳結果', async () => {
      mockCreateNotion.mockResolvedValue({
        success: true,
        notionPageId: 'page-1',
        caseUniqueId: 'C001',
      });
      mockCreateDrive.mockResolvedValue({
        success: true,
        folderId: 'folder-abc',
        folderUrl: 'https://drive/folder-abc',
      });
      mockUpdateNotion.mockResolvedValue({ success: true });

      const result = await orchestrateAccept(PATROL_ITEM, CONFIG_WITH_DRIVE);

      expect(mockCreateDrive).toHaveBeenCalledOnce();
      expect(result.drive.success).toBe(true);
      expect(result.drive.folderId).toBe('folder-abc');
    });

    it('apiFetchTenderDetail 回傳 null 時，用 PatrolItem 直接組裝 Notion 輸入（不走 converter）', async () => {
      mockFetchDetail.mockResolvedValue(null);
      mockCreateNotion.mockResolvedValue({
        success: true,
        notionPageId: 'page-1',
        caseUniqueId: 'C001',
      });
      mockUpdateNotion.mockResolvedValue({ success: true });

      await orchestrateAccept(PATROL_ITEM, BASE_CONFIG);

      expect(mockConvert).not.toHaveBeenCalled();
      expect(mockCreateNotion).toHaveBeenCalledWith(
        expect.objectContaining({
          title: PATROL_ITEM.title,
          jobNumber: PATROL_ITEM.jobNumber,
          agency: PATROL_ITEM.agency,
        }),
        BASE_CONFIG.notionToken,
        BASE_CONFIG.notionDatabaseId,
      );
    });

    it('apiFetchTenderDetail 有詳情時，走 convertToNotionInput 轉換', async () => {
      const detail = {
        ...PATROL_ITEM,
        awardType: '最低價',
        category: null,
        contractPeriod: null,
        description: '採購說明',
      };
      const convertedInput = {
        title: '食農教育推廣計畫（轉換後）',
        jobNumber: 'J001',
        agency: '新北市教育局',
        budget: 500_000,
        publishDate: '2026-03-01',
        deadline: '2026-04-01',
      };
      mockFetchDetail.mockResolvedValue(detail);
      mockConvert.mockReturnValue(convertedInput);
      mockCreateNotion.mockResolvedValue({
        success: true,
        notionPageId: 'page-1',
        caseUniqueId: 'C001',
      });
      mockUpdateNotion.mockResolvedValue({ success: true });

      await orchestrateAccept(PATROL_ITEM, BASE_CONFIG);

      expect(mockConvert).toHaveBeenCalledWith(detail);
      expect(mockCreateNotion).toHaveBeenCalledWith(
        convertedInput,
        BASE_CONFIG.notionToken,
        BASE_CONFIG.notionDatabaseId,
      );
    });

    it('Notion 成功後，以 notionPageId 呼叫 apiUpdateNotionCase 回寫摘要', async () => {
      mockCreateNotion.mockResolvedValue({
        success: true,
        notionPageId: 'page-xyz',
        caseUniqueId: 'C001',
      });
      mockUpdateNotion.mockResolvedValue({ success: true });

      await orchestrateAccept(PATROL_ITEM, BASE_CONFIG);

      expect(mockUpdateNotion).toHaveBeenCalledWith(
        expect.objectContaining({ notionPageId: 'page-xyz' }),
        BASE_CONFIG.notionToken,
      );
    });

    it('頂層例外時，回傳 notion/drive 雙失敗，summary 和 intelligence 為空', async () => {
      mockCreateNotion.mockRejectedValue(new Error('網路中斷'));

      const result = await orchestrateAccept(PATROL_ITEM, BASE_CONFIG);

      expect(result.notion.success).toBe(false);
      expect(result.drive.success).toBe(false);
      expect(result.summary).toBe('');
      expect(result.intelligence).toBe('');
    });
  });

  // ── validateOrchestrationResult ──────────────────────────

  describe('validateOrchestrationResult', () => {
    it('應該驗證全部成功的結果', () => {
      const result: AcceptResult = {
        notion: { success: true, notionPageId: 'page-1', caseUniqueId: 'case-1' },
        drive: { success: true, folderId: 'folder-1', folderUrl: 'https://drive/1' },
        summary: '摘要內容',
        intelligence: '情蒐報告',
      };

      const validation = validateOrchestrationResult(result);
      expect(validation.allSuccess).toBe(true);
      expect(validation.failedSteps).toHaveLength(0);
    });

    it('應該偵測 Notion 失敗', () => {
      const result: AcceptResult = {
        notion: { success: false, error: 'API error' },
        drive: { success: true, folderId: 'folder-1' },
        summary: '摘要',
        intelligence: '情蒐',
      };

      const validation = validateOrchestrationResult(result);
      expect(validation.allSuccess).toBe(false);
      expect(validation.failedSteps).toContain('Notion 建檔');
    });

    it('應該偵測 Drive 失敗', () => {
      const result: AcceptResult = {
        notion: { success: true, notionPageId: 'page-1' },
        drive: { success: false, error: 'Drive error' },
        summary: '摘要',
        intelligence: '情蒐',
      };

      const validation = validateOrchestrationResult(result);
      expect(validation.allSuccess).toBe(false);
      expect(validation.failedSteps).toContain('Drive 資料夾');
    });

    it('應該偵測摘要缺失', () => {
      const result: AcceptResult = {
        notion: { success: true, notionPageId: 'page-1' },
        drive: { success: true, folderId: 'folder-1' },
        summary: '',
        intelligence: '情蒐',
      };

      const validation = validateOrchestrationResult(result);
      expect(validation.allSuccess).toBe(false);
      expect(validation.failedSteps).toContain('摘要產出');
    });

    it('應該偵測情蒐缺失', () => {
      const result: AcceptResult = {
        notion: { success: true, notionPageId: 'page-1' },
        drive: { success: true, folderId: 'folder-1' },
        summary: '摘要',
        intelligence: '',
      };

      const validation = validateOrchestrationResult(result);
      expect(validation.allSuccess).toBe(false);
      expect(validation.failedSteps).toContain('情蒐產出');
    });

    it('應該偵測多項失敗', () => {
      const result: AcceptResult = {
        notion: { success: false, error: 'err' },
        drive: { success: false, error: 'err' },
        summary: '',
        intelligence: '',
      };

      const validation = validateOrchestrationResult(result);
      expect(validation.allSuccess).toBe(false);
      expect(validation.failedSteps).toHaveLength(4);
    });
  });

  // ── getProgressFromResult ────────────────────────────────

  describe('getProgressFromResult', () => {
    it('全部成功應該回傳 complete', () => {
      const result: AcceptResult = {
        notion: { success: true, notionPageId: 'p1' },
        drive: { success: true, folderId: 'f1' },
        summary: '摘要',
        intelligence: '情蒐',
      };

      const progress = getProgressFromResult(result);
      expect(progress.step).toBe('complete');
      expect(progress.percent).toBe(100);
    });

    it('只完成情蒐應該在 analysis 階段', () => {
      const result: AcceptResult = {
        notion: { success: false },
        drive: { success: false },
        summary: '',
        intelligence: '情蒐結果',
      };

      const progress = getProgressFromResult(result);
      expect(progress.step).toBe('analysis');
      expect(progress.percent).toBe(75);
    });

    it('只完成摘要應該在 analysis 階段 50%', () => {
      const result: AcceptResult = {
        notion: { success: false },
        drive: { success: false },
        summary: '摘要',
        intelligence: '',
      };

      const progress = getProgressFromResult(result);
      expect(progress.step).toBe('analysis');
      expect(progress.percent).toBe(50);
    });

    it('只完成 Drive 應該在 drive 階段', () => {
      const result: AcceptResult = {
        notion: { success: false },
        drive: { success: true, folderId: 'f1' },
        summary: '',
        intelligence: '',
      };

      const progress = getProgressFromResult(result);
      expect(progress.step).toBe('drive');
      expect(progress.percent).toBe(40);
    });

    it('只完成 Notion 應該在 notion 階段', () => {
      const result: AcceptResult = {
        notion: { success: true, notionPageId: 'p1' },
        drive: { success: false },
        summary: '',
        intelligence: '',
      };

      const progress = getProgressFromResult(result);
      expect(progress.step).toBe('notion');
      expect(progress.percent).toBe(25);
    });

    it('什麼都沒完成應該在 preparing 階段', () => {
      const result: AcceptResult = {
        notion: { success: false },
        drive: { success: false },
        summary: '',
        intelligence: '',
      };

      const progress = getProgressFromResult(result);
      expect(progress.step).toBe('preparing');
      expect(progress.percent).toBe(5);
    });

    it('每個進度都應該有中文 message', () => {
      const stages: AcceptResult[] = [
        { notion: { success: false }, drive: { success: false }, summary: '', intelligence: '' },
        { notion: { success: true, notionPageId: 'p1' }, drive: { success: false }, summary: '', intelligence: '' },
        { notion: { success: false }, drive: { success: true, folderId: 'f1' }, summary: '', intelligence: '' },
        { notion: { success: false }, drive: { success: false }, summary: '有', intelligence: '' },
        { notion: { success: true, notionPageId: 'p1' }, drive: { success: true, folderId: 'f1' }, summary: '有', intelligence: '有' },
      ];

      for (const result of stages) {
        const progress = getProgressFromResult(result);
        expect(progress.message).toBeTruthy();
        expect(progress.message.length).toBeGreaterThan(0);
      }
    });
  });
});
