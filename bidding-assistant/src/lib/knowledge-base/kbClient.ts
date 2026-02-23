/**
 * M02 Phase 3: KB API 客戶端
 *
 * 串接 /api/kb/* 端點
 * 功能：CRUD + 搜尋 + 統計 + 匯入匯出
 * 特性：自動重試（指數退避）+ timeout 處理 + 日誌記錄
 */

import { logger } from "@/lib/logger";
import type { KBId, KBEntry } from "./types";

/**
 * API 錯誤定義
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    public message: string,
    public retryable: boolean
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * API 客戶端配置
 */
export interface ClientConfig {
  baseUrl?: string;
  timeout?: number;      // ms
  maxRetries?: number;
  retryDelayMs?: number; // 初始延遲
}

/**
 * API 回應型別
 */
export interface CreateItemResponse {
  id: string;
  entryId: string;
  category: KBId;
}

export interface GetItemsResponse {
  items: KBEntry[];
  total: number;
}

export type GetStatsResponse = {
  [k in KBId]: number;
};

/**
 * KB API 客戶端
 */
class KBClient {
  private baseUrl: string;
  private timeout: number;
  private maxRetries: number;
  private retryDelayMs: number;

  constructor(config: ClientConfig = {}) {
    this.baseUrl = config.baseUrl || "/api/kb";
    this.timeout = config.timeout || 10000;
    this.maxRetries = config.maxRetries || 3;
    this.retryDelayMs = config.retryDelayMs || 100;
  }

  /**
   * GET /api/kb/items
   * 列表查詢（含分頁、過濾）
   */
  async getItems(filters?: {
    category?: KBId;
    status?: "active" | "draft" | "archived";
    page?: number;
    limit?: number;
  }): Promise<GetItemsResponse> {
    const params = new URLSearchParams();
    if (filters?.category) params.append("category", filters.category);
    if (filters?.status) params.append("status", filters.status);
    if (filters?.page) params.append("page", String(filters.page));
    if (filters?.limit) params.append("limit", String(filters.limit));

    const query = params.toString();
    const endpoint = query ? `/items?${query}` : "/items";

    return this.request(endpoint, "GET");
  }

  /**
   * POST /api/kb/items
   * 建立新項目
   */
  async createItem(kbId: KBId, data: Partial<KBEntry>): Promise<CreateItemResponse> {
    return this.request("/items", "POST", {
      category: kbId,
      data,
    });
  }

  /**
   * PUT /api/kb/items/:id
   * 更新項目
   */
  async updateItem(kbId: KBId, id: string, updates: Partial<KBEntry>): Promise<KBEntry> {
    return this.request(`/items/${id}`, "PUT", {
      category: kbId,
      updates,
    });
  }

  /**
   * DELETE /api/kb/items/:id
   * 刪除項目
   */
  async deleteItem(kbId: KBId, id: string): Promise<void> {
    await this.request(`/items/${id}`, "DELETE", {
      category: kbId,
    });
  }

  /**
   * GET /api/kb/search
   * 全文搜尋
   */
  async search(filters?: {
    q?: string;
    category?: KBId;
    status?: "active" | "draft" | "archived";
    page?: number;
    limit?: number;
  }): Promise<GetItemsResponse> {
    const params = new URLSearchParams();
    if (filters?.q) params.append("q", filters.q);
    if (filters?.category) params.append("category", filters.category);
    if (filters?.status) params.append("status", filters.status);
    if (filters?.page) params.append("page", String(filters.page));
    if (filters?.limit) params.append("limit", String(filters.limit));

    const query = params.toString();
    const endpoint = query ? `/search?${query}` : "/search";

    return this.request(endpoint, "GET");
  }

  /**
   * GET /api/kb/stats
   * 取得統計資訊（各類別項目數）
   */
  async getStats(): Promise<GetStatsResponse> {
    return this.request("/stats", "GET");
  }

  /**
   * POST /api/kb/import
   * 批次匯入（最多 500 項）
   */
  async import(mode: "append" | "replace", data: Partial<Record<KBId, KBEntry[]>>): Promise<{ success: boolean; imported: number }> {
    return this.request("/import", "POST", {
      mode,
      data,
    });
  }

  /**
   * GET /api/kb/export
   * 匯出資料
   */
  async export(format: "json" | "markdown" = "json"): Promise<any> {
    const params = new URLSearchParams();
    params.append("format", format);
    return this.request(`/export?${params.toString()}`, "GET");
  }

  /**
   * 內部：通用請求方法（含自動重試）
   * @private
   */
  private async request(
    endpoint: string,
    method: "GET" | "POST" | "PUT" | "DELETE",
    body?: any,
    attempt: number = 0
  ): Promise<any> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          // 認證 header 由 middleware 處理
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message = errorData.error || errorData.message || `HTTP ${response.status}`;

        // 判斷是否可重試
        const retryable = response.status >= 500 || response.status === 408;

        throw new ApiError(response.status, message, retryable);
      }

      // DELETE 可能回傳 204 No Content
      if (response.status === 204) {
        return undefined;
      }

      return response.json();
    } catch (err: any) {
      // AbortError = timeout
      const isTimeout = err.name === "AbortError";
      const isRetryable = err instanceof ApiError ? err.retryable : isTimeout;

      if (isRetryable && attempt < this.maxRetries) {
        // exponential backoff: 100ms, 200ms, 400ms, ...
        const delay = this.retryDelayMs * Math.pow(2, attempt);
        logger.debug("api", `[KB] ${method} ${endpoint} retry in ${delay}ms (attempt ${attempt + 1})`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.request(endpoint, method, body, attempt + 1);
      }

      // 重試次數已用盡或不可重試
      if (err instanceof ApiError) {
        logger.error("api", `[KB] ${method} ${endpoint} failed`, `${err.status}: ${err.message}`);
      } else {
        logger.error("api", `[KB] ${method} ${endpoint} failed`, err.message);
      }

      throw err;
    }
  }
}

/**
 * 全局單例
 */
export const kbClient = new KBClient();
