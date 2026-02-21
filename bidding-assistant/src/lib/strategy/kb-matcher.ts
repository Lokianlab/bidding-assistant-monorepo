// ====== M03 戰略分析引擎：知識庫匹配 ======
// 根據案名和機關，從五大知識庫中找出相關條目

import type {
  KnowledgeBaseData,
  KBEntry00A,
  KBEntry00B,
  KBEntry00C,
  KBEntry00D,
  KBEntry00E,
} from "@/lib/knowledge-base/types";
import type { KBMatchResult } from "./types";
import { extractKeywords, keywordOverlap } from "./helpers";

/**
 * 主匹配函式：從案名和機關找出五大知識庫中的相關條目
 */
export function matchKB(
  caseName: string,
  agency: string,
  kb: KnowledgeBaseData,
): KBMatchResult {
  const { categories, terms } = extractKeywords(caseName);

  return {
    team: matchTeam(terms, categories, kb["00A"]),
    portfolio: matchPortfolio(caseName, agency, kb["00B"]),
    templates: matchTemplates(categories, kb["00C"]),
    risks: matchRisks(categories, kb["00D"]),
    reviews: matchReviews(caseName, agency, kb["00E"]),
  };
}

// ====== 各庫匹配邏輯 ======

/** 00A 團隊：比對成員經驗、證照、專案 */
function matchTeam(
  terms: string[],
  categories: string[],
  team: KBEntry00A[],
): { entry: KBEntry00A; relevance: string }[] {
  return team
    .filter((m) => m.entryStatus === "active" && m.status === "在職")
    .map((member) => {
      const text = [
        member.title,
        member.additionalCapabilities,
        ...member.experiences.map((e) => `${e.description} ${e.title}`),
        ...member.certifications.map((c) => c.name),
        ...member.projects.map((p) => `${p.projectName} ${p.role}`),
      ].join(" ");

      const matchedTerms = terms.filter((t) => text.includes(t));
      const matchedCats = categories.filter((c) => text.includes(c));

      if (matchedTerms.length === 0 && matchedCats.length === 0) return null;

      const relevance =
        matchedTerms.length > 0
          ? `經驗涵蓋：${matchedTerms.join("、")}`
          : `相關領域：${matchedCats.join("、")}`;

      return { entry: member, relevance };
    })
    .filter(
      (m): m is { entry: KBEntry00A; relevance: string } => m !== null,
    );
}

/** 00B 實績：比對案名關鍵字重疊 + 同機關 */
function matchPortfolio(
  caseName: string,
  agency: string,
  portfolio: KBEntry00B[],
): { entry: KBEntry00B; relevance: string }[] {
  return portfolio
    .filter((p) => p.entryStatus === "active")
    .map((project) => {
      const overlap = keywordOverlap(caseName, project.projectName);
      const sameAgency =
        project.client.includes(agency) || agency.includes(project.client);

      if (overlap === 0 && !sameAgency) return null;

      const parts: string[] = [];
      if (overlap > 0)
        parts.push(`案名相似度 ${(overlap * 100).toFixed(0)}%`);
      if (sameAgency) parts.push(`同機關「${project.client}」`);

      return { entry: project, relevance: parts.join("、") };
    })
    .filter(
      (p): p is { entry: KBEntry00B; relevance: string } => p !== null,
    );
}

/** 00C 範本：比對適用類型 */
function matchTemplates(
  categories: string[],
  templates: KBEntry00C[],
): { entry: KBEntry00C; relevance: string }[] {
  return templates
    .filter((t) => t.entryStatus === "active")
    .map((template) => {
      const matched = categories.filter(
        (c) =>
          template.applicableType.includes(c) ||
          template.templateName.includes(c),
      );
      if (matched.length === 0) return null;
      return {
        entry: template,
        relevance: `適用類型：${matched.join("、")}`,
      };
    })
    .filter(
      (t): t is { entry: KBEntry00C; relevance: string } => t !== null,
    );
}

/** 00D 風險 SOP：比對風險名稱與案件類別 */
function matchRisks(
  categories: string[],
  risks: KBEntry00D[],
): { entry: KBEntry00D; relevance: string }[] {
  return risks
    .filter((r) => r.entryStatus === "active")
    .map((risk) => {
      // 用類別比對風險名稱（風險名稱通常包含領域關鍵字）
      const nameMatch = categories.some((c) => risk.riskName.includes(c));
      // 用風險名稱的詞語比對類別
      const riskWords = risk.riskName.split(/[\s/,、，]/);
      const wordMatch = riskWords.some(
        (w) =>
          w.length >= 2 && categories.some((c) => c.includes(w) || w.includes(c)),
      );

      if (!nameMatch && !wordMatch) return null;
      return {
        entry: risk,
        relevance: `相關風險：${risk.riskName}（${risk.riskLevel}）`,
      };
    })
    .filter(
      (r): r is { entry: KBEntry00D; relevance: string } => r !== null,
    );
}

/** 00E 案後檢討：比對案名關鍵字 + 同機關 */
function matchReviews(
  caseName: string,
  agency: string,
  reviews: KBEntry00E[],
): { entry: KBEntry00E; relevance: string }[] {
  return reviews
    .filter((r) => r.entryStatus === "active")
    .map((review) => {
      const overlap = keywordOverlap(caseName, review.projectName);
      // 00E 沒有 client 欄位，用 projectName 碰撞機關名
      const agencyMatch = review.projectName.includes(agency);

      if (overlap === 0 && !agencyMatch) return null;

      return {
        entry: review,
        relevance: `過往案例「${review.projectName}」（${review.result}）`,
      };
    })
    .filter(
      (r): r is { entry: KBEntry00E; relevance: string } => r !== null,
    );
}
