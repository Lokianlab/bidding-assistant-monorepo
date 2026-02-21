// ====== PCC 資料快取 ======
// localStorage 快取層，TTL 自動過期清理。

/** 快取 TTL 設定（毫秒） */
export const CACHE_TTL = {
  search: 4 * 60 * 60 * 1000,       // 搜尋結果：4 小時
  company: 24 * 60 * 60 * 1000,     // 自家紀錄：24 小時
  detail: 7 * 24 * 60 * 60 * 1000,  // 標案詳情：7 天
  analysis: 12 * 60 * 60 * 1000,    // 分析報告：12 小時
} as const;

export type CacheCategory = keyof typeof CACHE_TTL;

const PREFIX = "pcc-cache:";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/** 存入快取 */
export function cacheSet<T>(category: CacheCategory, key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: CACHE_TTL[category],
    };
    localStorage.setItem(`${PREFIX}${category}:${key}`, JSON.stringify(entry));
  } catch {
    // localStorage 滿了就算了，不影響功能
  }
}

/** 從快取讀取（過期回傳 null） */
export function cacheGet<T>(category: CacheCategory, key: string): T | null {
  try {
    const raw = localStorage.getItem(`${PREFIX}${category}:${key}`);
    if (!raw) return null;

    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.timestamp > entry.ttl) {
      localStorage.removeItem(`${PREFIX}${category}:${key}`);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

/** 清除某個分類的所有快取 */
export function cacheClear(category?: CacheCategory): void {
  const prefix = category ? `${PREFIX}${category}:` : PREFIX;
  const toRemove: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(prefix)) {
      toRemove.push(key);
    }
  }

  toRemove.forEach((k) => localStorage.removeItem(k));
}

/** 清除所有過期項目 */
export function cacheCleanup(): void {
  const toRemove: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(PREFIX)) continue;

    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const entry: CacheEntry<unknown> = JSON.parse(raw);
      if (Date.now() - entry.timestamp > entry.ttl) {
        toRemove.push(key);
      }
    } catch {
      toRemove.push(key!);
    }
  }

  toRemove.forEach((k) => localStorage.removeItem(k));
}

/** 取得快取統計（用於設定頁顯示） */
export function cacheStats(): { count: number; sizeKB: number; byCategory: Record<string, number> } {
  let count = 0;
  let totalSize = 0;
  const byCategory: Record<string, number> = {};

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(PREFIX)) continue;

    count++;
    const value = localStorage.getItem(key) ?? "";
    totalSize += key.length + value.length;

    const category = key.replace(PREFIX, "").split(":")[0];
    byCategory[category] = (byCategory[category] ?? 0) + 1;
  }

  return {
    count,
    sizeKB: Math.ceil((totalSize * 2) / 1024), // UTF-16 = 2 bytes per char
    byCategory,
  };
}
