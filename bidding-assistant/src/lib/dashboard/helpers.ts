// ====== 儀表板工具函式 ======

import type { NotionPage } from "./types";
import { F, ACTIVE_STATUSES, REVIEW_STATUSES } from "./types";
import type { SortKey, SortDir } from "./types";
import { logger } from "@/lib/logger";

// ====== 日期解析 ======

/** 安全解析日期欄位（支援 formula date 物件） */
export function parseDateField(d: unknown): number {
  if (!d) return 0;
  let raw: string;
  if (typeof d === "object" && d !== null && "start" in d) {
    raw = (d as { start: string }).start;
  } else if (typeof d === "string") {
    raw = d;
  } else {
    return 0;
  }
  const ts = new Date(raw).getTime();
  return isNaN(ts) ? 0 : ts;
}

/**
 * 計算備標期限（前端重現 Notion 公式）
 * 電子投標 → 截標前 1 天
 * 否則依星期幾：一→-3, 二→-4, 日→-3, 其他→-2
 * + 如果是三/四/五 且 時間 < 15:00 → 再 -1
 */
export function calcPrepDeadline(deadlineRaw: unknown, isElectronic: unknown): number {
  const dlTs = parseDateField(deadlineRaw);
  if (!dlTs) return 0;

  const dt = new Date(dlTs);

  if (isElectronic === true) {
    return dlTs - 1 * 86400000;
  }

  const dayOfWeek = dt.getDay();
  let subtractDays: number;
  switch (dayOfWeek) {
    case 1: subtractDays = 3; break;
    case 2: subtractDays = 4; break;
    case 0: subtractDays = 3; break;
    default: subtractDays = 2;
  }

  if ((dayOfWeek === 3 || dayOfWeek === 4 || dayOfWeek === 5) && dt.getHours() < 15) {
    subtractDays += 1;
  }

  return dlTs - subtractDays * 86400000;
}

/** 計算剩餘天數 */
export function daysLeft(
  bidDeadline: unknown,
  isElectronic: unknown
): number | "應交寄" | null {
  const bidTs = parseDateField(bidDeadline);
  if (!bidTs) return null;

  const prepTs = calcPrepDeadline(bidDeadline, isElectronic);

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const todayMs = now.getTime();

  if (prepTs && prepTs >= todayMs) {
    return Math.ceil((prepTs - todayMs) / 86400000);
  }

  if (bidTs >= todayMs) {
    return "應交寄";
  }

  return null;
}

// ====== 格式化 ======

export const fmt = (n: number) => n?.toLocaleString("zh-TW") ?? "-";

export const fmtDate = (d: string | null) => {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleDateString("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return d;
  }
};

