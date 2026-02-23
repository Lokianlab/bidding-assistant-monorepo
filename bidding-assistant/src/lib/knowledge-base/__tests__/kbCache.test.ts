/**
 * kbCache 測試
 * 驗證快取層的本地儲存、隊列管理、版本檢查
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { kbCache, type SyncQueueItem } from "../kbCache";
import type { KBEntry00A } from "../types";
import { logger } from "@/lib/logger";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(global, "localStorage", {
  value: localStorageMock,
});

describe("kbCache", () => {
  beforeEach(() => {
    localStorage.clear();
    kbCache.clearQueue();
  });

  describe("load", () => {
    it("should return empty KnowledgeBaseData when localStorage is empty", () => {
      const data = kbCache.load();

      expect(data).toEqual({
        "00A": [],
        "00B": [],
        "00C": [],
        "00D": [],
        "00E": [],
        lastUpdated: expect.any(String),
        version: 2,
      });
    });

    it("should load cached data from localStorage", () => {
      const testData = {
        data: {
          "00A": [
            {
              id: "M-001",
              name: "Test Member",
              title: "Engineer",
              status: "在職",
            },
          ],
          "00B": [],
          "00C": [],
          "00D": [],
          "00E": [],
        },
        metadata: {
          lastSyncTime: 1234567890,
          version: 2,
        },
      };

      localStorage.setItem("kb-cache-v2", JSON.stringify(testData));

      const result = kbCache.load();

      expect(result["00A"]).toHaveLength(1);
      expect(result["00A"][0].name).toBe("Test Member");
    });

    it("should load sync queue from localStorage", () => {
      const testQueue: SyncQueueItem[] = [
        {
          id: "op-1",
          kbId: "00A",
          operation: "create",
          data: { id: "M-002", name: "New Member" },
          timestamp: Date.now(),
          attempts: 0,
        },
      ];

      localStorage.setItem("kb-sync-queue", JSON.stringify(testQueue));

      const data = kbCache.load();
      const queue = kbCache.getQueue();

      expect(queue).toHaveLength(1);
      expect(queue[0].id).toBe("op-1");
    });

    it("should handle corrupted JSON gracefully", () => {
      localStorage.setItem("kb-cache-v2", "invalid json{");

      const data = kbCache.load();

      expect(data["00A"]).toEqual([]);
      expect(data["00B"]).toEqual([]);
    });
  });

  describe("save", () => {
    it("should persist data to localStorage", () => {
      const testData = {
        "00A": [
          {
            id: "M-001",
            name: "Test Member",
            title: "Engineer",
            status: "在職",
          } as any,
        ],
        "00B": [],
        "00C": [],
        "00D": [],
        "00E": [],
        lastUpdated: new Date().toISOString(),
        version: 2,
      };

      kbCache.save(testData, { lastSyncTime: Date.now() });

      const stored = localStorage.getItem("kb-cache-v2");
      expect(stored).not.toBeNull();

      const parsed = JSON.parse(stored!);
      expect(parsed.data["00A"]).toHaveLength(1);
      expect(parsed.metadata.lastSyncTime).toBeGreaterThan(0);
    });

    it("should update metadata when provided", () => {
      kbCache.save(
        {
          "00A": [],
          "00B": [],
          "00C": [],
          "00D": [],
          "00E": [],
          lastUpdated: new Date().toISOString(),
          version: 2,
        },
        { lastSyncTime: 9999999 }
      );

      const stored = JSON.parse(localStorage.getItem("kb-cache-v2")!);
      expect(stored.metadata.lastSyncTime).toBe(9999999);
    });

    it("should handle localStorage quota exceeded", () => {
      const loggerWarnSpy = vi.spyOn(logger, "warn");

      // Mock localStorage.setItem to throw
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn(() => {
        throw new Error("QuotaExceededError");
      });

      kbCache.save(
        {
          "00A": [{ id: "M-001", name: "Test" } as any],
          "00B": [],
          "00C": [],
          "00D": [],
          "00E": [],
          lastUpdated: new Date().toISOString(),
          version: 2,
        },
        { lastSyncTime: Date.now() }
      );

      // Restore
      localStorage.setItem = originalSetItem;

      // Should log warning but not throw
      expect(loggerWarnSpy).toHaveBeenCalled();
      loggerWarnSpy.mockRestore();
    });
  });

  describe("queue operations", () => {
    it("should queue a new operation", () => {
      const item: SyncQueueItem = {
        id: "op-1",
        kbId: "00A",
        operation: "create",
        data: { id: "M-001", name: "Test" },
        timestamp: Date.now(),
        attempts: 0,
      };

      kbCache.queueOperation(item);
      const queue = kbCache.getQueue();

      expect(queue).toHaveLength(1);
      expect(queue[0].id).toBe("op-1");
    });

    it("should clear a queue item by id", () => {
      kbCache.queueOperation({
        id: "op-1",
        kbId: "00A",
        operation: "create",
        timestamp: Date.now(),
        attempts: 0,
      });

      kbCache.queueOperation({
        id: "op-2",
        kbId: "00B",
        operation: "update",
        timestamp: Date.now(),
        attempts: 0,
      });

      kbCache.clearQueueItem("op-1");

      const queue = kbCache.getQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].id).toBe("op-2");
    });

    it("should increment retry count", () => {
      kbCache.queueOperation({
        id: "op-1",
        kbId: "00A",
        operation: "create",
        timestamp: Date.now(),
        attempts: 0,
      });

      kbCache.incrementRetries("op-1");
      kbCache.incrementRetries("op-1");

      const queue = kbCache.getQueue();
      expect(queue[0].attempts).toBe(2);
    });

    it("should clear entire queue", () => {
      kbCache.queueOperation({
        id: "op-1",
        kbId: "00A",
        operation: "create",
        timestamp: Date.now(),
        attempts: 0,
      });

      kbCache.queueOperation({
        id: "op-2",
        kbId: "00B",
        operation: "create",
        timestamp: Date.now(),
        attempts: 0,
      });

      kbCache.clearQueue();

      expect(kbCache.getQueue()).toHaveLength(0);
    });

    it("should persist queue changes to localStorage", () => {
      kbCache.queueOperation({
        id: "op-1",
        kbId: "00A",
        operation: "create",
        timestamp: Date.now(),
        attempts: 0,
      });

      const stored = localStorage.getItem("kb-sync-queue");
      expect(stored).not.toBeNull();

      const parsed = JSON.parse(stored!);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].id).toBe("op-1");
    });
  });

  describe("metadata operations", () => {
    it("should get last sync time", () => {
      kbCache.save(
        {
          "00A": [],
          "00B": [],
          "00C": [],
          "00D": [],
          "00E": [],
          lastUpdated: new Date().toISOString(),
          version: 2,
        },
        { lastSyncTime: 5555555 }
      );

      const lastSync = kbCache.getLastSyncTime();
      expect(lastSync).toBe(5555555);
    });

    it("should update sync time", () => {
      const newTime = Date.now();
      kbCache.updateSyncTime(newTime);

      expect(kbCache.getLastSyncTime()).toBe(newTime);
    });
  });

  describe("version management", () => {
    it("should handle old version data", () => {
      const oldData = {
        data: {
          "00A": [{ id: "M-001", name: "Old Data" } as any],
          "00B": [],
          "00C": [],
          "00D": [],
          "00E": [],
        },
        metadata: {
          lastSyncTime: 1234567890,
          version: 1, // Old version
        },
      };

      localStorage.setItem("kb-cache-v2", JSON.stringify(oldData));

      const result = kbCache.load();

      // Should still load data and upgrade version
      expect(result["00A"]).toHaveLength(1);
      expect(result.version).toBe(2);
    });
  });

  describe("concurrent access", () => {
    it("should handle multiple queue operations in sequence", () => {
      const ops: SyncQueueItem[] = [];
      for (let i = 0; i < 5; i++) {
        ops.push({
          id: `op-${i}`,
          kbId: "00A",
          operation: "create",
          timestamp: Date.now(),
          attempts: 0,
        });
      }

      ops.forEach((op) => kbCache.queueOperation(op));

      const queue = kbCache.getQueue();
      expect(queue).toHaveLength(5);
    });

    it("should return queue copy (not reference)", () => {
      kbCache.queueOperation({
        id: "op-1",
        kbId: "00A",
        operation: "create",
        timestamp: Date.now(),
        attempts: 0,
      });

      const queue1 = kbCache.getQueue();
      const queue2 = kbCache.getQueue();

      // Should be different array objects
      expect(queue1).not.toBe(queue2);
      // But have same content
      expect(queue1).toEqual(queue2);
    });
  });
});
