/**
 * KB API 客戶端
 * 負責所有知識庫 API 呼叫
 */

import { KBItem, KBListFilters, KBListResponse, KBFormData } from './types';

const KB_API_BASE = '/api/kb';

/**
 * 發送 API 請求的通用函式
 */
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${KB_API_BASE}${endpoint}`;

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: 'Unknown error',
    }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * KB API 客戶端類別
 */
export class KBApiClient {
  /**
   * 取得項目列表
   */
  static async listItems(filters?: KBListFilters): Promise<KBListResponse> {
    const params = new URLSearchParams();

    if (filters?.category) params.append('category', filters.category);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.parentId) params.append('parent_id', filters.parentId);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const query = params.toString();
    const endpoint = `/items${query ? `?${query}` : ''}`;

    return apiCall<KBListResponse>(endpoint);
  }

  /**
   * 取得單一項目
   */
  static async getItem(itemId: string): Promise<KBItem> {
    return apiCall<KBItem>(`/items/${itemId}`);
  }

  /**
   * 建立新項目
   */
  static async createItem(data: KBFormData): Promise<KBItem> {
    return apiCall<KBItem>('/items', {
      method: 'POST',
      body: JSON.stringify({
        category: data.category,
        title: data.title,
        content: data.content,
        tags: data.tags || [],
        parent_id: data.parentId || null,
      }),
    });
  }

  /**
   * 編輯項目
   */
  static async updateItem(
    itemId: string,
    data: Partial<KBFormData>,
  ): Promise<KBItem> {
    return apiCall<KBItem>(`/items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  /**
   * 刪除項目
   */
  static async deleteItem(itemId: string): Promise<void> {
    await apiCall(`/items/${itemId}`, {
      method: 'DELETE',
    });
  }

  /**
   * 搜尋項目
   */
  static async searchItems(query: string): Promise<KBItem[]> {
    const endpoint = `/search?q=${encodeURIComponent(query)}`;
    const response = await apiCall<{ data: KBItem[] }>(endpoint);
    return response.data;
  }
}
