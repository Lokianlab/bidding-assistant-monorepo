/**
 * P1e Notion 同步引擎完整測試套件
 *
 * 覆蓋範圍：
 * - recordSyncLog: 同步日誌記錄
 * - syncItemToNotion: Supabase → Notion 同步
 * - syncNotionToSupabase: Notion → Supabase 匯入
 * - verifyNotionConnection: 連線驗証
 * - 邊界條件、錯誤恢復、衝突處理
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Client as NotionClient } from '@notionhq/client';
import {
  recordSyncLog,
  syncItemToNotion,
  syncNotionToSupabase,
  verifyNotionConnection,
  type KBItem,
  type SyncLog,
} from '../notion-sync';

// ───────────────────────────────────────────────────────────────
// Mock 客戶端
// ───────────────────────────────────────────────────────────────

const createMockSupabaseClient = (): SupabaseClient => {
  const mockInsert = vi.fn().mockResolvedValue({ error: null });
  const mockDelete = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
  });
  const mockUpdate = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) }),
  });
  const mockSelect = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  });

  return {
    from: vi.fn().mockReturnValue({
      insert: mockInsert,
      update: mockUpdate,
      select: mockSelect,
      delete: mockDelete,
    }),
  } as any;
};

const createMockNotionClient = (): NotionClient => ({
  pages: {
    create: vi.fn().mockResolvedValue({ id: 'notion-page-id' }),
    update: vi.fn().mockResolvedValue({ id: 'notion-page-id' }),
  },
  databases: {
    query: vi.fn().mockResolvedValue({ results: [] }),
    retrieve: vi.fn().mockResolvedValue({ id: 'db-id' }),
  },
} as any);

// ───────────────────────────────────────────────────────────────
// 測試資料
// ───────────────────────────────────────────────────────────────

const mockKBItem: KBItem = {
  id: 'item-001',
  tenant_id: 'tenant-123',
  title: '測試項目',
  category: '00A',
  tags: ['標籤1', '標籤2'],
  content: '這是測試內容',
  created_by: 'user-001',
  created_at: new Date('2026-02-23T08:00:00Z'),
  updated_at: new Date('2026-02-23T09:00:00Z'),
  sync_status: 'pending',
};

// ───────────────────────────────────────────────────────────────
// 測試套件
// ───────────────────────────────────────────────────────────────

describe('notion-sync — P1e 完整測試', () => {
  let mockSupabase: any;
  let mockNotion: any;
  let mockKBItemsInsert: any;
  let mockKBItemsUpdate: any;
  let mockKBItemsSelect: any;
  let mockSyncLogsInsert: any;

  beforeEach(() => {
    // 重新創建 Mock
    mockKBItemsInsert = vi.fn().mockResolvedValue({ data: null, error: null });
    mockKBItemsUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null })
      }),
    });
    mockKBItemsSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    });
    mockSyncLogsInsert = vi.fn().mockResolvedValue({ error: null });

    mockSupabase = {
      from: vi.fn((table) => {
        if (table === 'sync_logs') {
          return {
            insert: mockSyncLogsInsert,
          };
        }
        if (table === 'kb_items') {
          return {
            insert: mockKBItemsInsert,
            update: mockKBItemsUpdate,
            select: mockKBItemsSelect,
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
            }),
          };
        }
        return {};
      }),
    };

    mockNotion = {
      pages: {
        create: vi.fn().mockResolvedValue({ id: 'notion-page-id' }),
        update: vi.fn().mockResolvedValue({ id: 'notion-page-id' }),
      },
      databases: {
        query: vi.fn().mockResolvedValue({ results: [] }),
        retrieve: vi.fn().mockResolvedValue({ id: 'db-id' }),
      },
    };

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─────────────────────────────────────────────────────────────
  // recordSyncLog 測試
  // ─────────────────────────────────────────────────────────────

  describe('recordSyncLog', () => {
    it('成功記錄同步操作', async () => {
      await recordSyncLog(mockSupabase, 'create', 'item-001', 'success');

      const insertCall = mockSyncLogsInsert.mock.calls[0][0];
      expect(insertCall).toMatchObject({
        item_id: 'item-001',
        operation: 'create',
        status: 'success',
      });
    });

    it('記錄同步失敗與錯誤訊息', async () => {
      await recordSyncLog(mockSupabase, 'update', 'item-001', 'error', '連線超時');

      const insertCall = mockSyncLogsInsert.mock.calls[0][0];
      expect(insertCall).toMatchObject({
        operation: 'update',
        status: 'error',
        error_msg: '連線超時',
      });
    });

    it('處理匯入操作（item_id 為 null）', async () => {
      await recordSyncLog(mockSupabase, 'import', null, 'success');

      const insertCall = mockSyncLogsInsert.mock.calls[0][0];
      expect(insertCall.item_id).toBeNull();
      expect(insertCall.operation).toBe('import');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // syncItemToNotion 測試
  // ─────────────────────────────────────────────────────────────

  describe('syncItemToNotion', () => {
    it('成功建立新項目到 Notion', async () => {
      await syncItemToNotion(
        mockNotion,
        mockSupabase,
        'notion-db-id',
        mockKBItem,
        'create'
      );

      const createFn = mockNotion.pages.create as any;
      expect(createFn).toHaveBeenCalledWith(
        expect.objectContaining({
          parent: { database_id: 'notion-db-id' },
          properties: expect.objectContaining({
            '名稱': expect.any(Object),
            '分類': expect.any(Object),
          }),
        })
      );
    });

    it('成功更新 Notion 頁面', async () => {
      const queryFn = mockNotion.databases.query as any;
      queryFn.mockResolvedValue({
        results: [{ id: 'notion-page-id' }],
      });

      await syncItemToNotion(
        mockNotion,
        mockSupabase,
        'notion-db-id',
        mockKBItem,
        'update'
      );

      const updateFn = mockNotion.pages.update as any;
      expect(updateFn).toHaveBeenCalledWith(
        expect.objectContaining({
          page_id: 'notion-page-id',
          properties: expect.any(Object),
        })
      );
    });

    it('標記項目為已刪除（軟刪除）', async () => {
      const queryFn = mockNotion.databases.query as any;
      queryFn.mockResolvedValue({
        results: [{ id: 'notion-page-id' }],
      });

      await syncItemToNotion(
        mockNotion,
        mockSupabase,
        'notion-db-id',
        mockKBItem,
        'delete'
      );

      const updateFn = mockNotion.pages.update as any;
      expect(updateFn).toHaveBeenCalledWith(
        expect.objectContaining({
          properties: {
            '同步狀態': { select: { name: 'deleted' } },
          },
        })
      );
    });

    it('Notion 頁面不存在時拋出錯誤', async () => {
      const queryFn = mockNotion.databases.query as any;
      queryFn.mockResolvedValue({ results: [] });

      await expect(
        syncItemToNotion(
          mockNotion,
          mockSupabase,
          'notion-db-id',
          mockKBItem,
          'update'
        )
      ).rejects.toThrow('Notion 頁面未找到');
    });

    it('格式化標籤為逗號分隔字串', async () => {
      const itemWithTags = { ...mockKBItem, tags: ['標籤A', '標籤B', '標籤C'] };

      await syncItemToNotion(
        mockNotion,
        mockSupabase,
        'notion-db-id',
        itemWithTags,
        'create'
      );

      const createCall = (mockNotion.pages.create as any).mock.calls[0][0];
      expect(createCall.properties['標籤'].rich_text[0].text.content).toBe('標籤A, 標籤B, 標籤C');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // syncNotionToSupabase 測試
  // ─────────────────────────────────────────────────────────────

  describe('syncNotionToSupabase', () => {
    it('匯入 Notion 新項目到 Supabase', async () => {
      const notionPage = {
        id: 'notion-1',
        created_time: '2026-02-23T08:00:00Z',
        last_edited_time: '2026-02-23T09:00:00Z',
        properties: {
          '名稱': { title: [{ text: { content: '新標案' } }] },
          '分類': { select: { name: '00B' } },
          '標籤': { rich_text: [{ text: { content: '緊急, 重要' } }] },
          '內容': { rich_text: [{ text: { content: '詳細內容' } }] },
          '同步狀態': { select: { name: 'done' } },
        },
      };

      mockNotion.databases.query.mockResolvedValue({
        results: [notionPage],
      });

      await syncNotionToSupabase(
        mockNotion,
        mockSupabase,
        'notion-db-id',
        'tenant-123'
      );

      expect(mockKBItemsInsert).toHaveBeenCalled();
    });

    it('跳過空標題的項目', async () => {
      const notionPageEmpty = {
        id: 'notion-1',
        properties: { '名稱': { title: [] } },
      };

      mockNotion.databases.query.mockResolvedValue({
        results: [notionPageEmpty],
      });

      await syncNotionToSupabase(
        mockNotion,
        mockSupabase,
        'notion-db-id',
        'tenant-123'
      );

      expect(mockKBItemsInsert).not.toHaveBeenCalled();
    });

    it('忽略已刪除的項目', async () => {
      mockNotion.databases.query.mockResolvedValue({
        results: [],
      });

      await syncNotionToSupabase(
        mockNotion,
        mockSupabase,
        'notion-db-id',
        'tenant-123'
      );

      // 應該已篩選掉 sync_status=deleted 的項目
      expect(mockNotion.databases.query).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.objectContaining({
            property: '同步狀態',
          }),
        })
      );
    });
  });

  // ─────────────────────────────────────────────────────────────
  // verifyNotionConnection 測試
  // ─────────────────────────────────────────────────────────────

  describe('verifyNotionConnection', () => {
    it('連線正常時返回 true', async () => {
      mockNotion.databases.retrieve.mockResolvedValue({
        id: 'notion-db-id',
      });

      const result = await verifyNotionConnection(mockNotion, 'notion-db-id');

      expect(result).toBe(true);
      expect(mockNotion.databases.retrieve).toHaveBeenCalledWith({
        database_id: 'notion-db-id',
      });
    });

    it('連線失敗時返回 false', async () => {
      mockNotion.databases.retrieve.mockRejectedValue(
        new Error('API 連線失敗')
      );

      const result = await verifyNotionConnection(mockNotion, 'notion-db-id');

      expect(result).toBe(false);
    });

    it('處理 Notion API 超時', async () => {
      const timeoutError = new Error('Request timeout');
      mockNotion.databases.retrieve.mockRejectedValue(timeoutError);

      const result = await verifyNotionConnection(mockNotion, 'notion-db-id');

      expect(result).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 邊界條件測試
  // ─────────────────────────────────────────────────────────────

  describe('邊界條件', () => {
    it('處理空標題', async () => {
      const itemEmpty = { ...mockKBItem, title: '' };

      await syncItemToNotion(mockNotion, mockSupabase, 'db-id', itemEmpty, 'create');

      const createCall = mockNotion.pages.create.mock.calls[0][0];
      expect(createCall.properties['名稱'].title[0].text.content).toBe('');
    });

    it('處理超長內容（1000+ 字元）', async () => {
      const longContent = 'A'.repeat(2000);
      const itemLong = { ...mockKBItem, content: longContent };

      await syncItemToNotion(mockNotion, mockSupabase, 'db-id', itemLong, 'create');

      const createCall = mockNotion.pages.create.mock.calls[0][0];
      expect(createCall.properties['內容'].rich_text[0].text.content).toBe(longContent);
    });

    it('日期格式轉換（ISO 字串 → YYYY-MM-DD）', async () => {
      const item = {
        ...mockKBItem,
        updated_at: new Date('2026-12-31T23:59:59Z'),
      };

      await syncItemToNotion(mockNotion, mockSupabase, 'db-id', item, 'create');

      const createCall = mockNotion.pages.create.mock.calls[0][0];
      expect(createCall.properties['修改時間'].date.start).toBe('2026-12-31');
    });

    it('空標籤陣列', async () => {
      const itemNoTags = { ...mockKBItem, tags: [] };

      await syncItemToNotion(mockNotion, mockSupabase, 'db-id', itemNoTags, 'create');

      const createCall = mockNotion.pages.create.mock.calls[0][0];
      expect(createCall.properties['標籤'].rich_text[0].text.content).toBe('');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 批量同步測試
  // ─────────────────────────────────────────────────────────────

  describe('批量同步', () => {
    it('批量匯入 10+ 項目', async () => {
      const items = Array.from({ length: 15 }, (_, i) => ({
        id: `notion-${i}`,
        created_time: new Date().toISOString(),
        last_edited_time: new Date().toISOString(),
        properties: {
          '名稱': { title: [{ text: { content: `項目 ${i}` } }] },
          '分類': { select: { name: '00A' } },
          '標籤': { rich_text: [] },
          '內容': { rich_text: [{ text: { content: `內容 ${i}` } }] },
          '同步狀態': { select: { name: 'done' } },
        },
      }));

      mockNotion.databases.query.mockResolvedValue({ results: items });

      await syncNotionToSupabase(
        mockNotion,
        mockSupabase,
        'notion-db-id',
        'tenant-123'
      );

      expect(mockKBItemsInsert).toHaveBeenCalledTimes(15);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 衝突解決測試
  // ─────────────────────────────────────────────────────────────

  describe('衝突處理', () => {
    it('時間戳較新的版本優先更新', async () => {
      const notionUpdateTime = new Date('2026-02-23T10:00:00Z');
      const supabaseUpdateTime = new Date('2026-02-23T09:00:00Z');

      const notionPage = {
        id: 'notion-1',
        created_time: '2026-02-23T08:00:00Z',
        last_edited_time: notionUpdateTime.toISOString(),
        properties: {
          '名稱': { title: [{ text: { content: 'Notion 版本' } }] },
          '分類': { select: { name: '00A' } },
          '標籤': { rich_text: [] },
          '內容': { rich_text: [{ text: { content: 'Notion 內容' } }] },
          '同步狀態': { select: { name: 'done' } },
        },
      };

      mockNotion.databases.query.mockResolvedValue({
        results: [notionPage],
      });

      const existingItem = {
        id: 'item-001',
        title: 'Supabase 版本',
        updated_at: supabaseUpdateTime.toISOString(),
      };

      // 重新配置 select 鏈以返回現有項目
      const selectFn = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: existingItem, error: null }),
          }),
          single: vi.fn().mockResolvedValue({ data: existingItem, error: null }),
        }),
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'kb_items') {
          return {
            select: selectFn,
            update: mockKBItemsUpdate,
            insert: mockKBItemsInsert,
            delete: vi.fn(),
          };
        }
        if (table === 'sync_logs') {
          return { insert: vi.fn() };
        }
        return {};
      });

      await syncNotionToSupabase(
        mockNotion,
        mockSupabase,
        'notion-db-id',
        'tenant-123'
      );

      // Notion 版本較新，應該更新
      expect(mockKBItemsUpdate).toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 模組結構驗證
  // ─────────────────────────────────────────────────────────────

  describe('模組完整性', () => {
    it('所有必要的匯出函式存在', () => {
      expect(typeof recordSyncLog).toBe('function');
      expect(typeof syncItemToNotion).toBe('function');
      expect(typeof syncNotionToSupabase).toBe('function');
      expect(typeof verifyNotionConnection).toBe('function');
    });

    it('型別定義完整', () => {
      const item: KBItem = mockKBItem;
      const log: SyncLog = {
        id: 'log-1',
        item_id: 'item-1',
        operation: 'create',
        status: 'success',
        created_at: new Date(),
      };

      expect(item.title).toBe('測試項目');
      expect(log.operation).toBe('create');
    });
  });
});
