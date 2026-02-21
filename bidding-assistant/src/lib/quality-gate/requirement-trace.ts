/** M04 品質閘門 — 閘門 2：需求追溯 */

import { REQUIREMENT_TRACE_DEFAULTS } from "./constants";
import type {
  CoverageResult,
  Requirement,
  RequirementMatrix,
  RequirementTraceIssue,
  RequirementTraceOptions,
  RequirementTraceResult,
} from "./types";

const DEFAULT_OPTIONS: Required<RequirementTraceOptions> = {
  coverageThreshold: REQUIREMENT_TRACE_DEFAULTS.coverageThreshold,
  partialThreshold: REQUIREMENT_TRACE_DEFAULTS.partialThreshold,
};

/**
 * 對建議書文字執行閘門 2 需求追溯。
 *
 * 將文字拆成段落，比對每個招標需求是否在段落中被回應。
 * 沒有需求清單時不應呼叫此函式（呼叫端判斷）。
 *
 * @param text - 建議書全文
 * @param requirements - 招標需求清單
 * @param options - 追溯選項
 */
export function traceRequirements(
  text: string,
  requirements: Requirement[],
  options: RequirementTraceOptions = {},
): RequirementTraceResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  if (!requirements.length) {
    return emptyResult();
  }

  const paragraphs = splitIntoParagraphs(text);
  const coverage = requirements.map((req) =>
    evaluateCoverage(req, paragraphs, opts),
  );

  const matrix = buildMatrix(requirements, coverage);
  const score = calcScore(matrix);
  const issues = buildIssues(matrix);

  return { matrix, score, issues };
}

// ── 段落分割 ────────────────────────────────────────────

/**
 * 將文字分割為段落（以換行或連續句號分割）。
 * 每個段落作為一個覆蓋偵測單位。
 */
