import { describe, it, expect } from "vitest";
import {
  generateNextId,
  generateProjectId,
  renderKBToMarkdown,
  searchEntries,
  getKBStats,
} from "../helpers";
import type {
  KBId,
  KBEntry00A,
  KBEntry00B,
  KBEntry00C,
  KBEntry00D,
  KBEntry00E,
  KnowledgeBaseData,
} from "../types";

// ====== Helpers to build test data ======

function makeEntry00A(overrides: Partial<KBEntry00A> = {}): KBEntry00A {
  return {
    id: "M-001",
    name: "Test Member",
    title: "Engineer",
    status: "在職",
    authorizedRoles: ["計畫主持人", "協同主持人"],
    education: [],
    certifications: [],
    experiences: [],
    projects: [],
    additionalCapabilities: "",
    entryStatus: "active",
    updatedAt: "2024-01-01",
    ...overrides,
  };
}

function makeEntry00B(overrides: Partial<KBEntry00B> = {}): KBEntry00B {
  return {
    id: "P-2024-001",
    projectName: "Test Project",
    client: "Test Client",
    contractAmount: "1,000,000",
    period: "2024/01 - 2024/06",
    entity: "Test Corp",
    role: "得標廠商",
    completionStatus: "已驗收結案",
    teamMembers: "PM: John",
    workItems: [],
    outcomes: "",
    documentLinks: "",
    entryStatus: "active",
    updatedAt: "2024-01-01",
    ...overrides,
  };
}

function makeEntry00C(overrides: Partial<KBEntry00C> = {}): KBEntry00C {
  return {
    id: "T-EXH",
    templateName: "Exhibition Template",
    applicableType: "展覽策展",
    budgetRange: "100-500萬",
    durationRange: "3-6個月",
    phases: [],
    warnings: "",
    entryStatus: "active",
    updatedAt: "2024-01-01",
    ...overrides,
  };
}

function makeEntry00D(overrides: Partial<KBEntry00D> = {}): KBEntry00D {
  return {
    id: "R-MED",
    riskName: "Medical Emergency",
    riskLevel: "高",
    prevention: "",
    responseSteps: [],
    notes: "",
    entryStatus: "active",
    updatedAt: "2024-01-01",
    ...overrides,
  };
}

function makeEntry00E(overrides: Partial<KBEntry00E> = {}): KBEntry00E {
  return {
    id: "E-001",
    projectName: "Test Review",
    result: "得標",
    year: "2024",
    bidPhaseReview: "",
    executionReview: "",
    kbUpdateSuggestions: "",
    aiToolFeedback: "",
    oneSentenceSummary: "",
    entryStatus: "active",
    updatedAt: "2024-01-01",
    ...overrides,
  };
}

function makeKBData(overrides: Partial<KnowledgeBaseData> = {}): KnowledgeBaseData {
  return {
    "00A": [makeEntry00A()],
    "00B": [makeEntry00B()],
    "00C": [makeEntry00C()],
    "00D": [makeEntry00D()],
    "00E": [makeEntry00E()],
    lastUpdated: "2024-01-01",
    version: 1,
    ...overrides,
  };
}

// ====== generateNextId ======

describe("generateNextId", () => {
  it("returns prefix + 001 when no existing IDs", () => {
    expect(generateNextId([], "M-")).toBe("M-001");
  });

  it("returns the next sequential number", () => {
    expect(generateNextId(["M-001", "M-002", "M-003"], "M-")).toBe("M-004");
  });

  it("handles gaps in numbering by using max + 1", () => {
    expect(generateNextId(["M-001", "M-005"], "M-")).toBe("M-006");
  });

  it("ignores IDs with different prefixes", () => {
    expect(generateNextId(["E-001", "E-002", "M-001"], "M-")).toBe("M-002");
  });

  it("pads the number to 3 digits", () => {
    expect(generateNextId([], "T-")).toBe("T-001");
    expect(generateNextId(["T-099"], "T-")).toBe("T-100");
  });

  it("handles IDs with non-numeric suffixes", () => {
    // "M-abc" -> parseInt("abc") = NaN, filtered out
    expect(generateNextId(["M-abc", "M-001"], "M-")).toBe("M-002");
  });

  it("handles all-invalid IDs", () => {
    expect(generateNextId(["M-abc", "M-xyz"], "M-")).toBe("M-001");
  });
});

