// ====== M03 戰略分析引擎：適配度評分 ======
// 五維評分（領域、機關、競爭、規模、團隊），每維 0-20，總分 0-100

import type {
  DimensionScore,
  FitScore,
  FitScoreInput,
  FitWeights,
  FitVerdict,
  ConfidenceLevel,
} from "./types";
import type { KBEntry00A, KBEntry00B } from "@/lib/knowledge-base/types";
import type { SelfAnalysis, MarketTrend } from "@/lib/pcc/types";
import type { Partner } from "@/lib/partners/types";
import {
  DEFAULT_FIT_WEIGHTS,
  FIT_THRESHOLDS,
  COMPETITION_THRESHOLDS,
  RED_FLAG_RULES,
  PI_KEYWORDS,
} from "./constants";
import {
  extractKeywords,
  keywordOverlap,
  parseContractAmount,
  calculateIQR,
  clampScore,
  formatBudget,
} from "./helpers";

// ====== 維度評分函式 ======

/**
 * 領域匹配（Domain）— 案件類型是否與實績吻合
 */
export function scoreDomain(
  caseName: string,
  portfolio: KBEntry00B[],
): DimensionScore {
  const active = portfolio.filter((p) => p.entryStatus === "active");

  if (active.length === 0) {
    return { score: 0, confidence: "低", evidence: "知識庫無實績資料" };
  }

  const { categories, terms } = extractKeywords(caseName);

  if (terms.length === 0) {
    return {
      score: 5,
      confidence: "低",
      evidence: "案件名稱無法辨識業務類型",
    };
  }

  // 找出有關鍵字重疊的實績
  const matches = active.filter(
    (p) => keywordOverlap(caseName, p.projectName) > 0,
  );

  if (matches.length >= 3) {
    return {
      score: 20,
      confidence: "高",
      evidence: `領域關鍵字「${terms.slice(0, 3).join("、")}」在 ${matches.length} 筆實績中出現`,
    };
  }

  if (matches.length >= 1) {
    const score = 10 + matches.length * 3;
    return {
      score: clampScore(score),
      confidence: "中",
      evidence: `找到 ${matches.length} 筆相關實績（${matches.map((m) => m.projectName).slice(0, 2).join("、")}）`,
    };
  }

  return {
    score: 3,
    confidence: "低",
    evidence: `案件涉及「${categories.join("、")}」，但無直接相關實績`,
  };
}

/**
 * 機關熟悉度（Agency）— 與該機關的歷史互動
 */
export function scoreAgency(
  agencyName: string,
  selfAnalysis: SelfAnalysis | null,
): DimensionScore {
  if (!selfAnalysis || selfAnalysis.agencies.length === 0) {
    return { score: 5, confidence: "低", evidence: "無歷史投標資料" };
  }

  const record = selfAnalysis.agencies.find(
    (a) => a.unitName.includes(agencyName) || agencyName.includes(a.unitName),
  );

  if (!record) {
    return {
      score: 5,
      confidence: "中",
      evidence: `無「${agencyName}」投標紀錄，屬新開發機關`,
    };
  }

  const { totalCases, myWins } = record;
  const winRate = totalCases > 0 ? myWins / totalCases : 0;

  if (myWins >= 3) {
    return {
      score: 20,
      confidence: "高",
      evidence: `在「${record.unitName}」得標 ${myWins} 次（${totalCases} 案），得標率 ${(winRate * 100).toFixed(0)}%`,
    };
  }

  if (myWins >= 1) {
    const score = 14 + myWins * 2;
    return {
      score: clampScore(score),
      confidence: "高",
      evidence: `在「${record.unitName}」得標 ${myWins} 次，共投標 ${totalCases} 次`,
    };
  }

  if (totalCases >= 1) {
    return {
      score: 8,
      confidence: "中",
      evidence: `曾在「${record.unitName}」投標 ${totalCases} 次但未得標`,
    };
  }

  return {
    score: 5,
    confidence: "低",
    evidence: `與「${record.unitName}」有接觸但無投標紀錄`,
  };
}

/**
 * 競爭強度（Competition）— 分數越高表示競爭越低（對我方越有利）
 */
