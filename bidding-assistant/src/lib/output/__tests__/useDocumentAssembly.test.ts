import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDocumentAssembly } from "../useDocumentAssembly";
import { getDefaultTemplate, getBuiltinTemplates } from "../template-manager";

// ── 初始狀態 ──────────────────────────────────────────────────

describe("useDocumentAssembly — 初始狀態", () => {
  it("初始 templateId = 預設範本 id", () => {
    const { result } = renderHook(() => useDocumentAssembly());
    expect(result.current.templateId).toBe(getDefaultTemplate().id);
  });

  it("初始 projectName 為空字串", () => {
    const { result } = renderHook(() => useDocumentAssembly());
    expect(result.current.projectName).toBe("");
  });

  it("初始 lastAssembly 為 null", () => {
    const { result } = renderHook(() => useDocumentAssembly());
    expect(result.current.lastAssembly).toBeNull();
  });

  it("初始 chapters 數量與預設範本一致", () => {
    const { result } = renderHook(() => useDocumentAssembly());
    const defaultTemplate = getDefaultTemplate();
    expect(result.current.chapters).toHaveLength(defaultTemplate.chapters.length);
  });

  it("初始每個 chapter 的 charCount 為 0（content 為空）", () => {
    const { result } = renderHook(() => useDocumentAssembly());
    result.current.chapters.forEach((ch) => {
      expect(ch.charCount).toBe(0);
      expect(ch.content).toBe("");
    });
  });

  it("初始每個 chapter 都有唯一 id", () => {
    const { result } = renderHook(() => useDocumentAssembly());
    const ids = result.current.chapters.map((ch) => ch.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ── setTemplateId ─────────────────────────────────────────────

describe("useDocumentAssembly — setTemplateId()", () => {
  it("切換有效範本 ID → templateId 更新", () => {
    const templates = getBuiltinTemplates();
    if (templates.length < 2) return; // 跳過：只有一個範本

    const { result } = renderHook(() => useDocumentAssembly());
    const altTemplate = templates.find((t) => t.id !== result.current.templateId)!;

    act(() => {
      result.current.setTemplateId(altTemplate.id);
    });

    expect(result.current.templateId).toBe(altTemplate.id);
  });

  it("切換範本後 chapters 改為新範本的章節", () => {
    const templates = getBuiltinTemplates();
    if (templates.length < 2) return;

    const { result } = renderHook(() => useDocumentAssembly());
    const altTemplate = templates.find((t) => t.id !== result.current.templateId)!;

    act(() => {
      result.current.setTemplateId(altTemplate.id);
    });

    expect(result.current.chapters).toHaveLength(altTemplate.chapters.length);
  });

  it("切換範本後 lastAssembly 重設為 null", () => {
    const templates = getBuiltinTemplates();
    if (templates.length < 2) return;

    const { result } = renderHook(() => useDocumentAssembly());
    const altTemplate = templates.find((t) => t.id !== result.current.templateId)!;

    // 先做一次組裝讓 lastAssembly 有值
    act(() => {
      result.current.assemble();
    });
    expect(result.current.lastAssembly).not.toBeNull();

    act(() => {
      result.current.setTemplateId(altTemplate.id);
    });

    expect(result.current.lastAssembly).toBeNull();
  });

  it("傳入不存在的範本 ID → 狀態不改變", () => {
    const { result } = renderHook(() => useDocumentAssembly());
    const originalId = result.current.templateId;
    const originalChapters = result.current.chapters;

    act(() => {
      result.current.setTemplateId("non-existent-id");
    });

    expect(result.current.templateId).toBe(originalId);
    expect(result.current.chapters).toBe(originalChapters);
  });
});

// ── setProjectName ────────────────────────────────────────────

describe("useDocumentAssembly — setProjectName()", () => {
  it("設定 projectName", () => {
    const { result } = renderHook(() => useDocumentAssembly());

    act(() => {
      result.current.setProjectName("測試標案");
    });

    expect(result.current.projectName).toBe("測試標案");
  });

  it("可以清空 projectName", () => {
    const { result } = renderHook(() => useDocumentAssembly());

    act(() => {
      result.current.setProjectName("先設定");
    });
    act(() => {
      result.current.setProjectName("");
    });

    expect(result.current.projectName).toBe("");
  });
});

// ── updateChapter ─────────────────────────────────────────────

describe("useDocumentAssembly — updateChapter()", () => {
  it("更新 content 後 charCount 同步計算", () => {
    const { result } = renderHook(() => useDocumentAssembly());
    const chapterId = result.current.chapters[0].id;

    act(() => {
      result.current.updateChapter(chapterId, { content: "你好世界" });
    });

    const updated = result.current.chapters.find((ch) => ch.id === chapterId)!;
    expect(updated.content).toBe("你好世界");
    expect(updated.charCount).toBe(4); // countChars("你好世界") = 4
  });

  it("更新 title", () => {
    const { result } = renderHook(() => useDocumentAssembly());
    const chapterId = result.current.chapters[0].id;

    act(() => {
      result.current.updateChapter(chapterId, { title: "新標題" });
    });

    const updated = result.current.chapters.find((ch) => ch.id === chapterId)!;
    expect(updated.title).toBe("新標題");
  });

  it("更新不存在的 id → chapters 不改變", () => {
    const { result } = renderHook(() => useDocumentAssembly());
    const before = result.current.chapters;

    act(() => {
      result.current.updateChapter("non-existent", { content: "abc" });
    });

    expect(result.current.chapters).toEqual(before);
  });

  it("content 前後空白不計入 charCount", () => {
    const { result } = renderHook(() => useDocumentAssembly());
    const chapterId = result.current.chapters[0].id;

    act(() => {
      result.current.updateChapter(chapterId, { content: "  abc  " });
    });

    const updated = result.current.chapters.find((ch) => ch.id === chapterId)!;
    expect(updated.charCount).toBe(3); // "abc".length = 3
  });
});

// ── addChapter ────────────────────────────────────────────────

describe("useDocumentAssembly — addChapter()", () => {
  it("新增章節後長度 +1", () => {
    const { result } = renderHook(() => useDocumentAssembly());
    const before = result.current.chapters.length;

    act(() => {
      result.current.addChapter();
    });

    expect(result.current.chapters).toHaveLength(before + 1);
  });

  it("新章節使用預設標題「新章節」", () => {
    const { result } = renderHook(() => useDocumentAssembly());

    act(() => {
      result.current.addChapter();
    });

    const last = result.current.chapters[result.current.chapters.length - 1];
    expect(last.title).toBe("新章節");
  });

  it("可傳入自訂標題", () => {
    const { result } = renderHook(() => useDocumentAssembly());

    act(() => {
      result.current.addChapter("自訂章節");
    });

    const last = result.current.chapters[result.current.chapters.length - 1];
    expect(last.title).toBe("自訂章節");
  });

  it("新章節的 content 為空，charCount 為 0", () => {
    const { result } = renderHook(() => useDocumentAssembly());

    act(() => {
      result.current.addChapter();
    });

    const last = result.current.chapters[result.current.chapters.length - 1];
    expect(last.content).toBe("");
    expect(last.charCount).toBe(0);
  });
});

// ── removeChapter ─────────────────────────────────────────────

describe("useDocumentAssembly — removeChapter()", () => {
  it("移除指定 id 的章節", () => {
    const { result } = renderHook(() => useDocumentAssembly());
    const targetId = result.current.chapters[0].id;
    const before = result.current.chapters.length;

    act(() => {
      result.current.removeChapter(targetId);
    });

    expect(result.current.chapters).toHaveLength(before - 1);
    expect(result.current.chapters.find((ch) => ch.id === targetId)).toBeUndefined();
  });

  it("移除不存在的 id → chapters 不改變", () => {
    const { result } = renderHook(() => useDocumentAssembly());
    const before = result.current.chapters.length;

    act(() => {
      result.current.removeChapter("non-existent");
    });

    expect(result.current.chapters).toHaveLength(before);
  });
});

// ── moveChapter ───────────────────────────────────────────────

describe("useDocumentAssembly — moveChapter()", () => {
  it("向下移動：第 0 章移到第 1 章位置", () => {
    const { result } = renderHook(() => useDocumentAssembly());
    // 確保至少兩個章節
    if (result.current.chapters.length < 2) {
      act(() => { result.current.addChapter(); });
    }

    const id0 = result.current.chapters[0].id;
    const id1 = result.current.chapters[1].id;

    act(() => {
      result.current.moveChapter(id0, "down");
    });

    expect(result.current.chapters[0].id).toBe(id1);
    expect(result.current.chapters[1].id).toBe(id0);
  });

  it("向上移動：第 1 章移到第 0 章位置", () => {
    const { result } = renderHook(() => useDocumentAssembly());
    if (result.current.chapters.length < 2) {
      act(() => { result.current.addChapter(); });
    }

    const id0 = result.current.chapters[0].id;
    const id1 = result.current.chapters[1].id;

    act(() => {
      result.current.moveChapter(id1, "up");
    });

    expect(result.current.chapters[0].id).toBe(id1);
    expect(result.current.chapters[1].id).toBe(id0);
  });

  it("第一章向上移動 → chapters 不改變", () => {
    const { result } = renderHook(() => useDocumentAssembly());
    const firstId = result.current.chapters[0].id;
    const before = [...result.current.chapters.map((ch) => ch.id)];

    act(() => {
      result.current.moveChapter(firstId, "up");
    });

    expect(result.current.chapters.map((ch) => ch.id)).toEqual(before);
  });

  it("最後一章向下移動 → chapters 不改變", () => {
    const { result } = renderHook(() => useDocumentAssembly());
    const lastIdx = result.current.chapters.length - 1;
    const lastId = result.current.chapters[lastIdx].id;
    const before = [...result.current.chapters.map((ch) => ch.id)];

    act(() => {
      result.current.moveChapter(lastId, "down");
    });

    expect(result.current.chapters.map((ch) => ch.id)).toEqual(before);
  });

  it("移動不存在的 id → chapters 不改變", () => {
    const { result } = renderHook(() => useDocumentAssembly());
    const before = [...result.current.chapters.map((ch) => ch.id)];

    act(() => {
      result.current.moveChapter("non-existent", "down");
    });

    expect(result.current.chapters.map((ch) => ch.id)).toEqual(before);
  });
});

// ── assemble ──────────────────────────────────────────────────

describe("useDocumentAssembly — assemble()", () => {
  it("assemble() 回傳 AssemblyResult 並更新 lastAssembly", () => {
    const { result } = renderHook(() => useDocumentAssembly());

    let assemblyResult: ReturnType<typeof result.current.assemble> | undefined;
    act(() => {
      assemblyResult = result.current.assemble();
    });

    expect(assemblyResult).toBeDefined();
    expect(assemblyResult!.metadata).toBeDefined();
    expect(result.current.lastAssembly).toEqual(assemblyResult);
  });

  it("assemble() 的 metadata.projectName 反映當前 projectName", () => {
    const { result } = renderHook(() => useDocumentAssembly());

    act(() => {
      result.current.setProjectName("台北市某標案");
    });

    let assemblyResult: ReturnType<typeof result.current.assemble> | undefined;
    act(() => {
      assemblyResult = result.current.assemble();
    });

    expect(assemblyResult!.metadata.projectName).toBe("台北市某標案");
  });

  it("assemble() 的 chapterCount 反映當前章節數", () => {
    const { result } = renderHook(() => useDocumentAssembly());

    act(() => {
      result.current.addChapter("額外章節");
    });

    const expectedCount = result.current.chapters.length;
    let assemblyResult: ReturnType<typeof result.current.assemble> | undefined;
    act(() => {
      assemblyResult = result.current.assemble();
    });

    expect(assemblyResult!.metadata.chapterCount).toBe(expectedCount);
  });

  it("填入內容後 assemble() 的 totalChars 正確", () => {
    const { result } = renderHook(() => useDocumentAssembly());
    const chapterId = result.current.chapters[0].id;

    act(() => {
      result.current.updateChapter(chapterId, { content: "測試內容" }); // 4 chars
    });

    let assemblyResult: ReturnType<typeof result.current.assemble> | undefined;
    act(() => {
      assemblyResult = result.current.assemble();
    });

    expect(assemblyResult!.metadata.totalChars).toBeGreaterThanOrEqual(4);
  });

  it("空章節 assemble() 產生 empty_chapter 警告", () => {
    const { result } = renderHook(() => useDocumentAssembly());

    let assemblyResult: ReturnType<typeof result.current.assemble> | undefined;
    act(() => {
      assemblyResult = result.current.assemble();
    });

    // 所有章節內容為空，應有警告
    expect(assemblyResult!.warnings.length).toBeGreaterThan(0);
    expect(assemblyResult!.warnings.some((w) => w.type === "empty_chapter")).toBe(true);
  });
});
