// ====== 案件看板工具函式 ======

import type { NotionPage } from "@/lib/dashboard/types";
import { F } from "@/lib/dashboard/types";
import { STAGES } from "@/data/config/stages";
import { parseDateField } from "@/lib/dashboard/helpers";
import { logger } from "@/lib/logger";
import type {
  CaseStageProgress,
  CaseProgress,
  CalendarEvent,
  BoardFilters,
} from "./types";

/** localStorage key */
const CASE_PROGRESS_KEY = "bidding-assistant-case-progress";

// ====== 階段進度 ======

/** 取得預設階段進度（8 個階段全部 not-started） */
export function getDefaultStageProgress(): CaseStageProgress[] {
  return STAGES.map((s) => ({
    stageId: s.id,
    status: "not-started" as const,
  }));
}

/** 從 localStorage 載入所有案件進度 */
export function loadCaseProgress(): Record<string, CaseProgress> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(CASE_PROGRESS_KEY);
    if (!raw) {
      logger.debug("cache", "案件進度資料不存在", undefined, "case-board/helpers.ts");
      return {};
    }
    const data = JSON.parse(raw);
    logger.debug(
      "cache",
      "載入案件進度",
      `${Object.keys(data).length} 筆`,
      "case-board/helpers.ts",
    );
    return data;
  } catch {
    logger.warn("cache", "案件進度資料解析失敗", undefined, "case-board/helpers.ts");
    return {};
  }
}

/** 儲存特定案件的進度 */
export function saveCaseProgress(pageId: string, progress: CaseProgress): void {
  if (typeof window === "undefined") return;
  try {
    const all = loadCaseProgress();
    all[pageId] = progress;
    localStorage.setItem(CASE_PROGRESS_KEY, JSON.stringify(all));
    logger.debug("cache", "儲存案件進度", pageId, "case-board/helpers.ts");
  } catch {
    logger.error("cache", "案件進度儲存失敗", pageId, "case-board/helpers.ts");
  }
}

/** 取得特定案件的進度（不存在則建立預設值） */
export function getCaseProgress(pageId: string): CaseProgress {
  const all = loadCaseProgress();
  if (all[pageId]) return all[pageId];
  return {
    notionPageId: pageId,
    stages: getDefaultStageProgress(),
    lastUpdated: new Date().toISOString(),
  };
}

// ====== 進度計算 ======

/** 計算整體進度百分比（已完成階段 / 總階段數） */
export function calculateProgress(stages: CaseStageProgress[]): number {
  if (stages.length === 0) return 0;
  const completed = stages.filter((s) => s.status === "completed").length;
  return Math.round((completed / stages.length) * 100);
}

// ====== 行事曆轉換 ======

/** 將 NotionPage 陣列轉為 CalendarEvent 陣列 */
export function pagesToCalendarEvents(pages: NotionPage[]): CalendarEvent[] {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const todayMs = now.getTime();

  return pages
    .filter((p) => {
      const ts = parseDateField(p.properties[F.截標]);
      return ts > 0;
    })
    .map((p) => {
      const deadlineTs = parseDateField(p.properties[F.截標]);
      const deadlineDate = new Date(deadlineTs);
      const diffMs = deadlineTs - todayMs;
      const daysLeft = Math.ceil(diffMs / 86400000);

      return {
        id: p.id,
        title: (p.properties[F.名稱] as string) ?? "",
        date: deadlineDate.toISOString().split("T")[0],
        status: (p.properties[F.進程] as string) ?? "",
        priority: (p.properties[F.投遞序位] as string) ?? undefined,
        budget: (p.properties[F.預算] as number) ?? undefined,
        agency: (p.properties[F.招標機關] as string) ?? undefined,
        daysLeft: daysLeft,
      };
    });
}

/** 依月份分組行事曆事件（key: YYYY-MM） */
export function groupEventsByMonth(
  events: CalendarEvent[],
): Record<string, CalendarEvent[]> {
  const grouped: Record<string, CalendarEvent[]> = {};
  for (const event of events) {
    // date format: YYYY-MM-DD
    const monthKey = event.date.slice(0, 7); // YYYY-MM
    if (!grouped[monthKey]) grouped[monthKey] = [];
    grouped[monthKey].push(event);
  }
  return grouped;
}

/** 依日期分組行事曆事件（key: YYYY-MM-DD） */
export function groupEventsByDate(
  events: CalendarEvent[],
): Record<string, CalendarEvent[]> {
  const grouped: Record<string, CalendarEvent[]> = {};
  for (const event of events) {
    const dateKey = event.date; // YYYY-MM-DD
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(event);
  }
  return grouped;
}

// ====== 篩選 ======

/** 套用看板篩選條件至 NotionPage 陣列 */
export function applyBoardFilters(
  pages: NotionPage[],
  filters: BoardFilters,
): NotionPage[] {
  let result = pages;

  // 依進程篩選
  if (filters.status && filters.status.length > 0) {
    const statusSet = new Set(filters.status);
    result = result.filter((p) => {
      const status = (p.properties[F.進程] as string) ?? "";
      return statusSet.has(status);
    });
  }

  // 依投遞序位篩選
  if (filters.priority && filters.priority.length > 0) {
    const prioritySet = new Set(filters.priority);
    result = result.filter((p) => {
      const priority = (p.properties[F.投遞序位] as string) ?? "";
      return prioritySet.has(priority);
    });
  }

  // 依截標期限篩選
  if (filters.deadline && filters.deadline !== "all") {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const todayMs = now.getTime();

    let maxDays: number;
    switch (filters.deadline) {
      case "week":
        maxDays = 7;
        break;
      case "2weeks":
        maxDays = 14;
        break;
      case "month":
        maxDays = 30;
        break;
    }

    const maxMs = todayMs + maxDays * 86400000;

    result = result.filter((p) => {
      const ts = parseDateField(p.properties[F.截標]);
      if (!ts) return false;
      return ts >= todayMs && ts <= maxMs;
    });
  }

  // 依企劃主筆篩選
  if (filters.writer) {
    const writerLower = filters.writer.toLowerCase();
    result = result.filter((p) => {
      const writer = (p.properties[F.企劃主筆] as string) ?? "";
      return writer.toLowerCase().includes(writerLower);
    });
  }

  // 關鍵字搜尋（搜尋名稱 + 招標機關）
  if (filters.search) {
    const keyword = filters.search.toLowerCase();
    result = result.filter((p) => {
      const name = ((p.properties[F.名稱] as string) ?? "").toLowerCase();
      const agency = ((p.properties[F.招標機關] as string) ?? "").toLowerCase();
      return name.includes(keyword) || agency.includes(keyword);
    });
  }

  return result;
}

// ====== 期限急迫度 ======

/** 依剩餘天數判斷急迫等級 */
export function getDeadlineUrgency(
  daysLeft: number | null,
): "expired" | "critical" | "warning" | "normal" | "unknown" {
  if (daysLeft === null) return "unknown";
  if (daysLeft <= 0) return "expired";
  if (daysLeft <= 3) return "critical";
  if (daysLeft <= 7) return "warning";
  return "normal";
}

/** 取得急迫度對應的 Tailwind 色彩 class */
export function getUrgencyColor(
  urgency: ReturnType<typeof getDeadlineUrgency>,
): string {
  const map: Record<ReturnType<typeof getDeadlineUrgency>, string> = {
    expired: "bg-red-100 text-red-800 border-red-300",
    critical: "bg-red-50 text-red-700 border-red-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    normal: "bg-green-50 text-green-700 border-green-200",
    unknown: "bg-gray-50 text-gray-500 border-gray-200",
  };
  return map[urgency];
}
