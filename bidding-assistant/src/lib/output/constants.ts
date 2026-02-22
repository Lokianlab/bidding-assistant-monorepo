// ── 範本 ID ───────────────────────────────────────────────────

export const TEMPLATE_IDS = {
  PROPOSAL_STANDARD: "proposal-standard",
  PROPOSAL_SIMPLIFIED: "proposal-simplified",
  PLAN_BRIEF: "plan-brief",
  CUSTOM: "custom",
} as const;

export type TemplateId = (typeof TEMPLATE_IDS)[keyof typeof TEMPLATE_IDS];

// ── 字數門檻 ──────────────────────────────────────────────────

/** 章節字數少於此值視為「字數偏少」警告 */
export const CHAPTER_MIN_CHARS = 200;

/** 章節字數超過此值視為「章節過長」警告 */
export const CHAPTER_MAX_CHARS = 8000;

/** 最多保留最近幾筆匯出記錄 */
export const MAX_RECENT_EXPORTS = 10;

// ── 重複內容偵測 ──────────────────────────────────────────────

/** 兩章節之間重疊段落超過此比例視為「重複內容」警告 */
export const DUPLICATE_CONTENT_THRESHOLD = 0.6;

/** 用於比較的最小段落長度（短於此值不納入重複偵測） */
export const MIN_PARAGRAPH_LENGTH_FOR_DEDUP = 50;
