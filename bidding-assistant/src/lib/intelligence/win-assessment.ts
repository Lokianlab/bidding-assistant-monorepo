// ====== 得標評估模組 ======
// 五項紅綠燈檢查：前三項從 PCC 資料自動填入，後兩項需手動確認。

import { WIN_CHECK_LABELS } from "./constants";
import { overallAssessment, generateRecommendation } from "./helpers";
import type {
  AgencyHistoryData,
  CompetitorData,
  WinCheck,
  WinCheckId,
  TrafficLight,
  WinAssessmentData,
} from "./types";

// ====== 主要 API ======

/**
 * 初始化得標評估：自動填入 check 1-3（來自 PCC），mark 4-5 為 unknown。
 */
export function initWinAssessment(
  agencyHistory: AgencyHistoryData,
  competitors: CompetitorData,
): WinAssessmentData {
  const checks: WinCheck[] = [
    assessConsecutiveWinner(agencyHistory),
    assessCommitteeKnown(agencyHistory),
    assessCommitteeStructure(agencyHistory),
    assessCompetitorTrack(competitors),
    {
      id: "strategic_value",
      label: WIN_CHECK_LABELS.strategic_value,
      status: "unknown",
      evidence: "需要由使用者根據公司策略方向手動評估。",
      source: "manual",
      auto_filled: false,
    },
  ];

  const overall = overallAssessment(checks);
  const recommendation = generateRecommendation(checks, overall);

  return { checks, overall, recommendation };
}

// ====== 自動檢查函式 ======

/**
 * 檢查 1：是否有廠商連續得標
 * - 連續 3 年以上同一廠商得標 → 紅燈（可能有特殊關係）
 * - 連續 2 年 → 黃燈（需注意）
 * - 無連續得標或無資料 → 綠燈
 */
export function assessConsecutiveWinner(
  history: AgencyHistoryData,
): WinCheck {
  const topWinner = history.top_winners[0];

  if (!topWinner || history.total_cases === 0) {
    return {
      id: "consecutive_winner",
      label: WIN_CHECK_LABELS.consecutive_winner,
      status: "green",
      evidence: "此機關無足夠歷史案件資料可分析。",
      source: "pcc",
      auto_filled: true,
    };
  }

  const { consecutive_years, name, win_count } = topWinner;

  if (consecutive_years >= 3) {
    return {
      id: "consecutive_winner",
      label: WIN_CHECK_LABELS.consecutive_winner,
      status: "red",
      evidence: `「${name}」已連續 ${consecutive_years} 年得標（共 ${win_count} 次），可能存在特定合作關係。`,
      source: "pcc",
      auto_filled: true,
    };
  }

  if (consecutive_years === 2) {
    return {
      id: "consecutive_winner",
      label: WIN_CHECK_LABELS.consecutive_winner,
      status: "yellow",
      evidence: `「${name}」連續 2 年得標（共 ${win_count} 次），建議關注其優勢所在。`,
      source: "pcc",
      auto_filled: true,
    };
  }

  return {
    id: "consecutive_winner",
    label: WIN_CHECK_LABELS.consecutive_winner,
    status: "green",
    evidence: `此機關近年得標廠商較分散，最高得標者「${name}」共 ${win_count} 次，無明顯壟斷現象。`,
    source: "pcc",
    auto_filled: true,
  };
}

/**
 * 檢查 2：評委名單是否可查
 * - 歷史案件中有評委名單 → 綠燈
 * - 無評委名單 → 黃燈（資訊不足但不致命）
 */
export function assessCommitteeKnown(
  history: AgencyHistoryData,
): WinCheck {
  // 判斷依據：若歷史案件數 >= 3 且為政府機關，通常可查到評委
  // 實際資料中 evaluation_committee 需要額外 API 呼叫取得
  // 此處根據案件數量做初步判斷

  if (history.total_cases >= 5) {
    return {
      id: "committee_known",
      label: WIN_CHECK_LABELS.committee_known,
      status: "yellow",
      evidence: `此機關有 ${history.total_cases} 筆歷史案件，評委名單需進一步查詢個別標案詳情確認。`,
      source: "pcc",
      auto_filled: true,
    };
  }

  if (history.total_cases >= 1) {
    return {
      id: "committee_known",
      label: WIN_CHECK_LABELS.committee_known,
      status: "yellow",
      evidence: `此機關歷史案件較少（${history.total_cases} 筆），評委資訊有限。`,
      source: "pcc",
      auto_filled: true,
    };
  }

  return {
    id: "committee_known",
    label: WIN_CHECK_LABELS.committee_known,
    status: "unknown",
    evidence: "無此機關歷史案件資料，無法判斷評委名單是否可查。",
    source: "pcc",
    auto_filled: true,
  };
}

