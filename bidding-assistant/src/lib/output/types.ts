import type { DocumentSettings, OutputSettings, RecentExport } from "@/lib/settings/types";
export type { OutputSettings, RecentExport };

// ── 文件組裝管線型別 ──────────────────────────────────────────

export interface ChapterSource {
  title: string;
  content: string;
  sourceStage?: string; // 來源階段（L3/L4/manual）
  kbRefs?: string[];    // 引用的知識庫 ID（00A/00B/...）
}

export interface AssemblySource {
  type: "manual" | "file";
  chapters: ChapterSource[];
}

export type AssemblyWarningType =
  | "empty_chapter"
  | "missing_kb_ref"
  | "long_chapter"
  | "duplicate_content";

export interface AssemblyWarning {
  type: AssemblyWarningType;
  chapter: number;
  message: string;
}

export interface AssemblyMetadata {
  projectName: string;
  totalChars: number;
  chapterCount: number;
  kbRefsUsed: string[];
  assembledAt: string; // ISO timestamp
}

export interface AssemblyResult {
  chapters: ChapterInput[];
  metadata: AssemblyMetadata;
  warnings: AssemblyWarning[];
}

// ChapterInput 是 docgen 的格式（從 generate-docx.ts 重新匯出）
export interface ChapterInput {
  title: string;
  content: string;
}

// ── 範本系統型別 ──────────────────────────────────────────────

export interface TemplateChapter {
  defaultTitle: string;    // 預設標題（如「第壹章 專案理解與服務理念」）
  required: boolean;       // 是否必填
  suggestedLength: string; // 建議字數（如「2000-3000」）
  kbSuggestions: string[]; // 建議引用的知識庫（如 ["00B", "00D"]）
  guideText: string;       // 撰寫指引（顯示在 UI 的提示文字）
}

export interface TemplateVariable {
  key: string;                       // 如 "projectName", "companyName"
  label: string;                     // 中文標籤
  source: "settings" | "manual";     // 從設定自動帶入 or 用戶填
  defaultValue?: string;
}

export interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  chapters: TemplateChapter[];
  defaultSettings?: Partial<DocumentSettings>;
  variables: TemplateVariable[];
}

// ── 匯出選項型別 ──────────────────────────────────────────────

export type ExportFormat = "docx" | "markdown" | "print";

export interface ExportOptions {
  format: ExportFormat;
  template: string;       // 範本 ID
  chapters: ChapterInput[];
  documentSettings: DocumentSettings;
  projectName: string;
  companyName: string;
  coverPage?: boolean;
  tableOfContents?: boolean;
}

export type ExportResult =
  | { format: "docx"; blob: Blob; filename: string }
  | { format: "markdown"; text: string; filename: string }
  | { format: "print"; html: string };

// ── KB 佔位符型別（Phase 2）────────────────────────────────────

import type { KBId } from "@/lib/knowledge-base/types";

export type KBPlaceholderType = "kb" | "brand" | "project" | "date";

export interface KBPlaceholder {
  raw: string;                // 原始佔位符文字，如 {{kb:00A:PM}}
  type: KBPlaceholderType;
  category?: KBId;            // 知識庫類別（type="kb" 時有效）
  selector: string;           // 篩選條件（角色、關鍵字等）
  limit?: number;             // 數量限制（如 {{kb:00B:recent:3}} 中的 3）
}

export interface KBValidationResult {
  valid: boolean;
  unresolved: KBPlaceholder[]; // 找不到對應資料的佔位符
}

export interface BrandVars {
  companyName?: string;
  companyTaxId?: string;
  projectName?: string;
}

// ── 文件工作台狀態 ────────────────────────────────────────────

export interface WorkbenchChapter extends ChapterSource {
  id: string;           // 唯一 ID（UI 使用）
  charCount: number;    // 即時字數
}

export interface WorkbenchState {
  templateId: string;
  projectName: string;
  chapters: WorkbenchChapter[];
}
