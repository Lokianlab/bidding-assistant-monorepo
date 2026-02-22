/**
 * P0 巡標 Layer C：排除記憶管理
 *
 * 記住使用者按過「不要」的案號，過濾搜尋結果
 */

import { PatrolItem } from './types';

/**
 * 排除記憶的儲存格式
 */
export interface ExclusionStore {
  excludedIds: Set<string>;
  excludedAt: Record<string, number>; // id → timestamp
}

/**
 * 初始化排除儲存
 */
export function initializeExclusionStore(): ExclusionStore {
  return {
    excludedIds: new Set(),
    excludedAt: {},
  };
}

/**
 * 從 localStorage 讀取排除記憶
 * 格式：JSON 陣列 `["unitId-jobNumber", ...]`
 */
export function loadExclusionStore(key: string = 'patrol-exclusion-list'): ExclusionStore {
  try {
    if (typeof window === 'undefined') {
      // 非瀏覽器環境
      return initializeExclusionStore();
    }

    const stored = localStorage.getItem(key);
    if (!stored) {
      return initializeExclusionStore();
    }

    const data = JSON.parse(stored);
    if (!Array.isArray(data)) {
      return initializeExclusionStore();
    }

    return {
      excludedIds: new Set(data),
      excludedAt: {}, // 簡化版，只保留 ID 清單
    };
  } catch {
    return initializeExclusionStore();
  }
}

/**
 * 保存排除記憶到 localStorage
 */
export function saveExclusionStore(
  store: ExclusionStore,
  key: string = 'patrol-exclusion-list'
): void {
  try {
    if (typeof window === 'undefined') return;

    const data = Array.from(store.excludedIds);
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // localStorage 滿或被禁用，靜默失敗
  }
}

/**
 * 標記單筆公告為「已排除」
 */
export function addExclusion(store: ExclusionStore, id: string): void {
  store.excludedIds.add(id);
  store.excludedAt[id] = Date.now();
}

/**
 * 取消排除（撈回已排除的公告）
 */
export function removeExclusion(store: ExclusionStore, id: string): void {
  store.excludedIds.delete(id);
  delete store.excludedAt[id];
}

/**
 * 檢查公告是否已排除
 */
export function isExcluded(store: ExclusionStore, id: string): boolean {
  return store.excludedIds.has(id);
}

/**
 * 過濾出未排除的公告
 */
export function filterExcluded(
  items: PatrolItem[],
  store: ExclusionStore
): PatrolItem[] {
  return items.filter((item) => !isExcluded(store, item.id));
}

/**
 * 過濾出已排除的公告
 */
export function getExcludedItems(
  items: PatrolItem[],
  store: ExclusionStore
): PatrolItem[] {
  return items.filter((item) => isExcluded(store, item.id));
}

/**
 * 清空排除記憶
 */
export function clearExclusions(store: ExclusionStore): void {
  store.excludedIds.clear();
  store.excludedAt = {};
}

/**
 * 取得排除統計
 */
export function getExclusionStats(store: ExclusionStore): {
  totalExcluded: number;
  oldestExclusionTime: number | null;
  newestExclusionTime: number | null;
} {
  const times = Object.values(store.excludedAt);
  return {
    totalExcluded: store.excludedIds.size,
    oldestExclusionTime: times.length > 0 ? Math.min(...times) : null,
    newestExclusionTime: times.length > 0 ? Math.max(...times) : null,
  };
}
