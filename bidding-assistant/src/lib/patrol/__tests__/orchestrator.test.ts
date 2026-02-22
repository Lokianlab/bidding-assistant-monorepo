/**
 * Layer C 編排流程測試
 */

import { describe, it, expect } from 'vitest';
import {
  validateOrchestrationResult,
  getProgressFromResult,
} from '../orchestrator';
import { AcceptResult } from '../types';

describe('orchestrator - 編排流程', () => {
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
