// ====== 案件看板類型定義 ======

/** 階段狀態 */
export type StageStatus = "not-started" | "in-progress" | "completed" | "skipped";

/** 單一階段進度追蹤 (L1-L8) */
export interface CaseStageProgress {
  stageId: string;      // L1-L8
  status: StageStatus;
  startedAt?: string;   // ISO date
  completedAt?: string; // ISO date
  notes?: string;
}

/** 案件整體進度（含 Notion 頁面 ID + 八階段追蹤） */
export interface CaseProgress {
  /** Notion 頁面 ID */
  notionPageId: string;
  /** L1-L8 各階段進度 */
  stages: CaseStageProgress[];
  /** 最後更新時間 (ISO date) */
  lastUpdated: string;
}

/** 看板檢視模式 */
export type BoardViewMode = "kanban" | "list" | "calendar";

/** 看板篩選條件 */
export interface BoardFilters {
  status?: string[];     // 依進程篩選
  priority?: string[];   // 依投遞序位篩選
  deadline?: "week" | "2weeks" | "month" | "all";
  writer?: string;       // 依企劃主筆篩選
  search?: string;       // 關鍵字搜尋
}

/** 行事曆事件（截標期限檢視用） */
export interface CalendarEvent {
  id: string;
  title: string;
  date: string;         // ISO date
  status: string;
  priority?: string;
  budget?: number;
  agency?: string;
  daysLeft: number | null;
}
