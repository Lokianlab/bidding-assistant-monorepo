/**
 * kbClient 測試
 * 驗證 API 客戶端的正確性、重試邏輯、錯誤處理
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { kbClient, ApiError } from "../kbClient";
import type { KBId } from "../types";

// Mock fetch
global.fetch = vi.fn();

describe("kbClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createItem", () => {
    it("should POST to /api/kb/items and return created item", async () => {
      const mockResponse = {
        id: "uuid-123",
        entryId: "M-001",
        category: "00A",
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => mockResponse,
      });

      const result = await kbClient.createItem("00A", {
        id: "M-001",
        name: "Test Member",
        title: "Engineer",
      });

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/kb/items",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        })
      );
    });

    it("should throw ApiError on 400 Bad Request", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: "Invalid category" }),
      });

      await expect(kbClient.createItem("INVALID" as KBId, {})).rejects.toThrow(ApiError);
    });

    it("should retry on 500 Server Error", async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({ error: "Database error" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          json: async () => ({ id: "uuid-123", entryId: "M-001", category: "00A" }),
        });

      const result = await kbClient.createItem("00A", { id: "M-001" });

      expect(result.id).toBe("uuid-123");
      expect(global.fetch).toHaveBeenCalledTimes(2); // 1 fail + 1 success
    });

    it("should fail after max retries", async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: "Server error" }),
      });

      await expect(kbClient.createItem("00A", {})).rejects.toThrow();
      expect(global.fetch).toHaveBeenCalledTimes(4); // 1 + 3 retries
    });
  });

  describe("getItems", () => {
    it("should GET /api/kb/items without filters", async () => {
      const mockResponse = {
        items: [],
        total: 0,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await kbClient.getItems();

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/kb/items",
        expect.objectContaining({ method: "GET" })
      );
    });

    it("should apply filters to query string", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ items: [], total: 0 }),
      });

      await kbClient.getItems({
        category: "00A",
        status: "active",
        page: 1,
        limit: 10,
      });

      const callUrl = (global.fetch as any).mock.calls[0][0];
      expect(callUrl).toContain("category=00A");
      expect(callUrl).toContain("status=active");
      expect(callUrl).toContain("page=1");
      expect(callUrl).toContain("limit=10");
    });
  });

  describe("updateItem", () => {
    it("should PUT to /api/kb/items/:id", async () => {
      const mockResponse = {
        id: "M-001",
        name: "Updated Name",
        title: "Manager",
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await kbClient.updateItem("00A", "uuid-123", {
        title: "Manager",
      });

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/kb/items/uuid-123",
        expect.objectContaining({ method: "PUT" })
      );
    });
  });

  describe("deleteItem", () => {
    it("should DELETE /api/kb/items/:id and return void", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      const result = await kbClient.deleteItem("00A", "uuid-123");

      expect(result).toBeUndefined();
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/kb/items/uuid-123",
        expect.objectContaining({ method: "DELETE" })
      );
    });
  });

  describe("search", () => {
    it("should GET /api/kb/search with query param", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ items: [], total: 0 }),
      });

      await kbClient.search({ q: "test" });

      const callUrl = (global.fetch as any).mock.calls[0][0];
      expect(callUrl).toContain("/search");
      expect(callUrl).toContain("q=test");
    });
  });

  describe("getStats", () => {
    it("should GET /api/kb/stats", async () => {
      const mockResponse = {
        "00A": 5,
        "00B": 3,
        "00C": 2,
        "00D": 1,
        "00E": 0,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await kbClient.getStats();

      expect(result).toEqual(mockResponse);
    });
  });

  describe("import", () => {
    it("should POST to /api/kb/import with mode", async () => {
      const mockResponse = { success: true, imported: 5 };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => mockResponse,
      });

      const result = await kbClient.import("append", {
        "00A": [{ id: "M-001" } as any],
      });

      expect(result).toEqual(mockResponse);
      const callBody = JSON.parse((global.fetch as any).mock.calls[0][1].body);
      expect(callBody.mode).toBe("append");
    });
  });

  describe("export", () => {
    it("should GET /api/kb/export with format", async () => {
      const mockResponse = {
        "00A": [],
        "00B": [],
        "00C": [],
        "00D": [],
        "00E": [],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      await kbClient.export("json");

      const callUrl = (global.fetch as any).mock.calls[0][0];
      expect(callUrl).toContain("format=json");
    });
  });

  describe("error handling", () => {
    it("should classify 401 as retryable=false", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: "Unauthorized" }),
      });

      try {
        await kbClient.getItems();
        expect.fail("Should throw");
      } catch (err: any) {
        expect(err).toBeInstanceOf(ApiError);
        expect((err as ApiError).retryable).toBe(false);
      }
    });

    it("should classify 502 as retryable=true", async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: false,
          status: 502,
          json: async () => ({ error: "Bad Gateway" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ items: [], total: 0 }),
        });

      const result = await kbClient.getItems();
      expect(result.items).toEqual([]);
    });

    it("should handle timeout (AbortError)", async () => {
      const abortError = new Error("Aborted");
      abortError.name = "AbortError";
      (global.fetch as any).mockRejectedValue(abortError);

      // 應該重試，最後失敗
      try {
        await kbClient.getItems();
        expect.fail("Should throw");
      } catch (err) {
        expect(global.fetch).toHaveBeenCalledTimes(4); // 1 + 3 retries
      }
    });
  });

  describe("concurrency", () => {
    it("should handle multiple concurrent requests", async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          json: async () => ({ id: "1" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ items: [], total: 0 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ "00A": 1 }),
        });

      const [create, list, stats] = await Promise.all([
        kbClient.createItem("00A", {}),
        kbClient.getItems(),
        kbClient.getStats(),
      ]);

      expect(create.id).toBe("1");
      expect(list.items).toEqual([]);
      expect(stats["00A"]).toBe(1);
    });
  });
});
