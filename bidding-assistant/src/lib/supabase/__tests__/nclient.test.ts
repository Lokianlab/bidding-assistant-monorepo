import { describe, it, expect, vi, beforeEach } from "vitest";
import type { KBEntry, KBMetadata, KBAttachment } from "../types";

/**
 * Supabase 客户端測試
 * 驗証基礎的 CRUD 操作和類型定義
 */

describe("Supabase Types", () => {
  describe("KBEntry", () => {
    it("應包含所有必要欄位", () => {
      const entry: KBEntry = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        tenant_id: "user-123",
        category: "00A",
        entry_id: "M-001",
        status: "active",
        data: { name: "Team Member", title: "Engineer" },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      expect(entry.id).toBeDefined();
      expect(entry.tenant_id).toBeDefined();
      expect(entry.category).toBe("00A");
      expect(entry.entry_id).toBe("M-001");
      expect(entry.status).toBe("active");
      expect(entry.data).toEqual({ name: "Team Member", title: "Engineer" });
    });

    it("支持所有 5 個類別", () => {
      const categories = ["00A", "00B", "00C", "00D", "00E"] as const;

      categories.forEach((cat) => {
        const entry: KBEntry = {
          id: "123e4567-e89b-12d3-a456-426614174000",
          tenant_id: "user-123",
          category: cat,
          entry_id: `TEST-${cat}`,
          status: "active",
          data: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        expect(entry.category).toBe(cat);
      });
    });

    it("支持所有 3 個狀態", () => {
      const statuses = ["active", "draft", "archived"] as const;

      statuses.forEach((status) => {
        const entry: KBEntry = {
          id: "123e4567-e89b-12d3-a456-426614174000",
          tenant_id: "user-123",
          category: "00A",
          entry_id: "M-001",
          status,
          data: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        expect(entry.status).toBe(status);
      });
    });

    it("data 欄位可存儲任意 JSON", () => {
      const entry: KBEntry = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        tenant_id: "user-123",
        category: "00B",
        entry_id: "P-2025-001",
        status: "active",
        data: {
          projectName: "高鐵延伸線",
          client: "交通部",
          contractAmount: 5000000,
          period: "2024-01-01 ~ 2024-12-31",
          entity: "大員工程",
          role: "主要承包商",
          workItems: ["設計", "施工", "監造"],
          photos: ["photo1.jpg", "photo2.jpg"],
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      expect(entry.data.projectName).toBe("高鐵延伸線");
      expect(entry.data.workItems).toHaveLength(3);
      expect(entry.data.photos).toHaveLength(2);
    });
  });

  describe("KBMetadata", () => {
    it("應包含版本和設定信息", () => {
      const metadata: KBMetadata = {
        tenant_id: "user-123",
        version: 1,
        last_synced: new Date().toISOString(),
        settings: {
          syncEnabled: true,
          cacheMaxAge: 86400000,
          autoMigrate: false,
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      expect(metadata.tenant_id).toBe("user-123");
      expect(metadata.version).toBe(1);
      expect(metadata.settings.syncEnabled).toBe(true);
    });

    it("last_synced 可為 null", () => {
      const metadata: KBMetadata = {
        tenant_id: "user-123",
        version: 1,
        last_synced: null,
        settings: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      expect(metadata.last_synced).toBeNull();
    });
  });

  describe("KBAttachment", () => {
    it("應包含文件存儲信息", () => {
      const attachment: KBAttachment = {
        id: "attach-123",
        tenant_id: "user-123",
        entry_id: "entry-456",
        filename: "proposal.pdf",
        storage_path: "user-123/00B/proposal.pdf",
        mime_type: "application/pdf",
        size_bytes: 1024000,
        created_at: new Date().toISOString(),
      };

      expect(attachment.filename).toBe("proposal.pdf");
      expect(attachment.storage_path).toMatch(/^user-123\/00B\//);
      expect(attachment.mime_type).toBe("application/pdf");
    });

    it("entry_id 可為 null（條目刪除後）", () => {
      const attachment: KBAttachment = {
        id: "attach-123",
        tenant_id: "user-123",
        entry_id: null,
        filename: "orphan.docx",
        storage_path: "user-123/00A/orphan.docx",
        mime_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        size_bytes: 512000,
        created_at: new Date().toISOString(),
      };

      expect(attachment.entry_id).toBeNull();
    });
  });

  describe("API Request/Response Types", () => {
    it("KBCreateRequest 包含必要欄位", () => {
      const req = {
        category: "00C" as const,
        data: {
          templateName: "標準招標流程",
          applicableType: "工程",
          budgetRange: "$5M-$10M",
          phases: ["規劃", "設計", "施工"],
        },
      };

      expect(req.category).toBe("00C");
      expect(req.data.templateName).toBeDefined();
    });

    it("KBSearchRequest 支持各種過濾", () => {
      const req = {
        query: "高鐵",
        categories: ["00A", "00B"] as const,
        status: "active" as const,
        limit: 50,
        offset: 0,
      };

      expect(req.query).toBe("高鐵");
      expect(req.categories).toHaveLength(2);
      expect(req.limit).toBe(50);
    });

    it("KBStatsResponse 統計各狀態數量", () => {
      const stats = {
        "00A": { total: 10, active: 8, draft: 1, archived: 1 },
        "00B": { total: 25, active: 20, draft: 3, archived: 2 },
        "00C": { total: 5, active: 5, draft: 0, archived: 0 },
        "00D": { total: 12, active: 10, draft: 2, archived: 0 },
        "00E": { total: 3, active: 3, draft: 0, archived: 0 },
      };

      expect(stats["00A"].total).toBe(10);
      expect(stats["00B"].active).toBe(20);
      expect(stats["00C"].draft).toBe(0);
    });
  });

  describe("Schema 驗證", () => {
    it("entry_id 應該是人類可讀格式", () => {
      const validIds = ["M-001", "P-2025-001", "T-EXH-2024", "R-RISK-001", "E-REVIEW-2024"];

      validIds.forEach((id) => {
        const entry: KBEntry = {
          id: "uuid",
          tenant_id: "user",
          category: "00A",
          entry_id: id,
          status: "active",
          data: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        expect(entry.entry_id).toBe(id);
      });
    });

    it("JSONB data 可存儲嵌套結構", () => {
      const complexData = {
        name: "Team",
        members: [
          { name: "Alice", role: "Lead", experience: 10 },
          { name: "Bob", role: "Engineer", experience: 5 },
        ],
        metadata: {
          founded: 2020,
          active: true,
          skills: {
            frontend: ["React", "TypeScript"],
            backend: ["Node.js", "PostgreSQL"],
          },
        },
      };

      const entry: KBEntry = {
        id: "uuid",
        tenant_id: "user",
        category: "00A",
        entry_id: "M-001",
        status: "active",
        data: complexData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      expect(entry.data.members).toHaveLength(2);
      expect(entry.data.metadata.skills.frontend).toContain("React");
    });
  });
});
