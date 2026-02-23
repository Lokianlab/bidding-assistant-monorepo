# M02 Phase 3 設計：Hook 遷移 + 離線快取

**日期**：2026-02-24
**機器**：A44T
**狀態**：設計完成，待 Z1FV 審查
**目標**：完成 useKnowledgeBase 從 localStorage → Supabase API 遷移 + 離線快取層實裝

---

## 現況總結

### Phase 2 成果（已完成 ✓）
- KB API 路由 6 個（items, search, stats, import, export）
- 型別系統完整（KBEntry, KBMetadata, KBAttachment）
- 認證中間件（withKBAuth）
- 41 新增測試 + 3979 總測試全過
- DB migration + RLS 策略 + 索引完備

### Phase 3 需求
1. **Hook 遷移**：useKnowledgeBase 使用 API 而非 localStorage
2. **離線快取**：本地 localStorage 作備份，API 不可達時降級
3. **同步機制**：本地變更延遲提交，API 變更同步回本地
4. **測試覆蓋**：離線模式、衝突解決、時序異常

---

## 架構設計

### 1. 新增層級結構

```
useKnowledgeBase.ts
  ↓（現況：直接讀寫 localStorage）

useKnowledgeBase.ts（遷移後）
  ├─ kbClient（API 客戶端，新增）
  │   └─ 封裝 POST/GET/PUT/DELETE
  ├─ kbCache（離線快取層，新增）
  │   ├─ loadFromLocal()
  │   ├─ saveToLocal()
  │   └─ syncQueue（待上傳隊列）
  └─ useKnowledgeBase（Hook 改寫）
      ├─ 初始化時：tryLoadFromAPI() → fallback localStorage
      ├─ 操作時：queueChange() → background sync
      └─ 同步結果：mergeRemoteChanges()
```

### 2. 關鍵設計決策

#### a. 優先級順序（Offline-First）

1. **優先讀本地快取**（秒級）
2. **背景同步到 API**（延遲，無阻塞）
3. **API 變更拉回本地**（定期輪詢或 push）
4. **衝突解決**：API 版本時間戳更新者獲勝

#### b. 狀態機

```
狀態機：

初始化
  ├─ 讀本地快取 ✓
  ├─ tryLoadFromAPI()
  │   ├─ 成功 → [已同步] (sync=true)
  │   └─ 失敗/timeout → [離線模式] (sync=false)
  └─ 啟動定期同步任務

用戶操作
  ├─ 產生變更（add/update/delete）
  ├─ 立即更新本地狀態
  ├─ 加入 syncQueue
  └─ 觸發 background sync（非阻塞）

背景同步（500ms 後開始）
  ├─ 讀 syncQueue（批量）
  ├─ 逐項 PUT/POST/DELETE to API
  ├─ 成功 → 刪除 queue 項
  ├─ 失敗 → 重試（指數退避）
  └─ 清空後進入 [已同步]

API 推送（定期輪詢或 webhook）
  ├─ GET /api/kb/stats?since={lastSync}
  ├─ 檢測遠端變更
  └─ mergeRemoteChanges() → 本地更新
```

#### c. 衝突解決策略

當本地有待上傳變更，同時收到 API 版本的更新時：

- **Last-Write-Wins**：比較 `updatedAt` 時間戳
  - 本地變更時間 > API 變更時間 → 保留本地，繼續上傳
  - API 變更時間 > 本地變更時間 → 應用 API，放棄本地上傳（通知用戶）
- **衝突通知**：在 hook 回傳 `conflicts[]`，UI 可選擇「保留本地」或「接受 API」

#### d. Hydration 安全

```ts
// 禁止在 SSR 時讀 localStorage
const [hydrated, setHydrated] = useState(false);
const [data, setData] = useState(() => EMPTY_KB_DATA);

useEffect(() => {
  // 只在 client 側初始化
  setData(loadFromCache());
  setHydrated(true);

  // 背景 sync
  triggerSync();
}, []);

// render 時：hydrated ? data : skeleton
```

---

## 實裝計畫

### 新增檔案

```
src/lib/knowledge-base/
  ├─ kbClient.ts          ← API 客戶端（新增）
  ├─ kbCache.ts           ← 快取層（新增）
  ├─ useKnowledgeBase.ts  ← Hook 改寫
  ├─ types.ts             ← 現有
  ├─ constants.ts         ← 現有
  └─ __tests__/
      ├─ kbClient.test.ts      ← 新增
      ├─ kbCache.test.test.ts  ← 新增
      ├─ useKnowledgeBase.test.ts ← 改寫現有
      └─ offline-sync.test.ts  ← 新增（離線同步場景）
```

### Phase 3 分為兩個 sub-phase

#### Phase 3a：API 客戶端 + 快取層（1-2 天）

**目標**：完成 kbClient + kbCache 的核心邏輯，tested。

