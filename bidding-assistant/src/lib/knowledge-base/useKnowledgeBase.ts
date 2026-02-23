"use client";

/**
 * M02 Phase 3b: useKnowledgeBase Hook（API + 離線快取版）
 *
 * 功能：
 * - 背景同步：API 客戶端 + 離線快取層
 * - 樂觀更新：本地立即更新，非同步同步到 API
 * - 衝突解決：Last-Write-Wins + 時間戳比較
 * - Hydration 安全：SSR 兼容
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { logger } from "@/lib/logger";
import { kbClient } from "./kbClient";
import { kbCache } from "./kbCache";
import type { KBId, KBEntry, KnowledgeBaseData } from "./types";
import { EMPTY_KB_DATA } from "./constants";

const SYNC_INTERVAL = 30000; // 30s
const INITIAL_SYNC_TIMEOUT = 5000; // 5s
const CONFLICT_RETRY_LIMIT = 5; // 衝突重試限制

/**
 * Conflict 類型
 */
export interface KBConflict {
  kbId: KBId;
  entryId: string;
  local: KBEntry;
  remote: KBEntry;
  timestamp: number;
}

export function useKnowledgeBase() {
  // 狀態
  const [data, setData] = useState<KnowledgeBaseData>(() => EMPTY_KB_DATA);
  const [hydrated, setHydrated] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [conflicts, setConflicts] = useState<KBConflict[]>([]);

  // Refs
  const syncTimerRef = useRef<NodeJS.Timeout>();
  const initialSyncDoneRef = useRef(false);

  /**
   * 初始化：從快取載入，背景同步 API
   */
  useEffect(() => {
    // 1. 從快取載入
    const cachedData = kbCache.load();
    setData(cachedData);

    // 2. 背景初始同步（不阻塞 UI）
    triggerInitialSync();

    // 3. 設置清理
    setHydrated(true);

    return () => {
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
      }
    };
  }, []);

  /**
   * 初始化同步：嘗試從 API 拉取資料
   */
  const triggerInitialSync = async () => {
    if (initialSyncDoneRef.current) return;
    initialSyncDoneRef.current = true;

    try {
      setSyncing(true);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), INITIAL_SYNC_TIMEOUT);

      const stats = await kbClient.getStats();
      clearTimeout(timeout);

      logger.info("kb", "Initial sync successful", stats);
      kbCache.updateSyncTime(Date.now());

      // 啟動定期同步
      scheduleSync();
    } catch (err) {
      logger.warn("kb", "Initial sync failed, using local cache", String(err));
      // 仍然啟動定期同步，嘗試恢復
      scheduleSync();
    } finally {
      setSyncing(false);
    }
  };

  /**
   * 排程定期同步（30s 間隔）
   */
  const scheduleSync = () => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      performBackgroundSync();
      scheduleSync(); // 迴圈
    }, SYNC_INTERVAL);
  };

  /**
   * 背景同步：上傳隊列 + 拉取遠端變更
   */
  const performBackgroundSync = async () => {
    setSyncing(true);
    try {
      // 1. 上傳隊列
      const queue = kbCache.getQueue();
      for (const item of queue) {
        if (item.attempts > CONFLICT_RETRY_LIMIT) {
          logger.warn("kb", "Sync abandoned after retries", item.id);
          kbCache.clearQueueItem(item.id);
          continue;
        }

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
          logger.info("kb", "Queue item synced", item.id);
        } catch (err) {
          kbCache.incrementRetries(item.id);
          logger.warn("kb", "Queue sync failed", `${item.id}: ${String(err)}`);
        }
      }

      // 2. 拉取遠端變更（簡化：重新拉取所有資料）
      const remoteData = await kbClient.getItems({ limit: 1000 });
      if (remoteData.items.length > 0) {
        checkConflicts(remoteData.items);
      }

      kbCache.updateSyncTime(Date.now());
      logger.info("kb", "Background sync completed");
    } catch (err) {
      logger.error("kb", "Background sync failed", String(err));
    } finally {
      setSyncing(false);
    }
  };

  /**
   * 衝突檢測：Last-Write-Wins
   */
  const checkConflicts = (remoteItems: KBEntry[]) => {
    const newConflicts: KBConflict[] = [];

    for (const remote of remoteItems) {
      const kbId = (remote as any).category || detectCategory(remote);
      const local = data[kbId as KBId]?.find((e) => e.id === remote.id);

      if (!local) continue; // 遠端新增，無衝突

      const localTime = new Date(local.updatedAt || 0).getTime();
      const remoteTime = new Date(remote.updatedAt || 0).getTime();

      if (localTime > remoteTime) {
        // 本地更新，保留本地
        newConflicts.push({
          kbId: kbId as KBId,
          entryId: remote.id,
          local,
          remote,
          timestamp: Date.now(),
        });
      } else if (remoteTime > localTime) {
        // 遠端更新，應用遠端
        applyRemoteChange(kbId as KBId, remote);
      }
    }

    if (newConflicts.length > 0) {
      setConflicts(newConflicts);
      logger.warn("kb", "Conflicts detected", `${newConflicts.length} conflicts`);
    }
  };

  /**
   * 應用遠端變更
   */
  const applyRemoteChange = (kbId: KBId, remote: KBEntry) => {
    setData((prev) => ({
      ...prev,
      [kbId]: (prev[kbId] as KBEntry[]).map((e) => (e.id === remote.id ? remote : e)),
    }));
    kbCache.save(data);
    logger.debug("kb", "Remote change applied", remote.id);
  };

  /**
   * 偵測 KBId（根據 entry 結構）
   */
  const detectCategory = (entry: any): KBId => {
    if ("name" in entry && "title" in entry) return "00A"; // Member
    if ("stage" in entry) return "00B"; // Stage output
    if ("strategy" in entry) return "00C"; // Strategy
    if ("qa" in entry) return "00D"; // QA
    return "00E"; // Other
  };

  /**
   * 通用：新增條目（樂觀更新）
   */
  const addEntry = useCallback((kbId: KBId, entry: KBEntry) => {
    const newId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const newEntry = {
      ...entry,
      id: newId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 立即本地更新
    setData((prev) => ({
      ...prev,
      [kbId]: [...(prev[kbId] as KBEntry[]), newEntry],
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

    // 保存快取
    kbCache.save(data);
    logger.debug("kb", "Entry added", `${kbId}:${newId}`);
  }, [data]);

  /**
   * 通用：更新條目（樂觀更新）
   */
  const updateEntry = useCallback(
    (kbId: KBId, entryId: string, updates: Partial<KBEntry>) => {
      const now = new Date().toISOString();
      const merged = { ...updates, updatedAt: now };

      // 立即本地更新
      setData((prev) => ({
        ...prev,
        [kbId]: (prev[kbId] as KBEntry[]).map((e) => (e.id === entryId ? { ...e, ...merged } : e)),
      }));

      // 加入隊列
      kbCache.queueOperation({
        id: `update-${entryId}`,
        kbId,
        operation: "update",
        data: { id: entryId, ...merged },
        timestamp: Date.now(),
        attempts: 0,
      });

      // 保存快取
      kbCache.save(data);
      logger.debug("kb", "Entry updated", `${kbId}:${entryId}`);
    },
    [data]
  );

  /**
   * 通用：刪除條目（樂觀更新）
   */
  const deleteEntry = useCallback(
    (kbId: KBId, entryId: string) => {
      // 立即本地更新
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

      // 保存快取
      kbCache.save(data);
      logger.info("kb", "Entry deleted", `${kbId}:${entryId}`);
    },
    [data]
  );

  /**
   * 解決衝突：保留本地
   */
  const resolveConflictLocal = useCallback((conflict: KBConflict) => {
    setConflicts((prev) => prev.filter((c) => c.entryId !== conflict.entryId));
    logger.info("kb", "Conflict resolved (keep local)", conflict.entryId);
  }, []);

  /**
   * 解決衝突：接受遠端
   */
  const resolveConflictRemote = useCallback((conflict: KBConflict) => {
    applyRemoteChange(conflict.kbId, conflict.remote);
    setConflicts((prev) => prev.filter((c) => c.entryId !== conflict.entryId));
    logger.info("kb", "Conflict resolved (accept remote)", conflict.entryId);
  }, []);

  return {
    // 狀態
    data: hydrated ? data : EMPTY_KB_DATA,
    hydrated,
    syncing,
    conflicts,

    // 操作
    addEntry,
    updateEntry,
    deleteEntry,

    // 衝突解決
    resolveConflictLocal,
    resolveConflictRemote,
  };
}