export function scoreCompetition(
  marketTrend: MarketTrend | null,
  bidderCount: number | null,
): DimensionScore {
  // 優先使用實際投標家數
  if (bidderCount !== null && bidderCount > 0) {
    let score: number;

    if (bidderCount <= COMPETITION_THRESHOLDS.blueOcean) {
      score = 20;
    } else if (bidderCount <= COMPETITION_THRESHOLDS.redSea) {
      // 線性插值：3 家 → 15 分，6 家 → 8 分
      const ratio =
        (bidderCount - COMPETITION_THRESHOLDS.blueOcean) /
        (COMPETITION_THRESHOLDS.redSea - COMPETITION_THRESHOLDS.blueOcean);
      score = 20 - ratio * 12;
    } else {
      score = Math.max(0, 8 - (bidderCount - COMPETITION_THRESHOLDS.redSea) * 1.5);
    }

    const label =
      bidderCount <= COMPETITION_THRESHOLDS.blueOcean
        ? "（藍海）"
        : bidderCount > COMPETITION_THRESHOLDS.redSea
          ? "（紅海）"
          : "";

    return {
      score: clampScore(score),
      confidence: "高",
      evidence: `實際投標 ${bidderCount} 家${label}`,
    };
  }

  // 退而求其次：市場趨勢資料
  if (!marketTrend) {
    return {
      score: 10,
      confidence: "低",
      evidence: "無市場趨勢資料，預設中等競爭",
    };
  }

  const latestYear =
    marketTrend.yearlyData[marketTrend.yearlyData.length - 1];
  const avgBidders = latestYear?.avgBidders ?? 0;

  let score: number;
  if (marketTrend.competitionLevel === "藍海") {
    score = 18;
  } else if (marketTrend.competitionLevel === "一般") {
    score = 12;
  } else {
    score = 5;
  }

  // 趨勢加減分
  if (marketTrend.trendDirection === "減少") score += 2;
  if (marketTrend.trendDirection === "增加") score -= 2;

  return {
    score: clampScore(score),
    confidence: "中",
    evidence: `市場「${marketTrend.keyword}」：${marketTrend.competitionLevel}（平均 ${avgBidders.toFixed(1)} 家），趨勢${marketTrend.trendDirection}`,
  };
}

/**
 * 規模適合度（Scale）— 預算是否在我們的舒適區
 */
export function scoreScale(
  budget: number | null,
  portfolio: KBEntry00B[],
): DimensionScore {
  if (budget === null) {
    return { score: 10, confidence: "低", evidence: "無預算資料" };
  }

  const active = portfolio.filter((p) => p.entryStatus === "active");
  const amounts = active
    .map((p) => parseContractAmount(p.contractAmount))
    .filter((a): a is number => a !== null && a > 0);

  if (amounts.length < 4) {
    return {
      score: 10,
      confidence: "低",
      evidence: `實績資料不足（${amounts.length} 筆），無法判斷規模適合度`,
    };
  }

  const iqr = calculateIQR(amounts);
  if (!iqr) {
    return { score: 10, confidence: "低", evidence: "無法計算實績規模分佈" };
  }

  const { q1, q3, iqr: range } = iqr;

  // 極端值：預算不到 Q1 的 10% 或超過 Q3 的 5 倍 → 直接判定不適合
  if (budget < q1 * 0.1) {
    return {
      score: 3,
      confidence: "高",
      evidence: `預算 ${formatBudget(budget)} 遠低於實績規模下限 ${formatBudget(q1)}`,
    };
  }
  if (budget > q3 * 5) {
    return {
      score: 3,
      confidence: "高",
      evidence: `預算 ${formatBudget(budget)} 遠超實績規模上限 ${formatBudget(q3)}`,
    };
  }

  if (budget >= q1 && budget <= q3) {
    return {
      score: 20,
      confidence: "高",
      evidence: `預算 ${formatBudget(budget)} 在實績常見範圍內（${formatBudget(q1)} ~ ${formatBudget(q3)}）`,
    };
  }

  if (budget >= q1 - range * 0.5 && budget <= q3 + range * 0.5) {
    return {
      score: 14,
      confidence: "中",
      evidence: `預算 ${formatBudget(budget)} 略超出實績常見範圍（${formatBudget(q1)} ~ ${formatBudget(q3)}）`,
    };
  }

  if (budget >= q1 - range * 1.5 && budget <= q3 + range * 1.5) {
    return {
      score: 8,
      confidence: "中",
      evidence: `預算 ${formatBudget(budget)} 偏離實績範圍（${formatBudget(q1)} ~ ${formatBudget(q3)}）`,
    };
  }

  const direction = budget > q3 ? "遠超實績規模上限" : "遠低於實績規模下限";
  const boundary = budget > q3 ? q3 : q1;
  return {
    score: 3,
    confidence: "高",
    evidence: `預算 ${formatBudget(budget)} ${direction} ${formatBudget(boundary)}`,
  };
}

