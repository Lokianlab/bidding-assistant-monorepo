// ====== M03 戰略分析引擎：適配度評分 ======

import type {
  DimensionScore,
  DimensionKey,
  FitScore,
  FitWeights,
  VerdictThresholds,
  AgencyIntel,
  MarketTrend,
  KBEntry00A,
  KBEntry00B,
} from "./types";
import {
  DEFAULT_FIT_WEIGHTS,
  DEFAULT_VERDICT_THRESHOLDS,
  DIMENSION_MAX_SCORE,
  DOMAIN_FULL_SCORE_MATCHES,
  INCUMBENT_STRONG_THRESHOLD,
  COMPETITION_BLUE_OCEAN,
  COMPETITION_RED_OCEAN,
  SCALE_IQR_COMFORTABLE,
  SCALE_IQR_STRETCH,
  TEAM_FULL_SCORE_MEMBERS,
} from "./constants";
import {
  extractKeywords,
  textMatch,
  normalizeWeights,
  computeVerdict,
  clampScore,
  median,
  iqr,
  parseAmount,
} from "./helpers";

// ====== 維度 1：領域匹配 ======

/**
 * 評估案名關鍵字與實績庫的匹配程度。
 * - 0 匹配 → 0 分（全新領域）
 * - 1-2 匹配 → 中分
 * - 3+ 匹配且含主要實績 → 滿分
 */
export function scoreDomain(
  tenderTitle: string,
  tenderKeywords: string[],
  portfolio: KBEntry00B[],
): DimensionScore {
  if (!portfolio.length) {
    return { score: 0, confidence: "低", evidence: "實績庫為空，無法評估領域匹配" };
  }

  const keywords = tenderKeywords.length > 0 ? tenderKeywords : extractKeywords(tenderTitle);
  if (keywords.length === 0) {
    return { score: 0, confidence: "低", evidence: "無法從案名提取關鍵字" };
  }

  // 計算每個關鍵字在實績庫中的匹配情況
  let totalMatches = 0;
  const matchedProjects = new Set<string>();

  for (const kw of keywords) {
    for (const proj of portfolio) {
      if (proj.entryStatus !== "active") continue;
      // 匹配案名、工作項目
      const matchTitle = textMatch(proj.projectName, kw);
      const matchWork = proj.workItems.some((w) => textMatch(w.item, kw) > 0.5 || textMatch(w.description, kw) > 0.5);
      if (matchTitle > 0.5 || matchWork) {
        totalMatches++;
        matchedProjects.add(proj.id);
      }
    }
  }

  const uniqueMatches = matchedProjects.size;

  // 評分：匹配案件數 → 分數
  let score: number;
  if (uniqueMatches >= DOMAIN_FULL_SCORE_MATCHES) {
    score = DIMENSION_MAX_SCORE;
  } else if (uniqueMatches > 0) {
    score = (uniqueMatches / DOMAIN_FULL_SCORE_MATCHES) * DIMENSION_MAX_SCORE;
  } else {
    score = 0;
  }

  // 有已驗收結案的加分
  const completedMatches = portfolio.filter(
    (p) => matchedProjects.has(p.id) && p.completionStatus === "已驗收結案",
  );
  if (completedMatches.length > 0 && score < DIMENSION_MAX_SCORE) {
    score = Math.min(score + 2, DIMENSION_MAX_SCORE);
  }

  const confidence = uniqueMatches >= DOMAIN_FULL_SCORE_MATCHES ? "高" : uniqueMatches > 0 ? "中" : "低";
  const evidence = uniqueMatches > 0
    ? `匹配到 ${uniqueMatches} 筆實績（共 ${totalMatches} 次關鍵字命中）`
    : `${keywords.join("、")} 在實績庫中沒有匹配`;

  return { score: clampScore(score), confidence, evidence };
}

// ====== 維度 2：機關熟悉度 ======

/**
 * 評估與目標機關的往來紀錄。
 * - 有得標紀錄 → 高分
 * - 有投標紀錄但沒得標 → 中分
 * - 在位者弱 → 加分；在位者強 → 減分
 * - 從未接觸 → 低分但不是 0
 */