// ====== generateProjectId ======

describe("generateProjectId", () => {
  it("returns year-based ID starting from 001", () => {
    const year = new Date().getFullYear();
    expect(generateProjectId([])).toBe(`P-${year}-001`);
  });

  it("increments from existing project IDs for current year", () => {
    const year = new Date().getFullYear();
    const existing = [`P-${year}-001`, `P-${year}-003`];
    expect(generateProjectId(existing)).toBe(`P-${year}-004`);
  });

  it("ignores project IDs from other years", () => {
    const year = new Date().getFullYear();
    const existing = ["P-2020-001", "P-2020-005"];
    expect(generateProjectId(existing)).toBe(`P-${year}-001`);
  });

  it("handles empty array", () => {
    const year = new Date().getFullYear();
    expect(generateProjectId([])).toBe(`P-${year}-001`);
  });
});

// ====== renderKBToMarkdown ======

describe("renderKBToMarkdown", () => {
  it("renders 00A with header and member data", () => {
    const data = makeKBData({
      "00A": [
        makeEntry00A({
          name: "Alice",
          title: "PM",
          education: [{ school: "NTU", department: "CS", degree: "MS" }],
          certifications: [{ name: "PMP", issuer: "PMI", expiry: "永久" }],
          experiences: [
            {
              period: "2020-2024",
              organization: "TestCo",
              title: "PM",
              description: "Managed projects.",
            },
          ],
          projects: [
            {
              role: "PM",
              projectName: "Big Project",
              client: "Gov",
              year: "2023",
              outcome: "Success",
            },
          ],
          additionalCapabilities: "Fluent English",
        }),
      ],
    });
    const md = renderKBToMarkdown("00A", data);
    expect(md).toContain("# 00A");
    expect(md).toContain("團隊成員資料庫");
    expect(md).toContain("## 成員資料");
    expect(md).toContain("### M-001");
    expect(md).toContain("Alice");
    expect(md).toContain("**學歷**");
    expect(md).toContain("NTU");
    expect(md).toContain("**證照與認證**");
    expect(md).toContain("PMP");
    expect(md).toContain("**工作經歷**");
    expect(md).toContain("TestCo");
    expect(md).toContain("**專案經歷**");
    expect(md).toContain("Big Project");
    expect(md).toContain("**其他能力**");
    expect(md).toContain("Fluent English");
  });

  it("renders 00B with project data", () => {
    const data = makeKBData({
      "00B": [
        makeEntry00B({
          workItems: [{ item: "Planning", description: "Planned everything" }],
          outcomes: "Completed on time",
          documentLinks: "https://example.com",
        }),
      ],
    });
    const md = renderKBToMarkdown("00B", data);
    expect(md).toContain("# 00B");
    expect(md).toContain("公司實績資料庫");
    expect(md).toContain("## 實績資料");
    expect(md).toContain("Test Project");
    expect(md).toContain("**工作內容細項**");
    expect(md).toContain("Planning");
    expect(md).toContain("**成果數據**");
    expect(md).toContain("Completed on time");
    expect(md).toContain("**文件連結**");
  });

  it("renders 00C with timeline template", () => {
    const data = makeKBData({
      "00C": [
        makeEntry00C({
          phases: [
            {
              phase: "Phase 1",
              duration: "2 months",
              deliverables: "Report",
              checkpoints: "Review",
            },
          ],
          warnings: "Watch the schedule",
        }),
      ],
    });
    const md = renderKBToMarkdown("00C", data);
    expect(md).toContain("# 00C");
    expect(md).toContain("時程範本庫");
    expect(md).toContain("## 時程範本");
    expect(md).toContain("**階段規劃**");
    expect(md).toContain("Phase 1");
    expect(md).toContain("**常見低估提醒**");
  });

  it("renders 00D with SOP data", () => {
    const data = makeKBData({
      "00D": [
        makeEntry00D({
          prevention: "Regular checks",
          responseSteps: [
            { step: "1", action: "Call 911", responsible: "Safety Officer" },
          ],
          notes: "Important note",
        }),
      ],
    });
    const md = renderKBToMarkdown("00D", data);
    expect(md).toContain("# 00D");
    expect(md).toContain("應變SOP庫");
    expect(md).toContain("## 應變SOP");
    expect(md).toContain("**預防措施**");
    expect(md).toContain("**應變步驟**");
    expect(md).toContain("Call 911");
    expect(md).toContain("**備註**");
  });

  it("renders 00E with review data", () => {
    const data = makeKBData({
      "00E": [
        makeEntry00E({
          projectName: "Review Case",
          result: "未得標",
          bidPhaseReview: "Could improve",
          executionReview: "Good execution",
          kbUpdateSuggestions: "Add more templates",
          aiToolFeedback: "AI was helpful",
          oneSentenceSummary: "Lesson learned",
        }),
      ],
    });
    const md = renderKBToMarkdown("00E", data);
    expect(md).toContain("# 00E");
    expect(md).toContain("案後檢討庫");
    expect(md).toContain("## 案後檢討");
    expect(md).toContain("Review Case");
    expect(md).toContain("未得標");
    expect(md).toContain("**投標階段檢討**");
    expect(md).toContain("**執行階段檢討**");
    expect(md).toContain("**知識庫更新建議**");
    expect(md).toContain("**AI 工具回饋**");
    expect(md).toContain("**一句話總結**");
  });

  it("shows empty message when no active entries exist", () => {
    const data = makeKBData({
      "00A": [makeEntry00A({ entryStatus: "archived" })],
    });
    const md = renderKBToMarkdown("00A", data);
    expect(md).toContain("（尚無資料）");
    expect(md).not.toContain("## 成員資料");
  });

  it("filters out non-active entries", () => {
    const data = makeKBData({
      "00A": [
        makeEntry00A({ id: "M-001", name: "Active", entryStatus: "active" }),
        makeEntry00A({ id: "M-002", name: "Draft", entryStatus: "draft" }),
        makeEntry00A({ id: "M-003", name: "Archived", entryStatus: "archived" }),
      ],
    });
    const md = renderKBToMarkdown("00A", data);
    expect(md).toContain("Active");
    expect(md).not.toContain("Draft");
    expect(md).not.toContain("Archived");
  });

  it("includes header information for all KB types", () => {
    const kbIds: KBId[] = ["00A", "00B", "00C", "00D", "00E"];
    for (const kbId of kbIds) {
      const data = makeKBData();
      const md = renderKBToMarkdown(kbId, data);
      expect(md).toContain(`# ${kbId}`);
      expect(md).toContain("**用途**");
      expect(md).toContain("**最後更新**");
    }
  });
});