/**
 * 團隊可用性（Team）— 是否有能做這案子的人
 * M07 整合：支援外包夥伴資源補充評估
 */
export function scoreTeam(
  caseName: string,
  team: KBEntry00A[],
  partners?: Partner[],
): DimensionScore {
  const active = team.filter(
    (m) => m.entryStatus === "active" && m.status === "在職",
  );

  if (active.length === 0) {
    return { score: 0, confidence: "低", evidence: "知識庫無團隊資料" };
  }

  const { categories, terms } = extractKeywords(caseName);

  // 逐人比對經驗、證照、專案
  const matched = active.filter((member) => {
    const text = [
      member.title,
      member.additionalCapabilities,
      ...member.experiences.map((e) => `${e.description} ${e.title}`),
      ...member.certifications.map((c) => c.name),
      ...member.projects.map((p) => `${p.projectName} ${p.role}`),
    ].join(" ");

    return (
      terms.some((t) => text.includes(t)) ||
      categories.some((c) => text.includes(c))
    );
  });

  // 檢查計畫主持人資格
  const hasPI = active.some((member) => {
    const text = [
      ...member.authorizedRoles,
      ...member.projects.map((p) => p.role),
    ].join(" ");
    return PI_KEYWORDS.some((kw) => text.includes(kw));
  });

  const needsPI = PI_KEYWORDS.some((kw) => caseName.includes(kw));

  let score: number;
  let confidence: ConfidenceLevel;
  let evidence: string;

  if (matched.length >= 3) {
    score = hasPI ? 20 : 17;
    confidence = "高";
    evidence = `${matched.length} 名團隊成員有相關經驗（${matched.map((m) => m.name).slice(0, 3).join("、")}）${hasPI ? "，含計畫主持人資格" : ""}`;
  } else if (matched.length >= 1) {
    score = 10 + matched.length * 3;
    confidence = "中";
    evidence = `${matched.length} 名成員相關（${matched.map((m) => m.name).join("、")}）`;
  } else {
    score = active.length >= 3 ? 5 : 2;
    confidence = "低";
    evidence = `團隊 ${active.length} 人，但無直接相關經驗`;
  }

  // 案件需要計畫主持人但團隊沒有
  if (needsPI && !hasPI) {
    score = Math.max(0, score - 5);
    evidence += "。案件要求計畫主持人但團隊無此資格";
  }

  // M07 整合：評估外包夥伴資源
  if (partners && partners.length > 0) {
    const activePartners = partners.filter((p) => p.status === "active");

    // 匹配夥伴專業類別與案件需求
    const matchedPartners = activePartners.filter((partner) => {
      const partnerText = [
        partner.name,
        ...partner.category,
        ...partner.tags,
      ].join(" ");

      return (
        terms.some((t) => partnerText.includes(t)) ||
        categories.some((c) => partnerText.includes(c))
      );
    });

    if (matchedPartners.length > 0) {
      // 計算匹配夥伴的平均評分與合作歷史
      const avgRating = matchedPartners.reduce((sum, p) => sum + p.rating, 0) / matchedPartners.length;
      const totalCooperation = matchedPartners.reduce((sum, p) => sum + p.cooperation_count, 0);

      // 根據夥伴品質提升分數與信心度
      // 高評分（>=4）+ 多次合作 → 提升 2-3 分
      const partnerBoost = avgRating >= 4 ? (totalCooperation >= 3 ? 3 : 2) : 1;
      const newScore = score + partnerBoost;

      // 信心度提升邏輯：如果有高評分夥伴補充，提升信心度
      const oldConfidence = confidence;
      if (avgRating >= 4 && (oldConfidence === "低" || oldConfidence === "中")) {
        confidence = "高";
      }

      evidence += `。外包夥伴補充（${matchedPartners.map((p) => p.name).slice(0, 2).join("、")}，平均評分：${avgRating.toFixed(1)} 星）`;
      score = newScore;
    }
  }

  return { score: clampScore(score), confidence, evidence };
}

