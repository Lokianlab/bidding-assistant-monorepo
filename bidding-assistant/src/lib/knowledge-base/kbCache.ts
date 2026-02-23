/**
 * M02 Phase 3: KB 離線快取層
 *
 * 管理本地 localStorage：
 * - 快取資料（KB entries）
 * - 同步隊列（待上傳操作）
 * - 元資料（lastSyncTime, version）
 *
 * 特性：
 * - Offline-first：優先讀本地快取
 * - 隊列持久化：重啟時隊列仍存在
 * - 版本檢查：支援未來資料遷移
 */

import { logger } from "@/lib/logger";
import type { KBId, KBEntry, KnowledgeBaseData } from "./types";

/**
 * 快取元資料
 */
export interface CacheMetadata {
  lastSyncTime: number; // Unix 時間戳，ms
  version: number;      // 版本號，用於未來遷移
}

/**
 * 同步隊列項目
 */
export interface SyncQueueItem {
  id: string;                                    // 唯一識別碼
  kbId: KBId;                                    // 所屬知識庫
  operation: "create" | "update" | "delete";     // 操作類型
  data?: Partial<KBEntry>;                       // 操作資料
  timestamp: number;                             // 操作時間戳
  attempts: number;                              // 重試次數
}

/**
 * 快取管理器
 */
class KBCache {
  private readonly CACHE_KEY = "kb-cache-v2";    // localStorage key
  private readonly QUEUE_KEY = "kb-sync-queue";  // localStorage key
  private readonly METADATA_VERSION = 2;         // 當前版本

  private cache: Map<KBId, KBEntry[]> = new Map();
  private metadata: CacheMetadata = {
    lastSyncTime: 0,
    version: this.METADATA_VERSION,
  };
  private syncQueue: SyncQueueItem[] = [];

  /**
   * 從 localStorage 載入快取和隊列
   */
  load(): KnowledgeBaseData {
    try {
      // 載入快取
      const raw = localStorage.getItem(this.CACHE_KEY);
      if (raw) {
        const { data, metadata } = JSON.parse(raw);

        // 版本檢查（未來擴充）
        if (metadata && metadata.version < this.METADATA_VERSION) {
          logger.info("cache", `Upgrading from v${metadata.version} to v${this.METADATA_VERSION}`);
          // 暫無升級邏輯，直接覆蓋
        }

        this.cache = new Map(
          Object.entries(data).filter(([k]) => ["00A", "00B", "00C", "00D", "00E"].includes(k)) as [
            KBId,
            KBEntry[]
          ][]
        );

        if (metadata) {
          this.metadata = {
            lastSyncTime: metadata.lastSyncTime || 0,
            version: this.METADATA_VERSION,
          };
        }
      }

      // 載入隊列
      const queueRaw = localStorage.getItem(this.QUEUE_KEY);
      if (queueRaw) {
        this.syncQueue = JSON.parse(queueRaw) as SyncQueueItem[];
        logger.info("cache", `Loaded ${this.syncQueue.length} pending sync items`);
      }

      return this.toKnowledgeBaseData();
    } catch (err) {
      logger.error("cache", "Load failed, returning empty cache", String(err));
      return this.getEmpty();
    }
  }

  /**
   * 儲存快取到 localStorage
   */
  save(data: KnowledgeBaseData, metadata?: Partial<CacheMetadata>): void {
    try {
      // 更新快取資料
      this.cache = new Map(
        Object.entries(data).filter(([k]) => ["00A", "00B", "00C", "00D", "00E"].includes(k)) as [
          KBId,
          KBEntry[]
        ][]
      );

      // 更新元資料
      if (metadata) {
        this.metadata = {
          ...this.metadata,
          ...metadata,
        };
      }

      // 寫入 localStorage
      localStorage.setItem(
        this.CACHE_KEY,
        JSON.stringify({
          data: Object.fromEntries(this.cache),
          metadata: this.metadata,
        })
      );
    } catch (err) {
      logger.warn("cache", "Save failed (quota exceeded?)", String(err));
    }
  }

  /**
   * 加入同步隊列項目
   */
  queueOperation(item: SyncQueueItem): void {
    this.syncQueue.push(item);
    this.persistQueue();
  }

  /**
   * 取得所有待同步項目（副本）
   */
  getQueue(): SyncQueueItem[] {
    return JSON.parse(JSON.stringify(this.syncQueue));
  }

  /**
   * 刪除已同步的隊列項目
   */
  clearQueueItem(id: string): void {
    const before = this.syncQueue.length;
    this.syncQueue = this.syncQueue.filter((item) => item.id !== id);
    if (this.syncQueue.length < before) {
      this.persistQueue();
    }
  }

  /**
   * 遞增重試次數（失敗時調用）
   */
  incrementRetries(id: string): void {
    const item = this.syncQueue.find((i) => i.id === id);
    if (item) {
      item.attempts++;
      this.persistQueue();
    }
  }

  /**
   * 清空所有隊列
   */
  clearQueue(): void {
    this.syncQueue = [];
    this.persistQueue();
  }

  /**
   * 取得上次同步時間
   */
  getLastSyncTime(): number {
    return this.metadata.lastSyncTime;
  }

  /**
   * 更新同步時間
   */
  updateSyncTime(timestamp: number): void {
    this.metadata.lastSyncTime = timestamp;
    this.save(this.toKnowledgeBaseData());
  }

  /**
   * 將 cache + queue 轉換為 KnowledgeBaseData 格式
   * @private
   */
  private toKnowledgeBaseData(): KnowledgeBaseData {
    return {
      "00A": (this.cache.get("00A") || []) as any,
      "00B": (this.cache.get("00B") || []) as any,
      "00C": (this.cache.get("00C") || []) as any,
      "00D": (this.cache.get("00D") || []) as any,
      "00E": (this.cache.get("00E") || []) as any,
      lastUpdated: new Date(this.metadata.lastSyncTime).toISOString(),
      version: this.METADATA_VERSION,
    };
  }

  /**
   * 取得空的 KnowledgeBaseData
   * @private
   */
  private getEmpty(): KnowledgeBaseData {
    return {
      "00A": [],
      "00B": [],
      "00C": [],
      "00D": [],
      "00E": [],
      lastUpdated: new Date().toISOString(),
      version: this.METADATA_VERSION,
    };
  }

  /**
   * 持久化隊列到 localStorage
   * @private
   */
  private persistQueue(): void {
    try {
      localStorage.setItem(this.QUEUE_KEY, JSON.stringify(this.syncQueue));
    } catch (err) {
      logger.warn("cache", "Queue persist failed (quota exceeded?)", String(err));
    }
  }
}

/**
 * 全局單例
 */
export const kbCache = new KBCache();