export function splitIntoParagraphs(text: string): string[] {
  if (!text.trim()) return [];
  return text
    .split(/\n{2,}|\r?\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

// ── 覆蓋評估 ────────────────────────────────────────────

/**
 * 從需求描述中提取用於比對的關鍵詞。
 * 中文：提取 2-4 字元 n-gram，過濾常見虛詞。
 */
export function extractRequirementKeywords(description: string): string[] {
  const cleaned = description.replace(
    /[，。！？、「」『』【】《》〈〉…—\-_:：;；,!?."'()（）\s\d]/g,
    "",
  );
  const keywords = new Set<string>();
  for (let n = 2; n <= 4; n++) {
    for (let i = 0; i <= cleaned.length - n; i++) {
      const gram = cleaned.slice(i, i + n);
      if (!REQ_STOPWORDS.has(gram)) {
        keywords.add(gram);
      }
    }
  }
  return Array.from(keywords);
}

/**
 * 評估單一需求在段落中的覆蓋程度。
 * 計算方式：需求的關鍵詞在段落中出現的比例。
 */
function evaluateCoverage(
  req: Requirement,
  paragraphs: string[],
  opts: Required<RequirementTraceOptions>,
): CoverageResult {
  const keywords = extractRequirementKeywords(req.description);
  if (keywords.length === 0) {
    return {
      requirementId: req.id,
      status: "missing",
      coveredBy: [],
      matchScore: 0,
      gap: "需求描述無法提取有效關鍵詞",
    };
  }

  let bestScore = 0;
  const coveredBy: string[] = [];

  for (const para of paragraphs) {
    const matchCount = keywords.filter((kw) => para.includes(kw)).length;
    const score = matchCount / keywords.length;
    if (score > 0) {
      coveredBy.push(para.slice(0, 50));
    }
    if (score > bestScore) {
      bestScore = score;
    }
  }

  let status: CoverageResult["status"];
  let gap: string | null = null;

  if (bestScore >= opts.coverageThreshold) {
    status = "covered";
  } else if (bestScore >= opts.partialThreshold) {
    status = "partial";
    const missingKws = keywords.filter(
      (kw) => !paragraphs.some((p) => p.includes(kw)),
    );
    gap = `部分覆蓋（缺少：${missingKws.slice(0, 3).join("、")}）`;
  } else {
    status = "missing";
    gap = `「${req.description.slice(0, 30)}」在建議書中未找到相關回應`;
  }

  return {
    requirementId: req.id,
    status,
    coveredBy: coveredBy.slice(0, 3),
    matchScore: bestScore,
    gap,
  };
}

// ── 結果建構 ────────────────────────────────────────────

function buildMatrix(
  requirements: Requirement[],
  coverage: CoverageResult[],
): RequirementMatrix {
  const uncoveredCount = coverage.filter((c) => c.status === "missing").length;
  const total = requirements.length;

  // 覆蓋率：covered=1, partial=0.5, missing=0
  const coveredWeight = coverage.reduce((sum, c) => {
    if (c.status === "covered") return sum + 1;
    if (c.status === "partial") return sum + 0.5;
    return sum;
  }, 0);

  const coverageRate = total > 0 ? (coveredWeight / total) * 100 : 0;

  return { requirements, coverage, uncoveredCount, coverageRate };
}

/**
 * 計算閘門 2 分數（0-100）。
 * 有權重時按權重加權；無權重時等權。
 */
function calcScore(matrix: RequirementMatrix): number {
  const { requirements, coverage } = matrix;
  if (requirements.length === 0) return 100;

  const hasWeights = requirements.some((r) => r.weight !== null && r.weight > 0);

  if (hasWeights) {
    let totalWeight = 0;
    let weightedCoverage = 0;

    for (let i = 0; i < requirements.length; i++) {
      const w = requirements[i].weight ?? 0;
      totalWeight += w;
      if (coverage[i].status === "covered") weightedCoverage += w;
      else if (coverage[i].status === "partial") weightedCoverage += w * 0.5;
    }

    return totalWeight > 0
      ? Math.round((weightedCoverage / totalWeight) * 100)
      : Math.round(matrix.coverageRate);
  }

  return Math.round(matrix.coverageRate);
}

function buildIssues(matrix: RequirementMatrix): RequirementTraceIssue[] {
  const issues: RequirementTraceIssue[] = [];
  const { requirements, coverage, coverageRate } = matrix;

  // 未覆蓋的高權重需求 → error
  for (let i = 0; i < coverage.length; i++) {
    const c = coverage[i];
    const req = requirements[i];

    if (c.status === "missing") {
      const isHighWeight = req.weight !== null && req.weight >= 20;
      issues.push({
        severity: isHighWeight ? "error" : "warning",
        type: "missing_requirement",
        message: `${req.source}「${req.description.slice(0, 40)}」未覆蓋`,
        context: req.id,
      });
    } else if (c.status === "partial") {
      issues.push({
        severity: "warning",
        type: "partial_coverage",
        message: c.gap ?? `${req.id} 部分覆蓋`,
        context: req.id,
      });
    }
  }

  // 整體覆蓋率過低 → error
  if (coverageRate < 50 && requirements.length > 0) {
    issues.push({
      severity: "error",
      type: "low_coverage",
      message: `整體覆蓋率僅 ${Math.round(coverageRate)}%，低於 50% 門檻`,
      context: `${matrix.uncoveredCount}/${requirements.length} 項未覆蓋`,
    });
  }

  return issues;
}

function emptyResult(): RequirementTraceResult {
  return {
    matrix: {
      requirements: [],
      coverage: [],
      uncoveredCount: 0,
      coverageRate: 0,
    },
    score: 100,
    issues: [],
  };
}

// ── 停用詞 ──────────────────────────────────────────────

const REQ_STOPWORDS = new Set([
  "我們", "他們", "這個", "那個", "一個", "這些", "那些",
  "因此", "所以", "然而", "但是", "而且", "以及", "如果",
  "可以", "能夠", "應該", "需要", "進行", "提供", "採用",
  "相關", "包括", "具有", "透過", "針對", "有效", "確保",
  "必須", "規定", "辦理", "依據", "事項", "方式",
]);
