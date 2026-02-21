import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock @notionhq/client with a class-based mock
vi.mock("@notionhq/client", () => {
  return {
    Client: class MockClient {
      auth: string;
      constructor(opts: { auth: string }) {
        this.auth = opts.auth;
      }
    },
  };
});

describe("notion/client", () => {
  beforeEach(() => {
    // Reset module registry so singleton resets
    vi.resetModules();
    // Clear env vars
    delete process.env.NOTION_TOKEN;
    delete process.env.NOTION_DATABASE_ID;
  });

  describe("getNotionClient", () => {
    it("throws when NOTION_TOKEN is not set", async () => {
      const { getNotionClient } = await import("../client");
      expect(() => getNotionClient()).toThrow("NOTION_TOKEN 環境變數未設定");
    });

    it("returns a Client when NOTION_TOKEN is set", async () => {
      process.env.NOTION_TOKEN = "test-token-123";
      const { getNotionClient } = await import("../client");
      const client = getNotionClient();
      expect(client).toBeDefined();
    });

    it("returns the same singleton on repeated calls", async () => {
      process.env.NOTION_TOKEN = "test-token-123";
      const { getNotionClient } = await import("../client");
      const a = getNotionClient();
      const b = getNotionClient();
      expect(a).toBe(b);
    });
  });

  describe("getDatabaseId", () => {
    it("throws when NOTION_DATABASE_ID is not set", async () => {
      const { getDatabaseId } = await import("../client");
      expect(() => getDatabaseId()).toThrow("NOTION_DATABASE_ID 環境變數未設定");
    });

    it("returns the database ID when set", async () => {
      process.env.NOTION_DATABASE_ID = "abc-123-def";
      const { getDatabaseId } = await import("../client");
      expect(getDatabaseId()).toBe("abc-123-def");
    });
  });
});
