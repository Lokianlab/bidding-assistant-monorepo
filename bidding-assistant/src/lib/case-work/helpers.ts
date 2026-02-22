// ====== 案件工作頁工具函式 ======

import { loadCache } from "@/lib/dashboard/helpers";
import type { NotionPage } from "@/lib/dashboard/types";

/** 從 localStorage 快取中用 page ID 載入單一案件 */
export function loadCaseById(pageId: string): NotionPage | null {
  if (typeof window === "undefined") return null;
  const cached = loadCache();
  if (!cached || !cached.pages) return null;
  return cached.pages.find((p) => p.id === pageId) ?? null;
}
