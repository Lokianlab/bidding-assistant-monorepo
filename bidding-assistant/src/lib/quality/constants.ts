/** 內建品質檢查規則名稱（SSOT：rules.ts 和 page.tsx 都從這裡引用） */
export const RULE_NAMES = {
  BLACKLIST: "禁用詞",
  TERMINOLOGY: "用語修正",
  CUSTOM: "自訂規則",
  CROSS_VALIDATE_NUMBERS: "數字交叉驗證",
  DATE_CONSISTENCY: "日期一致性",
  BUDGET_CONSISTENCY: "預算一致性",
  TEAM_CONSISTENCY: "人力一致性",
  SCOPE_CONSISTENCY: "範圍一致性",
  COMPANY_NAME: "公司名稱",
  PARAGRAPH_LENGTH: "段落長度",
  SENTENCE_LENGTH: "句子過長",
  DUPLICATE: "重複內容",
  RISKY_PROMISE: "承諾風險",
  MISSING_PERFORMANCE_RECORD: "履約實績缺失",
  VAGUE_QUANTIFIERS: "模糊量化",
} as const;

/** 鐵律 flag key → 顯示標籤（SSOT：page.tsx 的鐵律清單從這裡讀） */
export const IRON_LAW_LABELS: Record<string, string> = {
  crossValidateNumbers: RULE_NAMES.CROSS_VALIDATE_NUMBERS,
  budgetConsistency: RULE_NAMES.BUDGET_CONSISTENCY,
  dateConsistency: RULE_NAMES.DATE_CONSISTENCY,
  teamConsistency: RULE_NAMES.TEAM_CONSISTENCY,
  scopeConsistency: RULE_NAMES.SCOPE_CONSISTENCY,
};