// ====== searchEntries ======

describe("searchEntries", () => {
  it("returns all entries when query is empty", () => {
    const entries = [makeEntry00A({ name: "Alice" }), makeEntry00A({ name: "Bob" })];
    expect(searchEntries(entries, "")).toEqual(entries);
    expect(searchEntries(entries, "  ")).toEqual(entries);
  });

  it("filters entries by name (case-insensitive)", () => {
    const entries = [
      makeEntry00A({ id: "M-001", name: "Alice" }),
      makeEntry00A({ id: "M-002", name: "Bob" }),
    ];
    const result = searchEntries(entries, "alice");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Alice");
  });

  it("searches across multiple string fields", () => {
    const entries = [
      makeEntry00A({ id: "M-001", name: "Alice", title: "Engineer" }),
      makeEntry00A({ id: "M-002", name: "Bob", title: "Designer" }),
    ];
    const result = searchEntries(entries, "engineer");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Alice");
  });

  it("searches inside array of strings (authorizedRoles)", () => {
    const entries = [
      makeEntry00A({ id: "M-001", name: "Alice", authorizedRoles: ["計畫主持人"] }),
      makeEntry00A({ id: "M-002", name: "Bob", authorizedRoles: ["協同主持人"] }),
    ];
    const result = searchEntries(entries, "計畫主持人");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Alice");
  });

  it("searches inside array of objects (education)", () => {
    const entries = [
      makeEntry00A({
        id: "M-001",
        name: "Alice",
        education: [{ school: "NTU", department: "CS", degree: "MS" }],
      }),
      makeEntry00A({
        id: "M-002",
        name: "Bob",
        education: [{ school: "NCKU", department: "EE", degree: "BS" }],
      }),
    ];
    const result = searchEntries(entries, "NTU");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Alice");
  });

  it("returns empty array when no entries match", () => {
    const entries = [makeEntry00A({ name: "Alice" })];
    expect(searchEntries(entries, "xyz-no-match")).toHaveLength(0);
  });

  it("handles entries with no searchable text gracefully", () => {
    const entries = [{ id: "M-001" } as KBEntry00A];
    expect(() => searchEntries(entries, "test")).not.toThrow();
  });

  it("works with 00B entries", () => {
    const entries = [
      makeEntry00B({ id: "P-2024-001", projectName: "Big Exhibition" }),
      makeEntry00B({ id: "P-2024-002", projectName: "Small Conference" }),
    ];
    const result = searchEntries(entries, "exhibition");
    expect(result).toHaveLength(1);
    expect(result[0].projectName).toBe("Big Exhibition");
  });
});

