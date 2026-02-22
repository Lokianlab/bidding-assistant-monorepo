import { DOCUMENT_TEMPLATES, DEFAULT_TEMPLATE_ID } from "@/data/config/document-templates";
import type { DocumentTemplate, WorkbenchChapter } from "./types";

// ── 內建範本讀取 ──────────────────────────────────────────────

export function getBuiltinTemplates(): DocumentTemplate[] {
  return DOCUMENT_TEMPLATES;
}

export function getTemplateById(
  id: string,
  customTemplates: DocumentTemplate[] = []
): DocumentTemplate | undefined {
  return (
    customTemplates.find((t) => t.id === id) ??
    DOCUMENT_TEMPLATES.find((t) => t.id === id)
  );
}

export function getDefaultTemplate(): DocumentTemplate {
  return DOCUMENT_TEMPLATES.find((t) => t.id === DEFAULT_TEMPLATE_ID)!;
}

// ── 範本 → 初始工作台章節 ─────────────────────────────────────

let _idCounter = 0;
function generateId(): string {
  return `ch-${Date.now()}-${_idCounter++}`;
}

export function templateToChapters(template: DocumentTemplate): WorkbenchChapter[] {
  return template.chapters.map((tc) => ({
    id: generateId(),
    title: tc.defaultTitle,
    content: "",
    charCount: 0,
    kbRefs: [],
  }));
}

/** 新增空白章節 */
export function createEmptyChapter(title: string = "新章節"): WorkbenchChapter {
  return {
    id: generateId(),
    title,
    content: "",
    charCount: 0,
    kbRefs: [],
  };
}