- `kbClient.ts`：
  - `getItems(kbId, filters?)` → GET /api/kb/search
  - `createItem(kbId, data)` → POST /api/kb/items
  - `updateItem(kbId, id, updates)` → PUT /api/kb/items/:id
  - `deleteItem(kbId, id)` → DELETE /api/kb/items/:id
  - `getStats()` → GET /api/kb/stats
  - 錯誤處理：重試、timeout、rate-limit

- `kbCache.ts`：
  - `LocalCacheManager` 類別
  - `loadFromLocal()` / `saveToLocal()`
  - `SyncQueue` 資料結構（持久化到 localStorage）
  - `conflict detection` 函式

- 測試：
  - kbClient 的 API 呼叫正確性（mock fetch）
  - kbCache 的本地儲存與恢復
  - 衝突偵測邏輯

#### Phase 3b：Hook 遷移 + 後台同步（2-3 天）

**目標**：改寫 useKnowledgeBase，完整測試離線/線上場景。

- `useKnowledgeBase.ts`：
  - 初始化：`tryLoadFromAPI()` 或 fallback localStorage
  - `addEntry()` / `updateEntry()` / `deleteEntry()` 改寫（加入隊列）
  - 背景同步：`useEffect(() => { startBackgroundSync() })`
  - 遠端拉回：定期 `checkRemoteChanges()`
  - 衝突處理：`handleConflict(local, remote)`
  - Hydration 安全

- 測試清單：
  - 初始化（有 API 版本、無 API、過期快取）
  - 離線操作 → 背景同步 → API 成功
  - 離線操作 → API 故障 → 重試
  - 衝突解決（Last-Write-Wins）
  - 遠端推送拉回同步
  - 批量操作（5+ 項）→ 單次 API 呼叫
  - 並行操作（用戶同時修改多項）
  - Hydration（SSR + client）

---

## 核心程式碼草稿

### kbClient.ts

```ts
/**
 * KB API 客戶端
 * 串接 /api/kb/* 端點
 */

import { logger } from "@/lib/logger";
import type { KBId, KBEntry } from "./types";

export interface ApiError {
  status: number;
  message: string;
  retryable: boolean;
}

class KBClient {
  private baseUrl = "/api/kb";
  private timeout = 10000; // 10s
  private maxRetries = 3;

  async getItems(
    kbId: KBId,
    filters?: { category?: string; status?: string; page?: number; limit?: number }
  ): Promise<{ items: KBEntry[]; total: number }> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([k, v]) => {
        if (v) params.append(k, String(v));
      });
    }
    return this.request(`/search?${params.toString()}`, "GET");
  }

  async createItem(kbId: KBId, data: Partial<KBEntry>): Promise<KBEntry> {
    return this.request("/items", "POST", { category: kbId, data });
  }

  async updateItem(kbId: KBId, id: string, updates: Partial<KBEntry>): Promise<KBEntry> {
    return this.request(`/items/${id}`, "PUT", { category: kbId, updates });
  }

  async deleteItem(kbId: KBId, id: string): Promise<void> {
    return this.request(`/items/${id}`, "DELETE", { category: kbId });
  }

  async getStats(): Promise<Record<string, number>> {
    return this.request("/stats", "GET");
  }

  // 內部：通用請求方法（含重試邏輯）
  private async request(
    endpoint: string,
    method: "GET" | "POST" | "PUT" | "DELETE",
    body?: any
  ): Promise<any> {
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
          method,
          headers: {
            "Content-Type": "application/json",
            // authHeader from session (handled by middleware)
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new ApiError(
            response.status,
            error.message || `HTTP ${response.status}`,
            response.status >= 500 || response.status === 408
          );
        }

        return response.json();
      } catch (err: any) {
        const isRetryable = err.retryable || err.name === "AbortError";
        if (!isRetryable || attempt === this.maxRetries) {
          logger.error("api", `KB API ${method} ${endpoint}`, err.message);
          throw err;
        }
        // exponential backoff
        await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 100));
      }
    }
  }
}

export const kbClient = new KBClient();
```

### kbCache.ts

