export type KBRequirement = "required" | "optional" | "none";

export const KB_MATRIX: Record<string, Record<string, KBRequirement>> = {
  L1: { "00A": "optional", "00B": "required", "00C": "none", "00D": "none", "00E": "optional" },
  L2: { "00A": "optional", "00B": "optional", "00C": "none", "00D": "none", "00E": "optional" },
  L3: { "00A": "none",     "00B": "none",     "00C": "required", "00D": "required", "00E": "none" },
  L4: { "00A": "required", "00B": "required", "00C": "required", "00D": "required", "00E": "none" },
  L5: { "00A": "none",     "00B": "optional", "00C": "none", "00D": "none", "00E": "none" },
  L6: { "00A": "none",     "00B": "none",     "00C": "none", "00D": "none", "00E": "none" },
  L7: { "00A": "optional", "00B": "none",     "00C": "none", "00D": "none", "00E": "none" },
  L8: { "00A": "none",     "00B": "none",     "00C": "none", "00D": "none", "00E": "none" },
};

export const WRITING_RULES_STAGES = ["L3", "L4"];

export const KB_LABELS: Record<string, string> = {
  "00A": "團隊資料庫",
  "00B": "實績資料庫",
  "00C": "時程範本庫",
  "00D": "應變SOP庫",
  "00E": "案後檢討庫",
};