export function scoreAgency(
  agencyIntel: AgencyIntel | null,
  portfolio: KBEntry00B[],
  agencyName?: string,
): DimensionScore {
  // 無機關情報
  if (!agencyIntel) {
    // 嘗試從實績庫找機關匹配
    if (agencyName && portfolio.length > 0) {
      const agencyMatches = portfolio.filter(
        (p) => p.entryStatus === "active" && textMatch(p.client, agencyName) > 0.5,
      );
      if (agencyMatches.length > 0) {
        return {
          score: clampScore(8),
          confidence: "中",
          evidence: `實績庫有 ${agencyMatches.length} 筆此機關案件，但缺乏投標紀錄分析`,
        };
      }
    }
    return { score: clampScore(4), confidence: "低", evidence: "無機關情報，無法評估熟悉度" };
  }

  let score = 0;
  const reasons: string[] = [];

  // 我方歷史
  const wins = agencyIntel.myHistory.filter((h) => h.won).length;
  const losses = agencyIntel.myHistory.filter((h) => !h.won).length;

  if (wins > 0) {
    score += 12; // 有得標基底分
    score += Math.min(wins - 1, 3) * 2; // 每多得標一次 +2，上限 +6
    reasons.push(`在此機關得標 ${wins} 次`);
  } else if (losses > 0) {
    score += 6; // 有投標但沒得標
    reasons.push(`在此機關投標 ${losses} 次但未得標`);
  } else {
    score += 4; // 有資料但沒有我方紀錄
    reasons.push("此機關無我方投標紀錄");
  }

  // 在位者分析
  const strongIncumbent = agencyIntel.incumbents.find(
    (inc) => inc.wins >= INCUMBENT_STRONG_THRESHOLD,
  );
  if (strongIncumbent) {
    score -= 4;
    reasons.push(`在位者 ${strongIncumbent.name} 連續得標 ${strongIncumbent.wins} 次`);
  } else if (agencyIntel.incumbents.length === 0 || agencyIntel.incumbents.every((inc) => inc.wins <= 1)) {
    score += 2;
    reasons.push("無明顯在位者優勢");
  }

  const confidence = wins > 0 ? "高" : agencyIntel.totalCases > 0 ? "中" : "低";

  return {
    score: clampScore(score),
    confidence,
    evidence: reasons.join("；"),
  };
}

// ====== 維度 3：競爭強度 ======

/**
 * 評估此類案件的競爭程度。
 * - 藍海（< 3 家） → 高分
 * - 一般（3-6 家） → 中分
 * - 紅海（> 6 家） → 低分
 * - 趨勢減少 → 加分
 */
export function scoreCompetition(
  marketTrend: MarketTrend | null,
  bidderCount: number | null,
): DimensionScore {
  // 優先使用實際投標家數
  const effectiveBidders = bidderCount ?? marketTrend?.yearlyData.at(-1)?.avgBidders ?? null;

  if (effectiveBidders === null && !marketTrend) {
    return { score: clampScore(10), confidence: "低", evidence: "無競爭資料，預設中等競爭" };
  }

  let score: number;
  const reasons: string[] = [];

  if (effectiveBidders !== null) {
    if (effectiveBidders < COMPETITION_BLUE_OCEAN) {
      score = DIMENSION_MAX_SCORE;
      reasons.push(`投標家數 ${effectiveBidders}，藍海市場`);
    } else if (effectiveBidders <= COMPETITION_RED_OCEAN) {
      // 線性內插：3 家 → 15 分，6 家 → 8 分
      score = 15 - ((effectiveBidders - COMPETITION_BLUE_OCEAN) / (COMPETITION_RED_OCEAN - COMPETITION_BLUE_OCEAN)) * 7;
      reasons.push(`投標家數 ${effectiveBidders}，一般競爭`);
    } else {
      // > 6 家：6→8 分，每多 1 家 -1 分，最低 2 分
      score = Math.max(2, 8 - (effectiveBidders - COMPETITION_RED_OCEAN));
      reasons.push(`投標家數 ${effectiveBidders}，紅海市場`);
    }
  } else {
    // 用市場趨勢的 competitionLevel
    score = marketTrend!.competitionLevel === "藍海" ? 16
      : marketTrend!.competitionLevel === "一般" ? 10
        : 5;
    reasons.push(`市場判定為${marketTrend!.competitionLevel}`);
  }

  // 趨勢加減分
  if (marketTrend) {
    if (marketTrend.trendDirection === "減少") {
      score += 2;
      reasons.push("案件量趨勢減少，競爭可能緩和");
    } else if (marketTrend.trendDirection === "增加") {
      score -= 1;
      reasons.push("案件量趨勢增加，競爭可能加劇");
    }
  }

  const confidence = bidderCount !== null ? "高" : marketTrend ? "中" : "低";

  return {
    score: clampScore(score),
    confidence,
    evidence: reasons.join("；"),
  };
}

