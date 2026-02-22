/** M04 品質閘門 — 閘門 1：事實查核 */

import { HALLUCINATION_PATTERNS, SCORE_WEIGHTS } from "./constants";
import { splitIntoSentences, matchSentenceToKB } from "./helpers";
import type {
  FactCheckOptions,
  FactCheckResult,
  FactCheckIssue,
  HallucinationFlag,
  KBEntry,
  SourceAnnotation,
} from "./types";

const DEFAULT_OPTIONS: Required<FactCheckOptions> = {
  unverifiedThreshold: 3,
  hallucinationThreshold: 2,
  skipSourceTrace: false,
};

/**
 * 對文字執行閘門 1 事實查核。
 *
 * @param text - 待查核的建議書文字
 * @param kbEntries - 知識庫條目（用於來源比對），空陣列表示無 KB 可用
 * @param options - 查核選項
 */
export function checkFacts(
  text: string,
  kbEntries: KBEntry[] = [],
  options: FactCheckOptions = {},
): FactCheckResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  if (!text.trim()) {
    return emptyResult();
  }

  const sentences = splitIntoSentences(text);
  const annotations: SourceAnnotation[] = [];

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const hallucinations = detectHallucinations(sentence);

    let source = null;
    if (!opts.skipSourceTrace && kbEntries.length > 0) {
      source = matchSentenceToKB(sentence, kbEntries);
    }

    const confidence = deriveConfidence(source, hallucinations);

    annotations.push({
      sentenceIndex: i,
      claim: sentence,
      source,
      hallucinations,
      confidence,
    });
  }

  return buildResult(annotations, opts);
}

/**
 * 對單一句子執行幻覺模式偵測。
 * 這個函式是純函式，不依賴任何外部狀態。
 */
export function detectHallucinations(sentence: string): HallucinationFlag[] {
  const flags: HallucinationFlag[] = [];

  for (const { name, pattern, message } of HALLUCINATION_PATTERNS) {
    const match = pattern.exec(sentence);
    if (match) {
      flags.push({
        patternName: name,
        matchedText: match[0],
        message,
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      });
    }
  }

  return flags;
}

// ── 私有輔助 ────────────────────────────────────────────

function deriveConfidence(
  source: SourceAnnotation["source"],
  hallucinations: HallucinationFlag[],
): SourceAnnotation["confidence"] {
  if (hallucinations.length > 0) return "unverified"; // 有幻覺旗標一律 unverified
  if (!source) return "unverified";
  // matchSentenceToKB 閾值為 LCS ≥30%；目前保守回 partial，verified 分支留待 Phase 2 實作
  return "partial";
}

function buildResult(
  annotations: SourceAnnotation[],
  opts: Required<FactCheckOptions>,
): FactCheckResult {
  const verifiedCount = annotations.filter((a) => a.confidence === "verified").length;
  const partialCount = annotations.filter((a) => a.confidence === "partial").length;
  const unverifiedCount = annotations.filter((a) => a.confidence === "unverified").length;
  const hallucinationCount = annotations.reduce(
    (sum, a) => sum + a.hallucinations.length,
    0,
  );

  const score = calcScore(annotations.length, unverifiedCount, hallucinationCount);
  const issues = buildIssues(annotations, opts);

  return {
    annotations,
    verifiedCount,
    partialCount,
    unverifiedCount,
    hallucinationCount,
    score,
    issues,
  };
}

function calcScore(
  total: number,
  unverified: number,
  hallucinations: number,
): number {
  if (total === 0) return SCORE_WEIGHTS.baseScore;
  const raw =
    SCORE_WEIGHTS.baseScore -
    unverified * SCORE_WEIGHTS.unverifiedPenalty -
    hallucinations * SCORE_WEIGHTS.hallucinationPenalty;
  return Math.max(SCORE_WEIGHTS.minScore, Math.min(SCORE_WEIGHTS.maxScore, raw));
}

function buildIssues(
  annotations: SourceAnnotation[],
  opts: Required<FactCheckOptions>,
): FactCheckIssue[] {
  const issues: FactCheckIssue[] = [];

  // 幻覺旗標彙總
  for (const annotation of annotations) {
    for (const flag of annotation.hallucinations) {
      issues.push({
        severity: "warning",
        type: "hallucination",
        message: flag.message,
        context: flag.matchedText,
      });
    }
  }

  // 無依據宣稱超過閾值 → error
  const unverifiedSentences = annotations
    .filter((a) => a.confidence === "unverified" && a.hallucinations.length === 0)
    .slice(0, 3); // 最多顯示 3 個例子

  if (unverifiedSentences.length >= opts.unverifiedThreshold) {
    issues.push({
      severity: "error",
      type: "unverified_claim",
      message: `有 ${annotations.filter((a) => a.confidence === "unverified").length} 處宣稱無法追溯到知識庫來源`,
      context: unverifiedSentences.map((a) => a.claim.slice(0, 40)).join(" / "),
    });
  }

  return issues;
}

function emptyResult(): FactCheckResult {
  return {
    annotations: [],
    verifiedCount: 0,
    partialCount: 0,
    unverifiedCount: 0,
    hallucinationCount: 0,
    score: SCORE_WEIGHTS.baseScore,
    issues: [],
  };
}