/**
 * 檢查 3：評委結構分析
 * - 根據歷史案件的決標方式推測評委結構
 */
export function assessCommitteeStructure(
  history: AgencyHistoryData,
): WinCheck {
  if (history.total_cases === 0) {
    return {
      id: "committee_structure",
      label: WIN_CHECK_LABELS.committee_structure,
      status: "unknown",
      evidence: "無歷史案件資料可分析評委結構。",
      source: "pcc",
      auto_filled: true,
    };
  }

  // 分析案件標題中的決標方式線索
  const titles = history.cases.map((c) => c.title).join(" ");
  const hasEvaluation = titles.includes("最有利標") || titles.includes("評選");
  const avgBidders =
    history.cases.reduce((sum, c) => sum + c.bidder_count, 0) /
    history.cases.length;

  if (hasEvaluation) {
    return {
      id: "committee_structure",
      label: WIN_CHECK_LABELS.committee_structure,
      status: "yellow",
      evidence: `此機關傾向使用最有利標/評選方式，平均投標家數 ${avgBidders.toFixed(1)} 家。建議透過 Perplexity 搜尋評委背景。`,
      source: "pcc",
      auto_filled: true,
    };
  }

  return {
    id: "committee_structure",
    label: WIN_CHECK_LABELS.committee_structure,
    status: "green",
    evidence: `此機關歷史案件平均投標家數 ${avgBidders.toFixed(1)} 家，未觀察到明顯評選偏好。`,
    source: "pcc",
    auto_filled: true,
  };
}

/**
 * 檢查 4：競爭對手追蹤
 * - 有強勢競爭對手（多機關佈局）→ 黃燈/紅燈
 * - 競爭對手分散 → 綠燈
 */
export function assessCompetitorTrack(
  competitors: CompetitorData,
): WinCheck {
  if (competitors.competitors.length === 0) {
    return {
      id: "competitor_track",
      label: WIN_CHECK_LABELS.competitor_track,
      status: "unknown",
      evidence: "尚未取得競爭對手資料。",
      source: "pcc",
      auto_filled: true,
    };
  }

  const strongest = competitors.competitors[0];

  if (
    strongest.consecutive_years >= 3 &&
    strongest.other_agencies.length >= 3
  ) {
    return {
      id: "competitor_track",
      label: WIN_CHECK_LABELS.competitor_track,
      status: "red",
      evidence: `主要競爭對手「${strongest.name}」連續 ${strongest.consecutive_years} 年得標，且在 ${strongest.other_agencies.length} 個其他機關有布局。專長領域：${strongest.specializations.join("、") || "待分析"}。`,
      source: "pcc",
      auto_filled: true,
    };
  }

  if (strongest.win_count >= 3 || strongest.other_agencies.length >= 3) {
    return {
      id: "competitor_track",
      label: WIN_CHECK_LABELS.competitor_track,
      status: "yellow",
      evidence: `主要競爭對手「${strongest.name}」得標 ${strongest.win_count} 次，跨 ${strongest.other_agencies.length} 個其他機關。需關注其優勢。`,
      source: "pcc",
      auto_filled: true,
    };
  }

  return {
    id: "competitor_track",
    label: WIN_CHECK_LABELS.competitor_track,
    status: "green",
    evidence: `競爭對手分散，最強競爭者「${strongest.name}」得標 ${strongest.win_count} 次，威脅程度尚低。`,
    source: "pcc",
    auto_filled: true,
  };
}

// ====== 手動更新 ======

/**
 * 使用者手動更新某一項檢查的狀態與證據。
 * 回傳新的 checks 陣列（不 mutate 原陣列）。
 */
export function updateManualCheck(
  checks: WinCheck[],
  checkId: WinCheckId,
  status: TrafficLight,
  evidence: string,
): WinCheck[] {
  return checks.map((check) =>
    check.id === checkId
      ? {
          ...check,
          status,
          evidence,
          source: "manual",
          auto_filled: false,
        }
      : check,
  );
}