// ====== 維度 4：規模適合度 ======

/**
 * 評估案件預算是否在公司歷史案件的舒適範圍內。
 * - 預算在 IQR 內 → 滿分
 * - 在 1.5×IQR 內 → 中分
 * - 超出 2×IQR → 低分
 */
export function scoreScale(
  budget: number | null,
  portfolio: KBEntry00B[],
): DimensionScore {
  if (budget === null || budget <= 0) {
    return { score: clampScore(10), confidence: "低", evidence: "無預算資料，預設中等適合度" };
  }

  // 從實績庫提取金額
  const amounts = portfolio
    .filter((p) => p.entryStatus === "active")
    .map((p) => parseAmount(p.contractAmount))
    .filter((a): a is number => a !== null && a > 0);

  if (amounts.length === 0) {
    return { score: clampScore(10), confidence: "低", evidence: "實績庫無金額資料可比較" };
  }

  const med = median(amounts);
  const { q1, q3, iqr: iqrVal } = iqr(amounts);

  // IQR 為 0 時用中位數的 ±50% 作為範圍
  const effectiveIQR = iqrVal > 0 ? iqrVal : med * 0.5;

  let score: number;
  let description: string;

  if (budget >= q1 && budget <= q3) {
    score = DIMENSION_MAX_SCORE;
    description = "預算在歷史案件 IQR 範圍內";
  } else {
    const distanceFromRange = budget < q1 ? q1 - budget : budget - q3;
    const ratio = effectiveIQR > 0 ? distanceFromRange / effectiveIQR : 2;

    if (ratio <= SCALE_IQR_COMFORTABLE) {
      score = 14 - ratio * 4; // 0→14, 1.5→8
      description = `預算偏離 IQR ${ratio.toFixed(1)} 倍，尚在舒適範圍`;
    } else if (ratio <= SCALE_IQR_STRETCH) {
      score = 6 - (ratio - SCALE_IQR_COMFORTABLE) * 4; // 1.5→6, 2→4
      description = `預算偏離 IQR ${ratio.toFixed(1)} 倍，規模差距較大`;
    } else {
      score = Math.max(1, 4 - (ratio - SCALE_IQR_STRETCH) * 2);
      description = budget > q3
        ? `案子太大：預算 ${budget.toLocaleString()} 遠超歷史中位數 ${med.toLocaleString()}`
        : `案子太小：預算 ${budget.toLocaleString()} 遠低於歷史中位數 ${med.toLocaleString()}`;
    }
  }

  const confidence = amounts.length >= 5 ? "高" : amounts.length >= 2 ? "中" : "低";

  return {
    score: clampScore(score),
    confidence,
    evidence: `${description}（歷史案件中位數 ${med.toLocaleString()}，${amounts.length} 筆比較資料）`,
  };
}

// ====== 維度 5：團隊可用性 ======

/**
 * 評估團隊是否有適合此案的人選。
 * - 3+ 人匹配 → 滿分
 * - 1-2 人匹配 → 中分
 * - 匹配者有主管級 → 加分
 */