// ====== 輔助函式 ======

/** 偵測紅旗 */
export function detectRedFlags(caseName: string): string[] {
  return RED_FLAG_RULES.filter((rule) => rule.pattern.test(caseName)).map(
    (rule) => rule.flag,
  );
}

/** 根據總分和信心度判定建議 */
export function determineVerdict(
  total: number,
  dimensions: FitScore["dimensions"],
  thresholds = FIT_THRESHOLDS,
): FitVerdict {
  const lowCount = Object.values(dimensions).filter(
    (d) => d.confidence === "低",
  ).length;
  if (lowCount >= 3) return "資料不足";

  if (total >= thresholds.recommend) return "建議投標";
  if (total >= thresholds.evaluate) return "值得評估";
  return "不建議";
}

/** 產生判斷理由 */
export function generateReasons(
  dimensions: FitScore["dimensions"],
): string[] {
  const reasons: string[] = [];

  const dimNames: Record<string, string> = {
    domain: "領域匹配",
    agency: "機關熟悉度",
    competition: "競爭環境",
    scale: "規模適合度",
    team: "團隊可用性",
  };

  const entries = Object.entries(dimensions) as [string, DimensionScore][];
  const sorted = [...entries].sort((a, b) => b[1].score - a[1].score);

  // 最強項
  const best = sorted[0];
  if (best[1].score >= 15) {
    reasons.push(`${dimNames[best[0]]}是主要優勢（${best[1].evidence}）`);
  }

  // 最弱項
  const worst = sorted[sorted.length - 1];
  if (worst[1].score <= 8) {
    reasons.push(`${dimNames[worst[0]]}是主要風險（${worst[1].evidence}）`);
  }

  // 總評
  const total = entries.reduce((sum, [, d]) => sum + d.score, 0);
  if (total >= 70) {
    reasons.push("整體條件有利，建議積極準備");
  } else if (total >= 50) {
    reasons.push("條件中等，需評估投入資源是否值得");
  } else {
    reasons.push("整體條件不利，建議優先考慮其他案件");
  }

  return reasons;
}

// ====== 主函式 ======

/**
 * 計算完整適配度評分
 *
 * 各維度 0-20 分，以權重加權後正規化為 0-100 總分。
 * 預設五維等權（各 20），調整權重後仍自動正規化。
 */
export function calculateFitScore(
  input: FitScoreInput,
  weights: FitWeights = DEFAULT_FIT_WEIGHTS,
): FitScore {
  const { caseName, agency, budget, intelligence, kb } = input;

  const domain = scoreDomain(caseName, kb["00B"]);
  const agencyDim = scoreAgency(agency, intelligence.selfAnalysis);
  const competition = scoreCompetition(
    intelligence.marketTrend,
    intelligence.tenderSummary?.bidderCount ?? null,
  );
  const scale = scoreScale(budget, kb["00B"]);
  const team = scoreTeam(caseName, kb["00A"]);

  const dimensions = {
    domain,
    agency: agencyDim,
    competition,
    scale,
    team,
  };

  // 加權平均：每維 0-20，加權後正規化到 0-100
  const totalWeight =
    weights.domain +
    weights.agency +
    weights.competition +
    weights.scale +
    weights.team;

  const weightedSum =
    domain.score * weights.domain +
    agencyDim.score * weights.agency +
    competition.score * weights.competition +
    scale.score * weights.scale +
    team.score * weights.team;

  const total =
    totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 5) : 0;

  const verdict = determineVerdict(total, dimensions);
  const reasons = generateReasons(dimensions);
  const redFlags = detectRedFlags(caseName);

  return { total, dimensions, verdict, reasons, redFlags };
}
