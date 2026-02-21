// ====== M03 戰略分析引擎：共用輔助函式 ======

import type { DimensionKey, FitWeights, FitVerdict, FitScore, VerdictThresholds, Confidence } from "./types";
import {
  BUSINESS_TYPE_VOCABULARY,
  TITLE_DELIMITERS,
  LOW_CONFIDENCE_RATIO_THRESHOLD,
  DIMENSION_MAX_SCORE,
} from "./constants";

/**
 * 從案名提取關鍵字。
 * 1. 先匹配業務類型詞彙表中的完整詞
 * 2. 再按分隔符拆分剩餘文字
 * 3. 去重、過濾太短的片段（< 2 字元）
 */
export function extractKeywords(title: string): string[] {
  if (!title || !title.trim()) return [];

  const matched: string[] = [];
  let remaining = title;

  // 先抽出業務類型詞彙（長詞優先）
  const sortedVocab = [...BUSINESS_TYPE_VOCABULARY].sort((a, b) => b.length - a.length);
  for (const word of sortedVocab) {
    if (remaining.includes(word)) {
      matched.push(word);
      remaining = remaining.replace(word, " ");
    }
  }

  // 剩餘文字按分隔符拆分
  const segments = remaining.split(TITLE_DELIMITERS).filter(Boolean);
  for (const seg of segments) {
    const trimmed = seg.trim();
    if (trimmed.length >= 2) {
      matched.push(trimmed);
    }
  }

  // 去重（保持順序）
  return [...new Set(matched)];
}

/**
 * 簡易文字相似度（包含匹配）。
 * 回傳 0-1：a 包含 b 或 b 包含 a 時回傳 1，
 * 部分重疊時回傳重疊字元比例。
 */
export function textMatch(a: string, b: string): number {
  if (!a || !b) return 0;
  const la = a.toLowerCase();
  const lb = b.toLowerCase();
  if (la === lb) return 1;
  if (la.includes(lb) || lb.includes(la)) return 1;

  // 計算共有字元比例
  const shorter = la.length <= lb.length ? la : lb;
  const longer = la.length > lb.length ? la : lb;
  let matches = 0;
  for (const char of shorter) {
    if (longer.includes(char)) matches++;
  }
  return matches / longer.length;
}

/**
 * 歸一化權重使總和 = 100。
 * 全部為 0 時回傳均等權重。
 */
export function normalizeWeights(weights: FitWeights): FitWeights {
  const keys: DimensionKey[] = ["domain", "agency", "competition", "scale", "team"];
  const sum = keys.reduce((s, k) => s + Math.max(0, weights[k]), 0);

  if (sum === 0) {
    return { domain: 20, agency: 20, competition: 20, scale: 20, team: 20 };
  }

  const result = {} as FitWeights;
  for (const k of keys) {
    result[k] = (Math.max(0, weights[k]) / sum) * 100;
  }
  return result;
}

/**
 * 根據總分和維度信心判定 verdict。
 * 規則：
 * - >= recommend → 建議投標
 * - >= evaluate → 值得評估
 * - < evaluate → 不建議
 * - 任一低信心維度權重佔比 > 40% → 資料不足
 */
export function computeVerdict(
  total: number,
  dimensions: FitScore["dimensions"],
  thresholds: VerdictThresholds,
  weights: FitWeights,
): FitVerdict {
  // 先檢查資料不足
  const normalizedW = normalizeWeights(weights);
  const keys: DimensionKey[] = ["domain", "agency", "competition", "scale", "team"];
  const lowConfidenceWeight = keys
    .filter((k) => dimensions[k].confidence === "低")
    .reduce((s, k) => s + normalizedW[k], 0);

  if (lowConfidenceWeight / 100 > LOW_CONFIDENCE_RATIO_THRESHOLD) {
    return "資料不足";
  }

  if (total >= thresholds.recommend) return "建議投標";
  if (total >= thresholds.evaluate) return "值得評估";
  return "不建議";
}

/** 計算陣列中位數（空陣列回傳 0） */
export function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/** 計算四分位距（IQR），回傳 Q1, Q3, IQR */
export function iqr(arr: number[]): { q1: number; q3: number; iqr: number } {
  if (arr.length < 4) {
    // 資料太少時，用 min/max 作為 Q1/Q3
    const sorted = [...arr].sort((a, b) => a - b);
    const q1 = sorted[0] ?? 0;
    const q3 = sorted[sorted.length - 1] ?? 0;
    return { q1, q3, iqr: q3 - q1 };
  }
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const lower = sorted.slice(0, mid);
  const upper = sorted.length % 2 === 0 ? sorted.slice(mid) : sorted.slice(mid + 1);
  const q1 = median(lower);
  const q3 = median(upper);
  return { q1, q3, iqr: q3 - q1 };
}

/**
 * 將原始分數限制在 0 ~ max 範圍內，四捨五入到一位小數。
 */
export function clampScore(raw: number, max: number = DIMENSION_MAX_SCORE): number {
  return Math.round(Math.max(0, Math.min(max, raw)) * 10) / 10;
}

/**
 * 根據分數自動判定信心等級。
 * 有明確資料 → 高；部分資料 → 中；無資料/猜測 → 低。
 * 這是輔助用的，各維度函式可自行覆蓋。
 */
export function inferConfidence(hasData: boolean, dataQuality: "full" | "partial" | "none"): Confidence {
  if (!hasData || dataQuality === "none") return "低";
  if (dataQuality === "partial") return "中";
  return "高";
}

/**
 * 從 contractAmount 字串解析金額（數字）。
 * 支援「1,234,567」「1234567」「新台幣 1,234,567 元」等格式。
 * 解析失敗回傳 null。
 */
export function parseAmount(amount: string | null | undefined): number | null {
  if (!amount) return null;
  const cleaned = amount.replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}
