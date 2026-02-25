// ====== 情報模組常數定義 ======

import type { WinCheckId, WinCheck, RFPSummaryData } from "./types";

// ====== 得標檢查項目中文標籤 ======

export const WIN_CHECK_LABELS: Record<WinCheckId, string> = {
  consecutive_winner: "連續得標廠商",
  committee_known: "評委名單已知",
  committee_structure: "評委結構分析",
  competitor_track: "競爭對手追蹤",
  strategic_value: "策略價值評估",
};

// ====== 得標檢查項目說明 ======

export const WIN_CHECK_DESCRIPTIONS: Record<WinCheckId, string> = {
  consecutive_winner:
    "檢查是否有廠商連續多年在此機關得標，若有則可能存在特定關係，需謹慎評估。",
  committee_known:
    "確認此機關過去的評選委員名單是否可查，有助於準備簡報方向與內容深度。",
  committee_structure:
    "分析評委組成（機關代表 vs 外聘學者專家比例），判斷評選偏好與風格。",
  competitor_track:
    "追蹤主要競爭對手在相關領域的得標記錄與優勢，了解我方的相對位置。",
  strategic_value:
    "評估此案對公司的策略意義（新領域拓展、客戶關係深化、口碑累積等）。",
};

// ====== 情報快取有效期（天數） ======

export const INTEL_CACHE_TTL = {
  /** PCC 政府標案資料，每週更新 */
  pcc: 7,
  /** Perplexity 搜尋結果，一個月內有效 */
  perplexity: 30,
  /** RFP 解析結果，幾乎不變 */
  rfp: 365,
} as const;

// ====== 決標方式中文對照 ======

export const AWARD_METHOD_LABELS: Record<RFPSummaryData["award_method"], string> = {
  most_advantageous_eval: "最有利標（評選）",
  most_advantageous_review: "最有利標（審查）",
  lowest_price: "最低價標",
};

// ====== 預設的五項得標檢查 ======

export const DEFAULT_WIN_CHECKS: WinCheck[] = [
  {
    id: "consecutive_winner",
    label: WIN_CHECK_LABELS.consecutive_winner,
    status: "unknown",
    evidence: "",
    source: "",
    auto_filled: false,
  },
  {
    id: "committee_known",
    label: WIN_CHECK_LABELS.committee_known,
    status: "unknown",
    evidence: "",
    source: "",
    auto_filled: false,
  },
  {
    id: "committee_structure",
    label: WIN_CHECK_LABELS.committee_structure,
    status: "unknown",
    evidence: "",
    source: "",
    auto_filled: false,
  },
  {
    id: "competitor_track",
    label: WIN_CHECK_LABELS.competitor_track,
    status: "unknown",
    evidence: "",
    source: "",
    auto_filled: false,
  },
  {
    id: "strategic_value",
    label: WIN_CHECK_LABELS.strategic_value,
    status: "unknown",
    evidence: "",
    source: "",
    auto_filled: false,
  },
];