export function scoreTeam(
  tenderKeywords: string[],
  team: KBEntry00A[],
): DimensionScore {
  if (team.length === 0) {
    return { score: 0, confidence: "低", evidence: "團隊資料庫為空" };
  }
  if (tenderKeywords.length === 0) {
    return { score: clampScore(10), confidence: "低", evidence: "無案件關鍵字可匹配團隊" };
  }

  const activeTeam = team.filter((m) => m.entryStatus === "active" && m.status !== "已離職");
  const matchedMembers = new Map<string, string[]>(); // id → 匹配原因

  for (const member of activeTeam) {
    const matchReasons: string[] = [];

    for (const kw of tenderKeywords) {
      // 匹配認證
      const certMatch = member.certifications.some((c) => textMatch(c.name, kw) > 0.5);
      if (certMatch) matchReasons.push(`認證含「${kw}」`);

      // 匹配經歷
      const expMatch = member.experiences.some(
        (e) => textMatch(e.description, kw) > 0.3 || textMatch(e.title, kw) > 0.5,
      );
      if (expMatch) matchReasons.push(`經歷含「${kw}」`);

      // 匹配專案
      const projMatch = member.projects.some(
        (p) => textMatch(p.projectName, kw) > 0.5 || textMatch(p.role, kw) > 0.5,
      );
      if (projMatch) matchReasons.push(`專案含「${kw}」`);

      // 匹配授權角色
      const roleMatch = member.authorizedRoles.some((r) => textMatch(r, kw) > 0.5);
      if (roleMatch) matchReasons.push(`授權角色含「${kw}」`);

      // 匹配附加能力
      if (member.additionalCapabilities && textMatch(member.additionalCapabilities, kw) > 0.3) {
        matchReasons.push(`附加能力含「${kw}」`);
      }
    }

    if (matchReasons.length > 0) {
      matchedMembers.set(member.id, [...new Set(matchReasons)]);
    }
  }

  const matchCount = matchedMembers.size;

  let score: number;
  if (matchCount >= TEAM_FULL_SCORE_MEMBERS) {
    score = DIMENSION_MAX_SCORE;
  } else if (matchCount > 0) {
    score = (matchCount / TEAM_FULL_SCORE_MEMBERS) * DIMENSION_MAX_SCORE * 0.8; // 未滿最高打八折
  } else {
    score = 0;
  }

  // 有主管級加分（「計畫主持人」在授權角色中）
  const hasLeader = activeTeam.some(
    (m) =>
      matchedMembers.has(m.id) &&
      m.authorizedRoles.some((r) => r.includes("計畫主持人") || r.includes("主持人")),
  );
  if (hasLeader && score < DIMENSION_MAX_SCORE) {
    score = Math.min(score + 3, DIMENSION_MAX_SCORE);
  }

  const confidence = matchCount >= TEAM_FULL_SCORE_MEMBERS ? "高" : matchCount > 0 ? "中" : "低";
  const memberNames = activeTeam
    .filter((m) => matchedMembers.has(m.id))
    .map((m) => m.name)
    .slice(0, 5);

  const evidence = matchCount > 0
    ? `匹配 ${matchCount} 位團隊成員（${memberNames.join("、")}）${hasLeader ? "，含主管級人選" : ""}`
    : `${tenderKeywords.join("、")} 在團隊庫中沒有匹配`;

  return { score: clampScore(score), confidence, evidence };
}

// ====== 總分計算 ======

/** 適配度評分所需的輸入 */
export interface FitScoringInput {
  tenderTitle: string;
  tenderKeywords?: string[];
  budget: number | null;
  agencyName?: string;
  bidderCount?: number | null;
  agencyIntel: AgencyIntel | null;
  marketTrend: MarketTrend | null;
  portfolio: KBEntry00B[];
  team: KBEntry00A[];
  weights?: FitWeights;
  thresholds?: VerdictThresholds;
}

/**
 * 計算完整的五維適配度評分。
 * 純函式，不碰任何外部狀態。
 */
