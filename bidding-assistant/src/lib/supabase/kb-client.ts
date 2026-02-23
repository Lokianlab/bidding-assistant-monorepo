/**
 * M02 Phase 2: KB API 客戶端封裝
 *
 * 提供簡潔的 KB CRUD 操作介面
 * 自動處理認證、錯誤、重試等
 */

import type {
  KBEntry,
  KBId,
  KBEntryStatus,
  KBSearchRequest,
  KBSearchResponse,
  KBStatsResponse,
  KBImportRequest,
  KBImportResponse,
} from './types';

interface KBClientConfig {
  baseUrl?: string;
  timeout?: number;
}

export class KBClient {
  private baseUrl: string;
  private timeout: number;

  constructor(config: KBClientConfig = {}) {
    this.baseUrl = config.baseUrl || '/api/kb';
    this.timeout = config.timeout || 30000;
  }

  /**
   * 發送 API 請求
   */
  private async request<T>(
    method: string,
    path: string,
    data?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: data ? JSON.stringify(data) : undefined,
        signal: controller.signal,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * 列表查詢
   */
  async list(category?: KBId, status?: KBEntryStatus) {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (status) params.append('status', status);

    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<{ items: KBEntry[]; total: number }>(
      'GET',
      `/items${query}`
    );
  }

  /**
   * 取得單個項目
   */
  async get(id: string) {
    return this.request<KBEntry>('GET', `/items/${id}`);
  }

  /**
   * 建立新項目
   */
  async create(category: KBId, data: unknown) {
    return this.request<{ id: string; entryId: string; category: KBId }>(
      'POST',
      '/items',
      { category, data }
    );
  }

  /**
   * 更新項目
   */
  async update(id: string, data: unknown) {
    return this.request<KBEntry>('PUT', `/items/${id}`, { data });
  }

  /**
   * 刪除項目
   */
  async delete(id: string) {
    return this.request<{ success: boolean }>('DELETE', `/items/${id}`);
  }

  /**
   * 更新項目狀態
   */
  async updateStatus(id: string, status: KBEntryStatus) {
    return this.request<KBEntry>('PATCH', `/items/${id}`, { status });
  }

  /**
   * 取得統計信息
   */
  async stats() {
    return this.request<KBStatsResponse>('GET', '/stats');
  }

  /**
   * 全文搜尋
   */
  async search(request: KBSearchRequest) {
    const params = new URLSearchParams();
    params.append('q', request.query);
    if (request.categories?.length) {
      params.append('categories', request.categories.join(','));
    }
    if (request.status) {
      params.append('status', request.status);
    }
    if (request.limit) {
      params.append('limit', request.limit.toString());
    }
    if (request.offset) {
      params.append('offset', request.offset.toString());
    }

    return this.request<KBSearchResponse>(
      'GET',
      `/search?${params.toString()}`
    );
  }

  /**
   * 批次匯入
   */
  async import(request: KBImportRequest) {
    return this.request<KBImportResponse>('POST', '/import', request);
  }

  /**
   * 匯出資料
   */
  async export(
    format: 'json' | 'markdown',
    categories?: KBId[],
    status?: KBEntryStatus
  ) {
    const params = new URLSearchParams();
    params.append('format', format);
    if (categories?.length) {
      params.append('categories', categories.join(','));
    }
    if (status) {
      params.append('status', status);
    }

    return this.request<Blob>(
      'GET',
      `/export?${params.toString()}`
    );
  }
}

/**
 * 單例客戶端
 */
export const kbClient = new KBClient();
