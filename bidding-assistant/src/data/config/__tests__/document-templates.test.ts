import { describe, it, expect } from "vitest";
import {
  DOCUMENT_TEMPLATES,
  DEFAULT_TEMPLATE_ID,
} from "../document-templates";
import { TEMPLATE_IDS } from "@/lib/output/constants";

// ── DOCUMENT_TEMPLATES ───────────────────────────────────────

describe("DOCUMENT_TEMPLATES", () => {
  it("包含三個範本", () => {
    expect(DOCUMENT_TEMPLATES).toHaveLength(3);
  });

  it("每個範本都有 id、name、description、chapters、variables", () => {
    for (const template of DOCUMENT_TEMPLATES) {
      expect(typeof template.id).toBe("string");
      expect(template.id.length).toBeGreaterThan(0);
      expect(typeof template.name).toBe("string");
      expect(template.name.length).toBeGreaterThan(0);
      expect(typeof template.description).toBe("string");
      expect(template.description.length).toBeGreaterThan(0);
      expect(Array.isArray(template.chapters)).toBe(true);
      expect(Array.isArray(template.variables)).toBe(true);
    }
  });

  it("範本 ID 不重複", () => {
    const ids = DOCUMENT_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("範本 ID 全部來自 TEMPLATE_IDS 常數", () => {
    const validIds: Set<string> = new Set(Object.values(TEMPLATE_IDS));
    for (const template of DOCUMENT_TEMPLATES) {
      expect(validIds.has(template.id)).toBe(true);
    }
  });

  it("每個範本都有 projectName 和 companyName 變數", () => {
    for (const template of DOCUMENT_TEMPLATES) {
      const keys = template.variables.map((v) => v.key);
      expect(keys).toContain("projectName");
      expect(keys).toContain("companyName");
    }
  });

  it("每個變數都有 key、label、source、defaultValue", () => {
    for (const template of DOCUMENT_TEMPLATES) {
      for (const variable of template.variables) {
        expect(typeof variable.key).toBe("string");
        expect(variable.key.length).toBeGreaterThan(0);
        expect(typeof variable.label).toBe("string");
        expect(variable.label.length).toBeGreaterThan(0);
        expect(typeof variable.source).toBe("string");
        expect(["manual", "settings"]).toContain(variable.source);
        expect(typeof variable.defaultValue).toBe("string");
      }
    }
  });
});

// ── 標準建議書範本 ───────────────────────────────────────────

describe("標準建議書範本", () => {
  const standard = DOCUMENT_TEMPLATES.find(
    (t) => t.id === TEMPLATE_IDS.PROPOSAL_STANDARD,
  )!;

  it("存在", () => {
    expect(standard).toBeDefined();
  });

  it("有五個章節", () => {
    expect(standard.chapters).toHaveLength(5);
  });

  it("每章都有 defaultTitle、required、suggestedLength、kbSuggestions、guideText", () => {
    for (const chapter of standard.chapters) {
      expect(typeof chapter.defaultTitle).toBe("string");
      expect(chapter.defaultTitle.length).toBeGreaterThan(0);
      expect(typeof chapter.required).toBe("boolean");
      expect(typeof chapter.suggestedLength).toBe("string");
      expect(Array.isArray(chapter.kbSuggestions)).toBe(true);
      expect(typeof chapter.guideText).toBe("string");
      expect(chapter.guideText.length).toBeGreaterThan(0);
    }
  });

  it("前四章為必填，第五章為選填", () => {
    expect(standard.chapters[0].required).toBe(true);
    expect(standard.chapters[1].required).toBe(true);
    expect(standard.chapters[2].required).toBe(true);
    expect(standard.chapters[3].required).toBe(true);
    expect(standard.chapters[4].required).toBe(false);
  });

  it("kbSuggestions 只包含有效知識庫 ID", () => {
    const validKBIds = ["00A", "00B", "00C", "00D", "00E"];
    for (const chapter of standard.chapters) {
      for (const kb of chapter.kbSuggestions) {
        expect(validKBIds).toContain(kb);
      }
    }
  });

  it("有三個變數（projectName, companyName, contactAgency）", () => {
    expect(standard.variables).toHaveLength(3);
    const keys = standard.variables.map((v) => v.key);
    expect(keys).toContain("projectName");
    expect(keys).toContain("companyName");
    expect(keys).toContain("contactAgency");
  });
});

// ── 簡式建議書範本 ───────────────────────────────────────────

describe("簡式建議書範本", () => {
  const simplified = DOCUMENT_TEMPLATES.find(
    (t) => t.id === TEMPLATE_IDS.PROPOSAL_SIMPLIFIED,
  )!;

  it("存在", () => {
    expect(simplified).toBeDefined();
  });

  it("有三個章節", () => {
    expect(simplified.chapters).toHaveLength(3);
  });

  it("所有章節都是必填", () => {
    for (const chapter of simplified.chapters) {
      expect(chapter.required).toBe(true);
    }
  });
});

// ── 自訂範本 ─────────────────────────────────────────────────

describe("自訂範本", () => {
  const custom = DOCUMENT_TEMPLATES.find(
    (t) => t.id === TEMPLATE_IDS.CUSTOM,
  )!;

  it("存在", () => {
    expect(custom).toBeDefined();
  });

  it("章節為空（使用者自行定義）", () => {
    expect(custom.chapters).toHaveLength(0);
  });
});

// ── DEFAULT_TEMPLATE_ID ──────────────────────────────────────

describe("DEFAULT_TEMPLATE_ID", () => {
  it("等於標準建議書的 ID", () => {
    expect(DEFAULT_TEMPLATE_ID).toBe(TEMPLATE_IDS.PROPOSAL_STANDARD);
  });

  it("在 DOCUMENT_TEMPLATES 中存在", () => {
    const found = DOCUMENT_TEMPLATES.find((t) => t.id === DEFAULT_TEMPLATE_ID);
    expect(found).toBeDefined();
  });
});
