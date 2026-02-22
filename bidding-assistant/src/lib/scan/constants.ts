// ====== 巡標自動化：常數定義 ======
// 關鍵字清單來源：Jin 0222 定義（stash-product-direction-0222.md）

import type { KeywordRule } from "./types";

/** Jin 定義的四類關鍵字規則（代理人簡化版） */
export const DEFAULT_KEYWORD_RULES: KeywordRule[] = [
  // ── 絕對可以 ──
  {
    category: "must",
    keywords: ["食農教育"],
    label: "食農教育",
  },
  {
    category: "must",
    keywords: ["藝術"],
    label: "藝術",
  },
  {
    category: "must",
    keywords: ["服務採購"],
    label: "服務採購",
  },
  {
    category: "must",
    keywords: ["影片製作", "影片拍攝", "影音製作"],
    label: "影片製作",
  },
  {
    category: "must",
    keywords: ["行銷計畫", "行銷推廣", "行銷企劃"],
    label: "行銷計畫",
  },
  {
    category: "must",
    keywords: ["春聯"],
    label: "春聯",
  },
  {
    category: "must",
    keywords: [],
    budgetMax: 1_000_000,
    label: "100萬以下",
  },

  // ── 需要讀細節 ──
  {
    category: "review",
    keywords: ["主燈設計", "主燈"],
    label: "主燈設計",
  },
  {
    category: "review",
    keywords: ["燈節", "燈會", "燈祭"],
    label: "燈節",
  },
  {
    category: "review",
    keywords: ["藝術節", "文化節", "音樂節", "電影節"],
    label: "各種節慶",
  },
  {
    category: "review",
    keywords: ["舞台"],
    label: "舞台",
  },
  {
    category: "review",
    keywords: ["布置", "佈置"],
    label: "布置",
  },
  {
    category: "review",
    keywords: ["晚會", "演唱會", "音樂會"],
    label: "晚會演唱會",
  },

  // ── 先不要 ──
  {
    category: "exclude",
    keywords: ["課後服務", "課後照顧", "課後輔導"],
    label: "課後服務",
  },
];

/** PCC 搜尋用的預設關鍵字（用來抓公告，不同於篩選用的分類關鍵字） */
export const DEFAULT_SEARCH_KEYWORDS: string[] = [
  "食農教育",
  "藝術",
  "服務採購",
  "影片製作",
  "行銷",
  "春聯",
  "燈節",
  "藝術節",
  "舞台",
  "晚會",
  "策展",
  "活動企劃",
  "文化",
];
