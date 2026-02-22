/**
 * Layer B 測試：Notion 建檔/回寫
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  normalizeDate,
  mapInputToNotionProperties,
  extractCaseUniqueId,
  buildContentBlocks,
  createNotionCase,
  updateNotionCase,
} from '../notion-writer';
import type { NotionCaseCreateInput, NotionCaseUpdateInput } from '../types';
import { DEFAULT_FIELD_MAP } from '@/lib/constants/field-mapping';

// ============================================================
// normalizeDate
// ============================================================

describe('normalizeDate', () => {
  it('應該轉換 YYYYMMDD 為 ISO 格式', () => {
    expect(normalizeDate('20260222')).toBe('2026-02-22');
  });

  it('應該保留 ISO 日期格式', () => {
    expect(normalizeDate('2026-02-22')).toBe('2026-02-22');
  });

  it('應該保留含時間的 ISO 格式', () => {
    expect(normalizeDate('2026-02-22T17:00:00Z')).toBe('2026-02-22T17:00:00Z');
  });

  it('應該對空字串回傳 null', () => {
    expect(normalizeDate('')).toBeNull();
  });

  it('應該對無效格式回傳 null', () => {
    expect(normalizeDate('not-a-date')).toBeNull();
  });

  it('應該處理短格式日期 YYMMDD 為 null', () => {
    expect(normalizeDate('260222')).toBeNull();
  });
});

// ============================================================
// mapInputToNotionProperties
// ============================================================

describe('mapInputToNotionProperties', () => {
  const baseInput: NotionCaseCreateInput = {
    title: '食農教育推廣計畫',
    jobNumber: 'AGR-2026-001',
    agency: '農業委員會',
    budget: 800000,
    publishDate: '2026-02-22',
    deadline: '2026-03-22T17:00:00Z',
  };

  it('應該映射標案名稱為 title property', () => {
    const props = mapInputToNotionProperties(baseInput);
    expect(props[DEFAULT_FIELD_MAP.名稱]).toEqual({
      title: [{ text: { content: '食農教育推廣計畫' } }],
    });
  });

  it('應該映射案號為 rich_text', () => {
    const props = mapInputToNotionProperties(baseInput);
    expect(props[DEFAULT_FIELD_MAP.案號]).toEqual({
      rich_text: [{ text: { content: 'AGR-2026-001' } }],
    });
  });

  it('應該映射招標機關為 rich_text', () => {
    const props = mapInputToNotionProperties(baseInput);
    expect(props[DEFAULT_FIELD_MAP.招標機關]).toEqual({
      rich_text: [{ text: { content: '農業委員會' } }],
    });
  });

  it('應該映射預算金額為 number', () => {
    const props = mapInputToNotionProperties(baseInput);
    expect(props[DEFAULT_FIELD_MAP.預算]).toEqual({ number: 800000 });
  });

  it('應該映射截標時間為 date', () => {
    const props = mapInputToNotionProperties(baseInput);
    expect(props[DEFAULT_FIELD_MAP.截標]).toEqual({
      date: { start: '2026-03-22T17:00:00Z' },
    });
  });

  it('應該設定案件唯一碼為 PCC-{jobNumber}', () => {
    const props = mapInputToNotionProperties(baseInput);
    expect(props[DEFAULT_FIELD_MAP.唯一碼]).toEqual({
      rich_text: [{ text: { content: 'PCC-AGR-2026-001' } }],
    });
  });

  it('應該設定進程為「等標期間」', () => {
    const props = mapInputToNotionProperties(baseInput);
    expect(props[DEFAULT_FIELD_MAP.進程]).toEqual({
      status: { name: '等標期間' },
    });
  });

  it('應該設定決策為「案件送二級評估」', () => {
    const props = mapInputToNotionProperties(baseInput);
    expect(props[DEFAULT_FIELD_MAP.決策]).toEqual({
      select: { name: '案件送二級評估' },
    });
  });

  it('應該映射決標方式', () => {
    const input = { ...baseInput, awardType: 'most_advantageous' };
    const props = mapInputToNotionProperties(input);
    expect(props[DEFAULT_FIELD_MAP.評審方式]).toEqual({
      select: { name: 'most_advantageous' },
    });
  });

  it('應該映射標案類型為 multi_select', () => {
    const input = { ...baseInput, category: ['services', 'arts'] };
    const props = mapInputToNotionProperties(input);
    expect(props[DEFAULT_FIELD_MAP.標案類型]).toEqual({
      multi_select: [{ name: 'services' }, { name: 'arts' }],
    });
  });

  it('不含 awardType 時不設定評審方式', () => {
    const props = mapInputToNotionProperties(baseInput);
    expect(props[DEFAULT_FIELD_MAP.評審方式]).toBeUndefined();
  });

  it('不含 category 時不設定標案類型', () => {
    const props = mapInputToNotionProperties(baseInput);
    expect(props[DEFAULT_FIELD_MAP.標案類型]).toBeUndefined();
  });

  it('空 category 陣列時不設定標案類型', () => {
    const input = { ...baseInput, category: [] };
    const props = mapInputToNotionProperties(input);
    expect(props[DEFAULT_FIELD_MAP.標案類型]).toBeUndefined();
  });

  it('budget 為 null 時不設定預算', () => {
    const input = { ...baseInput, budget: null };
    const props = mapInputToNotionProperties(input);
    expect(props[DEFAULT_FIELD_MAP.預算]).toBeUndefined();
  });

  it('budget 為 0 時應設定預算為 0', () => {
    const input = { ...baseInput, budget: 0 };
    const props = mapInputToNotionProperties(input);
    expect(props[DEFAULT_FIELD_MAP.預算]).toEqual({ number: 0 });
  });

  it('應該支援自訂欄位對照表', () => {
    const customMap = { ...DEFAULT_FIELD_MAP, 名稱: '自訂名稱' };
    const props = mapInputToNotionProperties(baseInput, customMap);
    expect(props['自訂名稱']).toBeDefined();
    expect(props[DEFAULT_FIELD_MAP.名稱]).toBeUndefined();
  });

  it('截標時間為 YYYYMMDD 格式時應正確轉換', () => {
    const input = { ...baseInput, deadline: '20260322' };
    const props = mapInputToNotionProperties(input);
    expect(props[DEFAULT_FIELD_MAP.截標]).toEqual({
      date: { start: '2026-03-22' },
    });
  });

  it('空 jobNumber 時不設定案號和唯一碼', () => {
    const input = { ...baseInput, jobNumber: '' };
    const props = mapInputToNotionProperties(input);
    expect(props[DEFAULT_FIELD_MAP.案號]).toBeUndefined();
    expect(props[DEFAULT_FIELD_MAP.唯一碼]).toBeUndefined();
  });

  it('空 agency 時不設定招標機關', () => {
    const input = { ...baseInput, agency: '' };
    const props = mapInputToNotionProperties(input);
    expect(props[DEFAULT_FIELD_MAP.招標機關]).toBeUndefined();
  });
});

// ============================================================
// extractCaseUniqueId
// ============================================================

describe('extractCaseUniqueId', () => {
  it('應該從 unique_id 型別提取（有 prefix）', () => {
    const response = {
      id: 'page-123',
      properties: {
        [DEFAULT_FIELD_MAP.唯一碼]: {
          type: 'unique_id',
          unique_id: { prefix: 'DOC', number: 42 },
        },
      },
    };
    expect(extractCaseUniqueId(response)).toBe('DOC-42');
  });

  it('應該從 unique_id 型別提取（無 prefix）', () => {
    const response = {
      id: 'page-123',
      properties: {
        [DEFAULT_FIELD_MAP.唯一碼]: {
          type: 'unique_id',
          unique_id: { number: 99 },
        },
      },
    };
    expect(extractCaseUniqueId(response)).toBe('99');
  });

  it('沒有 properties 時回傳 undefined', () => {
    expect(extractCaseUniqueId({ id: 'page-123' })).toBeUndefined();
  });

  it('不是 unique_id 型別時回傳 undefined', () => {
    const response = {
      id: 'page-123',
      properties: {
        [DEFAULT_FIELD_MAP.唯一碼]: {
          type: 'rich_text',
        },
      },
    };
    expect(extractCaseUniqueId(response)).toBeUndefined();
  });
});

// ============================================================
// buildContentBlocks
// ============================================================

describe('buildContentBlocks', () => {
  it('應該產生摘要的 heading + paragraph', () => {
    const blocks = buildContentBlocks('這是摘要');
    expect(blocks).toHaveLength(2);
    expect(blocks[0].type).toBe('heading_2');
    expect(blocks[1].type).toBe('paragraph');
  });

  it('應該產生情蒐的 heading + paragraph', () => {
    const blocks = buildContentBlocks(undefined, '這是情蒐報告');
    expect(blocks).toHaveLength(2);
    expect(blocks[0].type).toBe('heading_2');
    expect(blocks[1].type).toBe('paragraph');
  });

  it('同時有摘要和情蒐時應產生 4 個 blocks', () => {
    const blocks = buildContentBlocks('摘要', '情蒐');
    expect(blocks).toHaveLength(4);
  });

  it('都沒有時應回傳空陣列', () => {
    const blocks = buildContentBlocks();
    expect(blocks).toHaveLength(0);
  });

  it('摘要 heading 應為「工作項目摘要」', () => {
    const blocks = buildContentBlocks('內容');
    const heading = blocks[0] as Record<string, unknown>;
    const headingContent = heading.heading_2 as {
      rich_text: Array<{ text: { content: string } }>;
    };
    expect(headingContent.rich_text[0].text.content).toBe('工作項目摘要');
  });

  it('情蒐 heading 應為「情蒐報告」', () => {
    const blocks = buildContentBlocks(undefined, '報告');
    const heading = blocks[0] as Record<string, unknown>;
    const headingContent = heading.heading_2 as {
      rich_text: Array<{ text: { content: string } }>;
    };
    expect(headingContent.rich_text[0].text.content).toBe('情蒐報告');
  });
});

// ============================================================
// createNotionCase（使用 mock fetch）
// ============================================================

describe('createNotionCase', () => {
  const mockInput: NotionCaseCreateInput = {
    title: '食農教育推廣計畫',
    jobNumber: 'AGR-2026-001',
    agency: '農業委員會',
    budget: 800000,
    publishDate: '2026-02-22',
    deadline: '2026-03-22T17:00:00Z',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('缺少 token 時回傳失敗', async () => {
    const result = await createNotionCase(mockInput, '', 'db-123');
    expect(result.success).toBe(false);
    expect(result.error).toContain('token');
  });

  it('缺少 databaseId 時回傳失敗', async () => {
    const result = await createNotionCase(mockInput, 'token-123', '');
    expect(result.success).toBe(false);
    expect(result.error).toContain('databaseId');
  });

  it('title 為空時回傳失敗', async () => {
    const input = { ...mockInput, title: '' };
    const result = await createNotionCase(input, 'token-123', 'db-123');
    expect(result.success).toBe(false);
    expect(result.error).toContain('名稱');
  });

  it('title 純空白時回傳失敗', async () => {
    const input = { ...mockInput, title: '   ' };
    const result = await createNotionCase(input, 'token-123', 'db-123');
    expect(result.success).toBe(false);
  });

  it('API 成功時回傳 notionPageId 和 caseUniqueId', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'page-abc',
            url: 'https://notion.so/page-abc',
            properties: {},
          }),
      }),
    );

    const result = await createNotionCase(mockInput, 'token-123', 'db-123');
    expect(result.success).toBe(true);
    expect(result.notionPageId).toBe('page-abc');
    expect(result.caseUniqueId).toBe('PCC-AGR-2026-001');
  });

  it('API 回傳 unique_id 時使用它', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'page-abc',
            properties: {
              [DEFAULT_FIELD_MAP.唯一碼]: {
                type: 'unique_id',
                unique_id: { prefix: 'DOC', number: 42 },
              },
            },
          }),
      }),
    );

    const result = await createNotionCase(mockInput, 'token-123', 'db-123');
    expect(result.success).toBe(true);
    expect(result.caseUniqueId).toBe('DOC-42');
  });

  it('API 失敗時回傳錯誤', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: 'Invalid properties' }),
      }),
    );

    const result = await createNotionCase(mockInput, 'token-123', 'db-123');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid properties');
  });

  it('網路錯誤時回傳失敗', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('Network error')),
    );

    const result = await createNotionCase(mockInput, 'token-123', 'db-123');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Network error');
  });

  it('應該呼叫正確的 Notion API endpoint', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'page-abc', properties: {} }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await createNotionCase(mockInput, 'my-token', 'my-db');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.notion.com/v1/pages',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer my-token',
        }),
      }),
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.parent.database_id).toBe('my-db');
  });
});

// ============================================================
// updateNotionCase（使用 mock fetch）
// ============================================================

describe('updateNotionCase', () => {
  const mockUpdate: NotionCaseUpdateInput = {
    notionPageId: 'page-abc',
    summary: '工作項目摘要',
    intelligenceReport: '情蒐報告內容',
    progressFlags: ['摘要完成', '情蒐完成'],
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('缺少 token 時回傳失敗', async () => {
    const result = await updateNotionCase(mockUpdate, '');
    expect(result.success).toBe(false);
    expect(result.error).toContain('token');
  });

  it('缺少 notionPageId 時回傳失敗', async () => {
    const input = { ...mockUpdate, notionPageId: '' };
    const result = await updateNotionCase(input, 'token-123');
    expect(result.success).toBe(false);
    expect(result.error).toContain('頁面 ID');
  });

  it('有 progressFlags 時更新 properties', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
    vi.stubGlobal('fetch', mockFetch);

    await updateNotionCase(mockUpdate, 'token-123');

    // 第一次呼叫應該是 PATCH properties
    expect(mockFetch.mock.calls[0][0]).toContain('/pages/page-abc');
    expect(mockFetch.mock.calls[0][1].method).toBe('PATCH');
  });

  it('有 summary 和 intelligence 時 append blocks', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
    vi.stubGlobal('fetch', mockFetch);

    await updateNotionCase(mockUpdate, 'token-123');

    // 第二次呼叫應該是 PATCH blocks
    const blockCall = mockFetch.mock.calls.find(
      (call: [string, unknown]) => typeof call[0] === 'string' && call[0].includes('/children'),
    );
    expect(blockCall).toBeDefined();
  });

  it('只有 intelligence 時應 append blocks 不更新 properties', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
    vi.stubGlobal('fetch', mockFetch);

    await updateNotionCase(
      { notionPageId: 'page-abc', intelligenceReport: '報告' },
      'token-123',
    );

    // 只有 block append 呼叫
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0]).toContain('/children');
  });

  it('API 失敗時回傳錯誤', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: 'Bad request' }),
      }),
    );

    const result = await updateNotionCase(mockUpdate, 'token-123');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Bad request');
  });

  it('網路錯誤時回傳失敗', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('Connection refused')),
    );

    const result = await updateNotionCase(mockUpdate, 'token-123');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Connection refused');
  });

  it('成功時回傳 success: true', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      }),
    );

    const result = await updateNotionCase(mockUpdate, 'token-123');
    expect(result.success).toBe(true);
  });
});
