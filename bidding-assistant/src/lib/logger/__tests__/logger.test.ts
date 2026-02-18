import { describe, it, expect, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock localStorage before importing the module under test
// ---------------------------------------------------------------------------

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get _store() {
      return store;
    },
  };
})();

Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

// Mock crypto.randomUUID so IDs are deterministic within each test
let uuidCounter = 0;
Object.defineProperty(globalThis, "crypto", {
  value: {
    randomUUID: () => `uuid-${++uuidCounter}`,
  },
});

// ---------------------------------------------------------------------------
// Import AFTER mocks are in place
// ---------------------------------------------------------------------------

// We need a fresh singleton for every test. The simplest approach is to
// re-import the module each time, but vitest caches modules. Instead we rely
// on clearing localStorage and resetting the singleton via the exported
// `logger` reference (the singleton reads/writes storage on every call, so
// clearing storage is sufficient to reset state).

import { logger } from "../index";
import type { LogLevel } from "../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STORAGE_KEY = "bidding-assistant-debug-logs";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("DebugLogger", () => {
  beforeEach(() => {
    localStorageMock.clear();
    uuidCounter = 0;
  });

  // -------------------------------------------------------------------------
  // Basic log / getEntries
  // -------------------------------------------------------------------------

  describe("log() and getEntries()", () => {
    it("should create a log entry and retrieve it", () => {
      logger.info("api", "Fetched data");

      const entries = logger.getEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0].level).toBe("info");
      expect(entries[0].category).toBe("api");
      expect(entries[0].message).toBe("Fetched data");
      expect(entries[0].id).toBe("uuid-1");
      expect(entries[0].timestamp).toBeDefined();
    });

    it("should store optional details and source", () => {
      logger.error("system", "Crash", "stack trace here", "app.tsx");

      const entries = logger.getEntries();
      expect(entries[0].details).toBe("stack trace here");
      expect(entries[0].source).toBe("app.tsx");
    });

    it("should omit details and source when not provided", () => {
      logger.debug("cache", "Cache hit");

      const entry = logger.getEntries()[0];
      expect(entry).not.toHaveProperty("details");
      expect(entry).not.toHaveProperty("source");
    });
  });

  // -------------------------------------------------------------------------
  // Convenience helpers
  // -------------------------------------------------------------------------

  describe("convenience methods", () => {
    it.each<[string, LogLevel]>([
      ["debug", "debug"],
      ["info", "info"],
      ["warn", "warn"],
      ["error", "error"],
    ])("%s() should log with level '%s'", (method, expectedLevel) => {
      logger[method as LogLevel]("api", "msg");
      const entries = logger.getEntries();
      expect(entries[0].level).toBe(expectedLevel);
    });
  });

  // -------------------------------------------------------------------------
  // Newest-first ordering
  // -------------------------------------------------------------------------

  describe("ordering", () => {
    it("should return entries newest first", () => {
      logger.info("api", "first");
      logger.info("api", "second");
      logger.info("api", "third");

      const entries = logger.getEntries();
      expect(entries[0].message).toBe("third");
      expect(entries[1].message).toBe("second");
      expect(entries[2].message).toBe("first");
    });
  });

  // -------------------------------------------------------------------------
  // Ring buffer
  // -------------------------------------------------------------------------

  describe("ring buffer (max 500)", () => {
    it("should keep only the most recent 500 entries", () => {
      for (let i = 1; i <= 510; i++) {
        logger.info("api", `message-${i}`);
      }

      const entries = logger.getEntries();
      expect(entries).toHaveLength(500);

      // Newest should be message-510
      expect(entries[0].message).toBe("message-510");
      // Oldest kept should be message-11 (messages 1-10 were evicted)
      expect(entries[entries.length - 1].message).toBe("message-11");
    });

    it("should correctly evict oldest entries on overflow", () => {
      // Fill to exactly 500
      for (let i = 1; i <= 500; i++) {
        logger.info("system", `entry-${i}`);
      }
      expect(logger.getEntries()).toHaveLength(500);

      // Add one more -- should evict the oldest
      logger.info("system", "entry-501");
      const entries = logger.getEntries();
      expect(entries).toHaveLength(500);
      expect(entries[0].message).toBe("entry-501");
      expect(entries[entries.length - 1].message).toBe("entry-2");
    });
  });

  // -------------------------------------------------------------------------
  // Filtering
  // -------------------------------------------------------------------------

  describe("filtering", () => {
    beforeEach(() => {
      logger.debug("cache", "cache debug msg");
      logger.info("api", "api info msg");
      logger.warn("settings", "settings warn msg");
      logger.error("api", "api error msg");
      logger.info("navigation", "nav info msg");
    });

    it("should filter by level", () => {
      const entries = logger.getEntries({ level: "info" });
      expect(entries).toHaveLength(2);
      entries.forEach((e) => expect(e.level).toBe("info"));
    });

    it("should filter by category", () => {
      const entries = logger.getEntries({ category: "api" });
      expect(entries).toHaveLength(2);
      entries.forEach((e) => expect(e.category).toBe("api"));
    });

    it("should filter by search keyword (case-insensitive)", () => {
      const entries = logger.getEntries({ search: "API" });
      expect(entries).toHaveLength(2);
      entries.forEach((e) => expect(e.message.toLowerCase()).toContain("api"));
    });

    it("should search in details and source fields", () => {
      logger.info("system", "unrelated", "contains API key info", "api-handler.ts");

      const byDetails = logger.getEntries({ search: "API key" });
      expect(byDetails.length).toBeGreaterThanOrEqual(1);

      const bySource = logger.getEntries({ search: "api-handler" });
      expect(bySource.length).toBeGreaterThanOrEqual(1);
    });

    it("should combine multiple filters", () => {
      const entries = logger.getEntries({ level: "info", category: "api" });
      expect(entries).toHaveLength(1);
      expect(entries[0].message).toBe("api info msg");
    });

    it("should return empty array when no entries match", () => {
      const entries = logger.getEntries({ level: "error", category: "cache" });
      expect(entries).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // clear()
  // -------------------------------------------------------------------------

  describe("clear()", () => {
    it("should remove all entries", () => {
      logger.info("api", "msg1");
      logger.info("api", "msg2");
      expect(logger.getEntries()).toHaveLength(2);

      logger.clear();
      expect(logger.getEntries()).toHaveLength(0);
    });

    it("should remove the localStorage key", () => {
      logger.info("api", "msg");
      logger.clear();
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // export()
  // -------------------------------------------------------------------------

  describe("export()", () => {
    it("should return a valid JSON string of all entries (newest first)", () => {
      logger.info("api", "first");
      logger.warn("system", "second");

      const json = logger.export();
      const parsed = JSON.parse(json);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(2);
      // newest first
      expect(parsed[0].message).toBe("second");
      expect(parsed[1].message).toBe("first");
    });

    it("should return '[]' when there are no entries", () => {
      expect(logger.export()).toBe("[]");
    });

    it("should produce pretty-printed JSON", () => {
      logger.info("api", "msg");
      const json = logger.export();
      // Pretty-printed JSON contains newlines
      expect(json).toContain("\n");
    });
  });

  // -------------------------------------------------------------------------
  // Edge cases
  // -------------------------------------------------------------------------

  describe("edge cases", () => {
    it("should handle corrupted localStorage gracefully", () => {
      localStorage.setItem(STORAGE_KEY, "NOT VALID JSON {{{");
      const entries = logger.getEntries();
      expect(entries).toHaveLength(0);

      // Should still be able to log after corruption
      logger.info("api", "recovered");
      expect(logger.getEntries()).toHaveLength(1);
    });

    it("should handle non-array localStorage value gracefully", () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ not: "an array" }));
      const entries = logger.getEntries();
      expect(entries).toHaveLength(0);
    });
  });
});