// ====== getKBStats ======

describe("getKBStats", () => {
  it("returns correct counts for each KB", () => {
    const data = makeKBData({
      "00A": [
        makeEntry00A({ entryStatus: "active" }),
        makeEntry00A({ entryStatus: "draft" }),
        makeEntry00A({ entryStatus: "archived" }),
      ],
      "00B": [
        makeEntry00B({ entryStatus: "active" }),
        makeEntry00B({ entryStatus: "active" }),
      ],
      "00C": [],
      "00D": [makeEntry00D({ entryStatus: "draft" })],
      "00E": [
        makeEntry00E({ entryStatus: "active" }),
        makeEntry00E({ entryStatus: "archived" }),
      ],
    });

    const stats = getKBStats(data);

    expect(stats["00A"]).toEqual({ total: 3, active: 1, draft: 1, archived: 1 });
    expect(stats["00B"]).toEqual({ total: 2, active: 2, draft: 0, archived: 0 });
    expect(stats["00C"]).toEqual({ total: 0, active: 0, draft: 0, archived: 0 });
    expect(stats["00D"]).toEqual({ total: 1, active: 0, draft: 1, archived: 0 });
    expect(stats["00E"]).toEqual({ total: 2, active: 1, draft: 0, archived: 1 });
  });

  it("handles all-empty KBs", () => {
    const data = makeKBData({
      "00A": [],
      "00B": [],
      "00C": [],
      "00D": [],
      "00E": [],
    });
    const stats = getKBStats(data);
    const kbIds: KBId[] = ["00A", "00B", "00C", "00D", "00E"];
    for (const id of kbIds) {
      expect(stats[id]).toEqual({ total: 0, active: 0, draft: 0, archived: 0 });
    }
  });

  it("returns stats for all 5 KB types", () => {
    const data = makeKBData();
    const stats = getKBStats(data);
    const kbIds: KBId[] = ["00A", "00B", "00C", "00D", "00E"];
    for (const id of kbIds) {
      expect(stats[id]).toBeDefined();
      expect(stats[id]).toHaveProperty("total");
      expect(stats[id]).toHaveProperty("active");
      expect(stats[id]).toHaveProperty("draft");
      expect(stats[id]).toHaveProperty("archived");
    }
  });
});
