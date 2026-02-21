// ====== 知識庫常數定義 ======

import type { KBCategoryDef, KBEntryStatus, KnowledgeBaseData } from "./types";

/** localStorage key */
export const KB_STORAGE_KEY = "bidding-assistant-knowledge-base";

/** 資料版本（用於未來遷移） */
export const KB_DATA_VERSION = 1;

/** 五大知識庫定義 */
export const KB_CATEGORIES: KBCategoryDef[] = [
  {
    id: "00A",
    label: "團隊資料庫",
    icon: "👥",
    description: "團隊成員資料、學歷、證照、經歷",
    idPrefix: "M-",
    idFormat: "M-001",
  },
  {
    id: "00B",
    label: "實績資料庫",
    icon: "🏆",
    description: "公司專案實績、工作內容、成果數據",
    idPrefix: "P-",
    idFormat: "P-2025-001",
  },
  {
    id: "00C",
    label: "時程範本庫",
    icon: "📅",
    description: "標準專案時程範本、階段分工",
    idPrefix: "T-",
    idFormat: "T-EXH",
  },
  {
    id: "00D",
    label: "應變SOP庫",
    icon: "🛡️",
    description: "風險應變標準作業程序",
    idPrefix: "R-",
    idFormat: "R-MED",
  },
  {
    id: "00E",
    label: "案後檢討庫",
    icon: "📝",
    description: "案件結案檢討與經驗回饋",
    idPrefix: "REV-",
    idFormat: "REV-001",
  },
];

/** 知識庫定義 Map（方便取用） */
export const KB_CATEGORY_MAP = Object.fromEntries(
  KB_CATEGORIES.map((c) => [c.id, c])
) as Record<string, KBCategoryDef>;

/** 空白知識庫資料 */
export const EMPTY_KB_DATA: KnowledgeBaseData = {
  "00A": [],
  "00B": [],
  "00C": [],
  "00D": [],
  "00E": [],
  lastUpdated: new Date().toISOString(),
  version: KB_DATA_VERSION,
};

/** Entry 狀態中文標籤（SSOT：page.tsx 從這裡讀） */
export const ENTRY_STATUS_LABELS: Record<KBEntryStatus, string> = {
  active: "啟用",
  draft: "草稿",
  archived: "封存",
};