```ts
/**
 * 離線快取層
 * 管理本地 localStorage + syncQueue
 */

import { logger } from "@/lib/logger";
import type { KBId, KBEntry, KnowledgeBaseData } from "./types";

const CACHE_KEY = "kb-cache-v2"; // 版本升級用
const QUEUE_KEY = "kb-sync-queue";

export interface SyncQueueItem {
  id: string;
  kbId: KBId;
  operation: "create" | "update" | "delete";
  data?: Partial<KBEntry>;
  timestamp: number;
  attempts: number;
}

export interface CacheMetadata {
  lastSyncTime: number;
  version: number;
}

class KBCache {
  private cache: Map<KBId, KBEntry[]> = new Map();
  private metadata: CacheMetadata = { lastSyncTime: 0, version: 1 };
  private syncQueue: SyncQueueItem[] = [];

  load(): KnowledgeBaseData {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return this.getEmpty();

      const { data, metadata } = JSON.parse(raw);
      this.cache = new Map(Object.entries(data));
      this.metadata = metadata;

      const queueRaw = localStorage.getItem(QUEUE_KEY);
      if (queueRaw) {
        this.syncQueue = JSON.parse(queueRaw);
      }

      logger.info("cache", `loaded ${this.syncQueue.length} pending items`);
      return this.toKnowledgeBaseData();
    } catch (err) {
      logger.warn("cache", "load failed, returning empty", String(err));
      return this.getEmpty();
    }
  }

  save(data: KnowledgeBaseData, metadata?: Partial<CacheMetadata>): void {
    try {
      this.cache = new Map(
        Object.entries(data).filter(([k]) => ["00A", "00B", "00C", "00D", "00E"].includes(k)) as [
          KBId,
          KBEntry[]
        ][]
      );
      if (metadata) {
        this.metadata = { ...this.metadata, ...metadata };
      }

      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          data: Object.fromEntries(this.cache),
          metadata: this.metadata,
        })
      );
    } catch (err) {
      logger.warn("cache", "save failed", String(err));
    }
  }

  // 隊列操作
  queueOperation(operation: SyncQueueItem): void {
    this.syncQueue.push(operation);
    this.persistQueue();
  }

  getQueue(): SyncQueueItem[] {
    return [...this.syncQueue];
  }

  clearQueueItem(id: string): void {
    this.syncQueue = this.syncQueue.filter((item) => item.id !== id);
    this.persistQueue();
  }

  incrementRetries(id: string): void {
    const item = this.syncQueue.find((i) => i.id === id);
    if (item) {
      item.attempts++;
      this.persistQueue();
    }
  }

  private persistQueue(): void {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(this.syncQueue));
    } catch (err) {
      logger.warn("cache", "queue persist failed", String(err));
    }
  }

  private toKnowledgeBaseData(): KnowledgeBaseData {
    return {
      "00A": this.cache.get("00A") || [],
      "00B": this.cache.get("00B") || [],
      "00C": this.cache.get("00C") || [],
      "00D": this.cache.get("00D") || [],
      "00E": this.cache.get("00E") || [],
      lastUpdated: new Date(this.metadata.lastSyncTime).toISOString(),
      version: this.metadata.version,
    };
  }

  private getEmpty(): KnowledgeBaseData {
    return {
      "00A": [],
      "00B": [],
      "00C": [],
      "00D": [],
      "00E": [],
      lastUpdated: new Date().toISOString(),
      version: 1,
    };
  }
}

export const kbCache = new KBCache();
```

### useKnowledgeBase.ts（主要改寫部分）

