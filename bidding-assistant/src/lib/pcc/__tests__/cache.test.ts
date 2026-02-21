import { describe, it, expect, beforeEach, vi } from "vitest";
import { cacheSet, cacheGet, cacheClear, cacheCleanup, cacheStats, CACHE_TTL } from "../cache";

// Mock localStorage for tests
const storage = new Map<string, string>();
const mockLocalStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
  key: (index: number) => Array.from(storage.keys())[index] ?? null,
  get length() { return storage.size; },
  clear: () => storage.clear(),
};

Object.defineProperty(globalThis, "localStorage", { value: mockLocalStorage });

describe("PCC cache", () => {
  beforeEach(() => {
    storage.clear();
    vi.restoreAllMocks();
  });

  it("set 和 get 基本流程", () => {
    cacheSet("search", "test-key", { records: [1, 2, 3] });
    const result = cacheGet<{ records: number[] }>("search", "test-key");
    expect(result).toEqual({ records: [1, 2, 3] });
  });

  it("不同 key 不互相影響", () => {
    cacheSet("search", "a", "value-a");
    cacheSet("search", "b", "value-b");
    expect(cacheGet("search", "a")).toBe("value-a");
    expect(cacheGet("search", "b")).toBe("value-b");
  });

  it("不同 category 不互相影響", () => {
    cacheSet("search", "key1", "search-val");
    cacheSet("detail", "key1", "detail-val");
    expect(cacheGet("search", "key1")).toBe("search-val");
    expect(cacheGet("detail", "key1")).toBe("detail-val");
  });

  it("過期項目回傳 null", () => {
    cacheSet("search", "expired", "old-data");

    // 篡改 timestamp 讓它過期
    const raw = storage.get("pcc-cache:search:expired")!;
    const entry = JSON.parse(raw);
    entry.timestamp = Date.now() - CACHE_TTL.search - 1000;
    storage.set("pcc-cache:search:expired", JSON.stringify(entry));

    expect(cacheGet("search", "expired")).toBeNull();
    // 過期項目應被自動清除
    expect(storage.has("pcc-cache:search:expired")).toBe(false);
  });

  it("不存在的 key 回傳 null", () => {
    expect(cacheGet("search", "nonexistent")).toBeNull();
  });

  it("cacheClear 清除指定 category", () => {
    cacheSet("search", "a", "1");
    cacheSet("search", "b", "2");
    cacheSet("detail", "c", "3");

    cacheClear("search");

    expect(cacheGet("search", "a")).toBeNull();
    expect(cacheGet("search", "b")).toBeNull();
    expect(cacheGet("detail", "c")).toBe("3"); // 其他 category 不受影響
  });

  it("cacheClear 無參數清除全部", () => {
    cacheSet("search", "a", "1");
    cacheSet("detail", "b", "2");
    cacheSet("company", "c", "3");

    cacheClear();

    expect(cacheGet("search", "a")).toBeNull();
    expect(cacheGet("detail", "b")).toBeNull();
    expect(cacheGet("company", "c")).toBeNull();
  });

  it("cacheCleanup 只清過期的", () => {
    cacheSet("search", "fresh", "ok");
    cacheSet("search", "old", "stale");

    // 讓 old 過期
    const raw = storage.get("pcc-cache:search:old")!;
    const entry = JSON.parse(raw);
    entry.timestamp = Date.now() - CACHE_TTL.search - 1000;
    storage.set("pcc-cache:search:old", JSON.stringify(entry));

    cacheCleanup();

    expect(cacheGet("search", "fresh")).toBe("ok");
    expect(storage.has("pcc-cache:search:old")).toBe(false);
  });

  it("cacheStats 統計正確", () => {
    cacheSet("search", "a", "1");
    cacheSet("search", "b", "2");
    cacheSet("detail", "c", "3");

    const stats = cacheStats();
    expect(stats.count).toBe(3);
    expect(stats.byCategory["search"]).toBe(2);
    expect(stats.byCategory["detail"]).toBe(1);
    expect(stats.sizeKB).toBeGreaterThan(0);
  });

  it("不影響非 pcc-cache 的 localStorage", () => {
    storage.set("other-key", "other-value");
    cacheSet("search", "test", "val");

    cacheClear();

    expect(storage.get("other-key")).toBe("other-value");
  });

  it("TTL 值合理", () => {
    expect(CACHE_TTL.search).toBe(4 * 60 * 60 * 1000);
    expect(CACHE_TTL.company).toBe(24 * 60 * 60 * 1000);
    expect(CACHE_TTL.detail).toBe(7 * 24 * 60 * 60 * 1000);
    expect(CACHE_TTL.analysis).toBe(12 * 60 * 60 * 1000);
  });
});
