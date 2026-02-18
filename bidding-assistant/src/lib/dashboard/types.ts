// ====== 儀表板共用類型與常數 ======
// 狀態分組、顏色等統一從 bid-status.ts 匯入
// 欄位對照表統一從 field-mapping.ts 匯入

import { DEFAULT_FIELD_MAP } from "@/lib/constants/field-mapping";

export interface NotionPage {
  id: string;
  url: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  properties: Record<string, any>;
}

// Notion 欄位名稱對照（向後相容：F 維持原有用法）
// 未來會改為動態版本，但目前所有現有程式碼仍可正常運作
export const F = DEFAULT_FIELD_MAP;

// 排序
export type SortKey =
  | "唯一碼" | "名稱" | "截標" | "剩餘"
  | "預算" | "招標機關" | "投遞序位" | "評審方式"
  | "押標金";
export type SortDir = "asc" | "desc";

// ====== 從 bid-status.ts re-export（向後相容） ======

export {
  ACTIVE_STATUSES,
  SUBMITTED_STATUSES,
  PROCURED_STATUSES,
  REVIEW_STATUSES,
  CONCLUDED_STATUSES,
  SUNK_STATUSES,
  BOARD_COLUMNS_ORDER,
  PERFORMANCE_STATUS_COLUMNS,
  buildStatusFilter,
} from "@/lib/constants/bid-status";

export {
  STATUS_COLORS_TW as DEFAULT_STATUS_COLORS,
  PRIORITY_COLORS_TW as DEFAULT_PRIORITY_COLORS,
  AUTO_COLORS_TW as AUTO_COLORS,
  buildColorMap,
} from "@/lib/constants/bid-status";
