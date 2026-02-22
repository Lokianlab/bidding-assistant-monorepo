import { describe, it, expect } from "vitest";
import {
  getBuiltinTemplates,
  getTemplateById,
  getDefaultTemplate,
  templateToChapters,
  createEmptyChapter,
} from "../template-manager";
import { TEMPLATE_IDS } from "../constants";

describe("getBuiltinTemplates", () => {
  it("回傳非空的範本陣列", () => {
    const templates = getBuiltinTemplates();
    expect(templates.length).toBeGreaterThan(0);
  });

  it("包含標準建議書範本", () => {
    const templates = getBuiltinTemplates();
    expect(templates.find((t) => t.id === TEMPLATE_IDS.PROPOSAL_STANDARD)).toBeDefined();
  });

  it("包含自訂範本", () => {
    const templates = getBuiltinTemplates();
    expect(templates.find((t) => t.id === TEMPLATE_IDS.CUSTOM)).toBeDefined();
  });
});

describe("getTemplateById", () => {
  it("找到內建範本", () => {
    const t = getTemplateById(TEMPLATE_IDS.PROPOSAL_STANDARD);
    expect(t).toBeDefined();
    expect(t!.id).toBe(TEMPLATE_IDS.PROPOSAL_STANDARD);
  });

  it("找不到時回傳 undefined", () => {
    expect(getTemplateById("not-exist")).toBeUndefined();
  });

  it("自訂範本優先於內建", () => {
    const custom = {
      id: TEMPLATE_IDS.PROPOSAL_STANDARD,
      name: "覆蓋版",
      description: "test",
      chapters: [],
      variables: [],
    };
    const t = getTemplateById(TEMPLATE_IDS.PROPOSAL_STANDARD, [custom]);
    expect(t!.name).toBe("覆蓋版");
  });
});

describe("getDefaultTemplate", () => {
  it("回傳標準建議書", () => {
    const t = getDefaultTemplate();
    expect(t.id).toBe(TEMPLATE_IDS.PROPOSAL_STANDARD);
  });
});

describe("templateToChapters", () => {
  it("從範本建立工作台章節", () => {
    const template = getDefaultTemplate();
    const chapters = templateToChapters(template);
    expect(chapters.length).toBe(template.chapters.length);
    expect(chapters[0].title).toBe(template.chapters[0].defaultTitle);
    expect(chapters[0].content).toBe("");
    expect(chapters[0].charCount).toBe(0);
  });

  it("每個章節有唯一 ID", () => {
    const template = getDefaultTemplate();
    const chapters = templateToChapters(template);
    const ids = new Set(chapters.map((c) => c.id));
    expect(ids.size).toBe(chapters.length);
  });

  it("自訂範本（空章節）產生空陣列", () => {
    const customTemplate = getTemplateById(TEMPLATE_IDS.CUSTOM)!;
    const chapters = templateToChapters(customTemplate);
    expect(chapters).toHaveLength(0);
  });
});

describe("createEmptyChapter", () => {
  it("建立有預設標題的空章節", () => {
    const ch = createEmptyChapter();
    expect(ch.title).toBe("新章節");
    expect(ch.content).toBe("");
    expect(ch.charCount).toBe(0);
    expect(ch.id).toBeTruthy();
  });

  it("使用指定標題", () => {
    const ch = createEmptyChapter("第壹章");
    expect(ch.title).toBe("第壹章");
  });

  it("連續呼叫產生不同 ID", () => {
    const ch1 = createEmptyChapter();
    const ch2 = createEmptyChapter();
    expect(ch1.id).not.toBe(ch2.id);
  });
});