export const fmtDateTime = (d: unknown) => {
  if (!d) return "-";
  let raw: string;
  if (typeof d === "object" && d !== null && "start" in d) {
    raw = (d as { start: string }).start;
  } else if (typeof d === "string") {
    raw = d;
  } else {
    return "-";
  }
  try {
    const dt = new Date(raw);
    if (isNaN(dt.getTime())) return "-";
    const datePart = dt.toLocaleDateString("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const h = dt.getHours();
    const m = dt.getMinutes();
    if (h === 0 && m === 0) return datePart;
    return `${datePart} ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  } catch {
    return String(raw);
  }
};

// ====== 前端過濾 ======

export function filterPages(raw: NotionPage[]): NotionPage[] {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const todayMs = now.getTime();
  return raw.filter((p) => {
    // 確定協作 的篩選已移至 Notion API 層（看板篩選設定）
    const deadlineTs = parseDateField(p.properties[F.截標]);
    if (!deadlineTs || deadlineTs >= todayMs) return true;
    const status = p.properties[F.進程] ?? "";
    return ACTIVE_STATUSES.has(status);
  });
}

/** 績效檢視中心用：只保留 REVIEW_STATUSES 的案件（不限定確定協作） */
export function filterReviewPages(raw: NotionPage[]): NotionPage[] {
  return raw.filter((p) => {
    const status = p.properties[F.進程] ?? "";
    return REVIEW_STATUSES.has(status);
  });
}

/** 從截標時間擷取所有出現過的年份（降冪） */
export function extractAvailableYears(pages: NotionPage[]): number[] {
  const years = new Set<number>();
  for (const p of pages) {
    const ts = parseDateField(p.properties[F.截標]);
    if (!ts) continue;
    years.add(new Date(ts).getFullYear());
  }
  return Array.from(years).sort((a, b) => b - a);
}

/** 按年份過濾案件（year=0 代表全部） */
export function filterByYear(pages: NotionPage[], year: number): NotionPage[] {
  if (year === 0) return pages;
  return pages.filter((p) => {
    const ts = parseDateField(p.properties[F.截標]);
    if (!ts) return false;
    return new Date(ts).getFullYear() === year;
  });
}

// ====== 排序 ======

export function getSortValue(page: NotionPage, key: SortKey): string | number {
  const p = page.properties;
  switch (key) {
    case "唯一碼": {
      const raw = p[F.唯一碼] ?? "";
      const m = String(raw).match(/(\d+)/);
      return m ? Number(m[1]) : 0;
    }
    case "名稱":
      return p[F.名稱] ?? "";
    case "截標":
      return parseDateField(p[F.截標]);
    case "剩餘": {
      const bidTs = parseDateField(p[F.截標]);
      if (!bidTs) return 99999;
      const prepTs = calcPrepDeadline(p[F.截標], p[F.電子投標]);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const todayMs = now.getTime();
      if (prepTs && prepTs >= todayMs) {
        return Math.ceil((prepTs - todayMs) / 86400000);
      }
      if (bidTs >= todayMs) {
        return -1;
      }
      return 99999;
    }
    case "預算":
      return p[F.預算] ?? 0;
    case "押標金":
      return p[F.押標金] ?? 0;
    case "招標機關":
      return p[F.招標機關] ?? "";
    case "投遞序位":
      return p[F.投遞序位] ?? "";
    case "評審方式":
      return p[F.評審方式] ?? "";
    default:
      return "";
  }
}

export function sortPages(
  items: NotionPage[],
  key: SortKey | null,
  dir: SortDir
): NotionPage[] {
  if (!key) return items;
  return [...items].sort((a, b) => {
    const va = getSortValue(a, key);
    const vb = getSortValue(b, key);
    let cmp: number;
    if (typeof va === "number" && typeof vb === "number") {
      cmp = va - vb;
    } else {
      cmp = String(va).localeCompare(String(vb), "zh-TW");
    }
    return dir === "asc" ? cmp : -cmp;
  });
}

// ====== localStorage 快取 ======

const CACHE_KEY = "bidding-all-cache-v2";

export interface CacheData {
  schema: Record<string, { type: string; options?: string[]; id?: string }>;
  pages: NotionPage[];
  ts: number;
}

export function loadCache(): CacheData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) {
      logger.debug("cache", "快取不存在", undefined, "helpers.ts");
      return null;
    }
    const data = JSON.parse(raw);
    logger.debug("cache", "載入快取", `${data.pages?.length ?? 0} 筆，時間 ${new Date(data.ts).toLocaleString("zh-TW")}`, "helpers.ts");
    return data;
  } catch {
    logger.warn("cache", "快取解析失敗", undefined, "helpers.ts");
    return null;
  }
}

export function saveCache(
  schema: CacheData["schema"],
  pages: NotionPage[]
) {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ schema, pages, ts: Date.now() })
    );
    logger.debug("cache", "儲存快取", `${pages.length} 筆`, "helpers.ts");
  } catch {
    logger.error("cache", "快取儲存失敗", undefined, "helpers.ts");
  }
}

// ====== 績效頁獨立快取（支援漸進式載入斷點續傳） ======

const PERF_CACHE_KEY = "bidding-perf-cache-v2";

export interface PerfCacheData {
  schema: Record<string, { type: string; options?: string[]; id?: string }>;
  pages: NotionPage[];
  ts: number;
  /** 是否已載入全部資料（false 表示還有更多） */
  complete: boolean;
  /** 如果未完成，下次可從這個 cursor 接續 */
  nextCursor?: string | null;
  /** 已解析的 Notion property IDs（供 continue_query 使用 filter_properties） */
  propIds?: string[];
}

export function loadPerfCache(): PerfCacheData | null {
  try {
    const raw = localStorage.getItem(PERF_CACHE_KEY);
    if (!raw) {
      logger.debug("cache", "績效快取不存在", undefined, "helpers.ts");
      return null;
    }
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object" || !Array.isArray(data.pages)) {
      logger.debug("cache", "績效快取格式無效，清除", undefined, "helpers.ts");
      localStorage.removeItem(PERF_CACHE_KEY);
      return null;
    }
    // 相容舊格式（沒有 complete 欄位的視為完成）
    if (data.complete === undefined) data.complete = true;
    logger.debug("cache", "載入績效快取", `${data.pages?.length ?? 0} 筆，完成=${data.complete}`, "helpers.ts");
    return data;
  } catch {
    logger.warn("cache", "績效快取解析失敗", undefined, "helpers.ts");
    return null;
  }
}

/** 儲存績效快取（可標記是否完成以及斷點 cursor） */
export function savePerfCache(
  schema: PerfCacheData["schema"],
  pages: NotionPage[],
  complete = true,
  nextCursor?: string | null,
  propIds?: string[],
) {
  try {
    const data: PerfCacheData = {
      schema, pages, ts: Date.now(), complete, nextCursor, propIds,
    };
    localStorage.setItem(PERF_CACHE_KEY, JSON.stringify(data));
  } catch {}
}