```ts
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { kbClient } from "./kbClient";
import { kbCache } from "./kbCache";
import type { KBId, KBEntry, KnowledgeBaseData } from "./types";

export function useKnowledgeBase() {
  const [data, setData] = useState<KnowledgeBaseData>(() => kbCache.load());
  const [hydrated, setHydrated] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [conflicts, setConflicts] = useState<Array<{ kbId: KBId; id: string; local: KBEntry; remote: KBEntry }>>([]);
  const syncTimerRef = useRef<NodeJS.Timeout>();

  // 初始化：背景拉取 API 版本
  useEffect(() => {
    setHydrated(true);
    triggerInitialSync();

    return () => {
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
      }
    };
  }, []);

  const triggerInitialSync = async () => {
    try {
      const stats = await kbClient.getStats();
      logger.info("kb", "Initial sync successful", stats);
      kbCache.save(data, { lastSyncTime: Date.now() });
    } catch (err) {
      logger.warn("kb", "Initial sync failed, using local cache", String(err));
    }
    // 啟動定期同步
    scheduleSync();
  };

  const scheduleSync = () => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      performBackgroundSync();
      scheduleSync(); // 迴圈
    }, 30000); // 30s 一次
  };

  const performBackgroundSync = async () => {
    setSyncing(true);
    const queue = kbCache.getQueue();
    for (const item of queue) {
      try {
        switch (item.operation) {
          case "create":
            await kbClient.createItem(item.kbId, item.data || {});
            break;
          case "update":
            if (item.data?.id) {
              await kbClient.updateItem(item.kbId, item.data.id, item.data);
            }
            break;
          case "delete":
            if (item.data?.id) {
              await kbClient.deleteItem(item.kbId, item.data.id);
            }
            break;
        }
        kbCache.clearQueueItem(item.id);
      } catch (err) {
        kbCache.incrementRetries(item.id);
        if (item.attempts > 5) {
          logger.error("kb", "sync failed after retries", item.id);
          kbCache.clearQueueItem(item.id); // 放棄
        }
      }
    }
    setSyncing(false);
  };

  // CRUD 操作（改寫：加入隊列）
  const addEntry = useCallback((kbId: KBId, entry: KBEntry) => {
    const newId = `${Date.now()}-${Math.random()}`;
    const newEntry = { ...entry, id: newId };

    // 立即更新本地
    setData((prev) => ({
      ...prev,
      [kbId]: [...prev[kbId], newEntry],
    }));

    // 加入隊列
    kbCache.queueOperation({
      id: newId,
      kbId,
      operation: "create",
      data: newEntry,
      timestamp: Date.now(),
      attempts: 0,
    });
  }, []);

  const updateEntry = useCallback(
    (kbId: KBId, entryId: string, updates: Partial<KBEntry>) => {
      // 立即更新本地
      setData((prev) => ({
        ...prev,
        [kbId]: (prev[kbId] as KBEntry[]).map((e) =>
          e.id === entryId ? { ...e, ...updates, updatedAt: new Date().toISOString() } : e
        ),
      }));

      // 加入隊列
      kbCache.queueOperation({
        id: `update-${entryId}`,
        kbId,
        operation: "update",
        data: { id: entryId, ...updates },
        timestamp: Date.now(),
        attempts: 0,
      });
    },
    []
  );

  const deleteEntry = useCallback((kbId: KBId, entryId: string) => {
    // 立即更新本地
    setData((prev) => ({
      ...prev,
      [kbId]: (prev[kbId] as KBEntry[]).filter((e) => e.id !== entryId),
    }));

    // 加入隊列
    kbCache.queueOperation({
      id: `delete-${entryId}`,
      kbId,
      operation: "delete",
      data: { id: entryId },
      timestamp: Date.now(),
      attempts: 0,
    });
  }, []);

  return {
    data: hydrated ? data : getEmpty(),
    hydrated,
    syncing,
    conflicts,
    addEntry,
    updateEntry,
    deleteEntry,
    // ...其他 CRUD
  };
}
```

---

## 測試策略

### 單元測試（2-3 天）

| 模組 | 測試覆蓋 | 預估測試數 |
|------|----------|----------|
| kbClient | API 呼叫正確性、重試邏輯、timeout | 18 tests |
| kbCache | 本地存儲、隊列管理、衝突偵測 | 16 tests |
| useKnowledgeBase | 初始化、CRUD、Hydration | 32 tests |
| 離線同步 | 離線→線上、衝突解決、批量操作 | 24 tests |
| **合計** | | **90 tests** |

### 整合測試（1-2 天）

- 端對端：創建 → 離線 → 上線 → 同步 → 驗證
- 衝突場景：本地修改 + 遠端推送同時發生
- 邊界：10+ items 批量、timeout 恢復、用戶快速連擊
- 性能：1000 items 快取載入時間 < 500ms

### 預期成果

- **3969 → 4059** 總測試（+90）
- build 成功
- 離線模式完整測試覆蓋

---

## 風險與規避

| 風險 | 規避策略 |
|------|----------|
| Hydration mismatch | 初始用 EMPTY_KB_DATA，useEffect 後才更新 |
| 無網路環境測試 | Mock fetch，模擬網路故障 |
| 大量待上傳操作 | 批量 POST，索引優化 |
| 衝突解決不當 | Last-Write-Wins + 詳細日誌 |
| 並行修改同一項 | 樂觀更新 + 最終一致性 |

---

## 交付物

1. **kbClient.ts** —— 完整 API 客戶端，12 methods + 重試邏輯
2. **kbCache.ts** —— 快取層，持久化 + 隊列管理
3. **useKnowledgeBase.ts** —— 遷移後的 Hook，背景同步
4. **__tests__/** —— 90+ 新增測試
5. **INTEGRATION_NOTES.md** —— 整合指南（给 UI 元件）

---

## 預計時程

| 階段 | 工作 | 日期 | 預估 |
|------|------|------|------|
| **3a** | API 客戶端 + 快取層 + 測試 | 02-24 ~ 02-25 | 1.5 天 |
| **3b** | Hook 遷移 + 同步邏輯 + 整合測試 | 02-25 ~ 02-27 | 2 天 |
| **驗收** | Z1FV 審查 + Jin 確認 | 02-27 ~ 02-28 | 1 天 |
| **交付** | push + 更新快照 | 02-28 | |

---

## 後續建議

1. **實裝後**：在真實無網路環境測試（飛行模式）
2. **監控**：生產環境中追蹤 sync 失敗率
3. **優化**：如果 API 延遲 > 500ms，考慮 WebSocket 推送替代輪詢
4. **未來**：考慮 Service Worker 層，支援更完整的離線操作

---

_由 A44T 設計，待 Z1FV 審查_
