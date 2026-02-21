// ====== M03 戰略分析引擎：知識庫匹配器 ======

import type {
  KBMatchResult,
  KBMatchEntry,
  KnowledgeBaseData,
  KBEntry00A,
  KBEntry00B,
  KBEntry00C,
  KBEntry00D,
  KBEntry00E,
} from "./types";
import { textMatch, extractKeywords } from "./helpers";

/** 匹配門檻（0-1，越高越嚴格） */
const MATCH_THRESHOLD = 0.4;

/**
 * 從五個知識庫中找出與特定標案最相關的素材。
 * 匹配策略：
 * - 關鍵字匹配：案名關鍵字 vs 各庫 entry 的文字欄位
 * - 機關匹配：機關名稱 vs 00B 的 client 欄位
 * - 類型匹配：案件類型 vs 00C 的 applicableType
 * - 結果匹配：00E 中同機關/同類型案件的檢討
 */
export function matchKB(
  tenderTitle: string,
  tenderKeywords: string[],
  agencyName: string,
  kb: KnowledgeBaseData,
): KBMatchResult {
  const keywords = tenderKeywords.length > 0 ? tenderKeywords : extractKeywords(tenderTitle);

  return {
    team: matchTeam(keywords, kb["00A"]),
    portfolio: matchPortfolio(keywords, agencyName, kb["00B"]),
    templates: matchTemplates(keywords, tenderTitle, kb["00C"]),
    risks: matchRisks(keywords, kb["00D"]),
    reviews: matchReviews(keywords, agencyName, kb["00E"]),
  };
}

/** 匹配 00A 團隊成員 */
function matchTeam(keywords: string[], entries: KBEntry00A[]): KBMatchEntry<KBEntry00A>[] {
  const results: KBMatchEntry<KBEntry00A>[] = [];

  for (const member of entries) {
    if (member.entryStatus !== "active" || member.status === "已離職") continue;

    const matchReasons: string[] = [];

    for (const kw of keywords) {
      // 認證匹配
      if (member.certifications.some((c) => textMatch(c.name, kw) > MATCH_THRESHOLD)) {
        matchReasons.push(`認證含「${kw}」`);
      }
      // 經歷匹配
      if (member.experiences.some((e) => textMatch(e.description, kw) > MATCH_THRESHOLD / 2)) {
        matchReasons.push(`經歷含「${kw}」`);
      }
      // 專案匹配
      if (member.projects.some((p) => textMatch(p.projectName, kw) > MATCH_THRESHOLD)) {
        matchReasons.push(`專案含「${kw}」`);
      }
      // 授權角色匹配
      if (member.authorizedRoles.some((r) => textMatch(r, kw) > MATCH_THRESHOLD)) {
        matchReasons.push(`授權角色含「${kw}」`);
      }
    }

    if (matchReasons.length > 0) {
      results.push({
        entry: member,
        relevance: [...new Set(matchReasons)].join("、"),
      });
    }
  }

  // 按匹配原因數量排序
  return results.sort((a, b) =>
    b.relevance.split("、").length - a.relevance.split("、").length,
  );
}

/** 匹配 00B 實績 */
function matchPortfolio(
  keywords: string[],
  agencyName: string,
  entries: KBEntry00B[],
): KBMatchEntry<KBEntry00B>[] {
  const results: KBMatchEntry<KBEntry00B>[] = [];

  for (const proj of entries) {
    if (proj.entryStatus !== "active") continue;

    const matchReasons: string[] = [];

    // 機關匹配
    if (agencyName && textMatch(proj.client, agencyName) > MATCH_THRESHOLD) {
      matchReasons.push(`同機關「${proj.client}」`);
    }

    // 關鍵字匹配案名
    for (const kw of keywords) {
      if (textMatch(proj.projectName, kw) > MATCH_THRESHOLD) {
        matchReasons.push(`案名含「${kw}」`);
      }
      // 工作項目匹配
      if (proj.workItems.some((w) => textMatch(w.item, kw) > MATCH_THRESHOLD || textMatch(w.description, kw) > MATCH_THRESHOLD / 2)) {
        matchReasons.push(`工作項目含「${kw}」`);
      }
    }

    if (matchReasons.length > 0) {
      results.push({
        entry: proj,
        relevance: [...new Set(matchReasons)].join("、"),
      });
    }
  }

  return results.sort((a, b) =>
    b.relevance.split("、").length - a.relevance.split("、").length,
  );
}

/** 匹配 00C 時程範本 */
function matchTemplates(
  keywords: string[],
  tenderTitle: string,
  entries: KBEntry00C[],
): KBMatchEntry<KBEntry00C>[] {
  const results: KBMatchEntry<KBEntry00C>[] = [];

  for (const template of entries) {
    if (template.entryStatus !== "active") continue;

    const matchReasons: string[] = [];

    // applicableType 匹配
    if (textMatch(template.applicableType, tenderTitle) > MATCH_THRESHOLD / 2) {
      matchReasons.push(`適用類型「${template.applicableType}」`);
    }
    for (const kw of keywords) {
      if (textMatch(template.applicableType, kw) > MATCH_THRESHOLD) {
        matchReasons.push(`類型含「${kw}」`);
      }
      if (textMatch(template.templateName, kw) > MATCH_THRESHOLD) {
        matchReasons.push(`範本名含「${kw}」`);
      }
    }

    if (matchReasons.length > 0) {
      results.push({
        entry: template,
        relevance: [...new Set(matchReasons)].join("、"),
      });
    }
  }

  return results;
}

/** 匹配 00D 應變 SOP */
function matchRisks(keywords: string[], entries: KBEntry00D[]): KBMatchEntry<KBEntry00D>[] {
  const results: KBMatchEntry<KBEntry00D>[] = [];

  for (const risk of entries) {
    if (risk.entryStatus !== "active") continue;

    const matchReasons: string[] = [];

    for (const kw of keywords) {
      if (textMatch(risk.riskName, kw) > MATCH_THRESHOLD) {
        matchReasons.push(`風險名含「${kw}」`);
      }
      if (textMatch(risk.prevention, kw) > MATCH_THRESHOLD / 2) {
        matchReasons.push(`預防措施含「${kw}」`);
      }
    }

    if (matchReasons.length > 0) {
      results.push({
        entry: risk,
        relevance: [...new Set(matchReasons)].join("、"),
      });
    }
  }

  return results;
}

/** 匹配 00E 案後檢討 */
function matchReviews(
  keywords: string[],
  agencyName: string,
  entries: KBEntry00E[],
): KBMatchEntry<KBEntry00E>[] {
  const results: KBMatchEntry<KBEntry00E>[] = [];

  for (const review of entries) {
    if (review.entryStatus !== "active") continue;

    const matchReasons: string[] = [];

    // 案名匹配（包含機關名稱）
    if (agencyName && textMatch(review.projectName, agencyName) > MATCH_THRESHOLD) {
      matchReasons.push(`同機關案件`);
    }

    for (const kw of keywords) {
      if (textMatch(review.projectName, kw) > MATCH_THRESHOLD) {
        matchReasons.push(`案名含「${kw}」`);
      }
      if (textMatch(review.bidPhaseReview, kw) > MATCH_THRESHOLD / 2) {
        matchReasons.push(`投標檢討含「${kw}」`);
      }
    }

    if (matchReasons.length > 0) {
      results.push({
        entry: review,
        relevance: [...new Set(matchReasons)].join("、"),
      });
    }
  }

  return results;
}