export function computeFitScore(input: FitScoringInput): FitScore {
  const {
    tenderTitle,
    budget,
    agencyName,
    agencyIntel,
    marketTrend,
    portfolio,
    team,
    weights = DEFAULT_FIT_WEIGHTS,
    thresholds = DEFAULT_VERDICT_THRESHOLDS,
  } = input;

  const tenderKeywords = input.tenderKeywords ?? extractKeywords(tenderTitle);
  const bidderCount = input.bidderCount ?? null;

  // 計算五個維度
  const dimensions: FitScore["dimensions"] = {
    domain: scoreDomain(tenderTitle, tenderKeywords, portfolio),
    agency: scoreAgency(agencyIntel, portfolio, agencyName),
    competition: scoreCompetition(marketTrend, bidderCount),
    scale: scoreScale(budget, portfolio),
    team: scoreTeam(tenderKeywords, team),
  };

  // 加權總分
  const normalizedW = normalizeWeights(weights);
  const keys: DimensionKey[] = ["domain", "agency", "competition", "scale", "team"];
  const total = Math.round(
    keys.reduce((sum, k) => sum + (dimensions[k].score / DIMENSION_MAX_SCORE) * normalizedW[k], 0) * 10,
  ) / 10;

  // 判定
  const verdict = computeVerdict(total, dimensions, thresholds, weights);

  // 生成理由
  const reasons = generateReasons(dimensions, total, verdict);

  // 紅旗
  const redFlags = generateRedFlags(dimensions, budget, agencyIntel);

  return { total, dimensions, verdict, reasons, redFlags };
}

/** 根據評分結果自動生成 2-3 句判斷理由 */
function generateReasons(
  dimensions: FitScore["dimensions"],
  total: number,
  verdict: FitVerdict,
): string[] {
  const reasons: string[] = [];
  const keys: DimensionKey[] = ["domain", "agency", "competition", "scale", "team"];

  // 找出最強和最弱維度
  const sorted = keys.sort((a, b) => dimensions[b].score - dimensions[a].score);
  const strongest = sorted[0];
  const weakest = sorted[sorted.length - 1];

  const dimLabels: Record<DimensionKey, string> = {
    domain: "領域匹配",
    agency: "機關熟悉度",
    competition: "競爭強度",
    scale: "規模適合度",
    team: "團隊可用性",
  };

  if (verdict === "建議投標") {
    reasons.push(`總分 ${total} 達投標門檻，最強項為${dimLabels[strongest]}（${dimensions[strongest].score}/${DIMENSION_MAX_SCORE}）`);
  } else if (verdict === "值得評估") {
    reasons.push(`總分 ${total} 在評估區間，需進一步分析`);
  } else if (verdict === "不建議") {
    reasons.push(`總分 ${total} 低於投標門檻，最弱項為${dimLabels[weakest]}（${dimensions[weakest].score}/${DIMENSION_MAX_SCORE}）`);
  } else {
    reasons.push(`部分維度資料不足，評分參考性有限`);
  }

  // 補充最強/最弱的證據
  if (dimensions[strongest].score >= 15) {
    reasons.push(dimensions[strongest].evidence);
  }
  if (dimensions[weakest].score <= 5 && weakest !== strongest) {
    reasons.push(`注意：${dimLabels[weakest]} — ${dimensions[weakest].evidence}`);
  }

  return reasons.slice(0, 3);
}

/** 自動生成紅旗警示 */
function generateRedFlags(
  dimensions: FitScore["dimensions"],
  budget: number | null,
  agencyIntel: AgencyIntel | null,
): string[] {
  const flags: string[] = [];

  // 領域完全不匹配
  if (dimensions.domain.score === 0) {
    flags.push("全新領域：實績庫無任何相關案件");
  }

  // 在位者太強
  if (agencyIntel) {
    const strongIncumbent = agencyIntel.incumbents.find((inc) => inc.wins >= INCUMBENT_STRONG_THRESHOLD);
    if (strongIncumbent) {
      flags.push(`強勢在位者：${strongIncumbent.name} 連續得標 ${strongIncumbent.wins} 次`);
    }
  }

  // 規模異常
  if (dimensions.scale.score <= 3 && budget !== null) {
    flags.push(`規模偏離：預算 ${budget.toLocaleString()} 與歷史案件差距過大`);
  }

  // 團隊匹配為零
  if (dimensions.team.score === 0) {
    flags.push("團隊斷層：無人選匹配此案需求");
  }

  // 競爭過於激烈
  if (dimensions.competition.score <= 4) {
    flags.push("紅海市場：投標家數偏高，得標機率較低");
  }

  return flags;
}
