import type {
  KnowledgeBaseData,
  KBEntry00A,
  KBEntry00B,
  KBEntry00C,
  KBEntry00D,
  KBEntry00E,
} from "@/lib/knowledge-base/types";
import type {
  KBPlaceholder,
  KBValidationResult,
  BrandVars,
  KBPlaceholderType,
} from "./types";

// ── 正則表達式 ────────────────────────────────────────────────

const KB_RE = /\{\{kb:(00[A-E]):([^}]+)\}\}/g;
const BRAND_RE = /\{\{(company|project|date):([^}]+)\}\}/g;

// ── 解析 ──────────────────────────────────────────────────────

/** 解析內容中的所有佔位符（KB 類和品牌類） */
export function findPlaceholders(content: string): KBPlaceholder[] {
  const results: KBPlaceholder[] = [];

  for (const m of content.matchAll(KB_RE)) {
    const [raw, category, selectorFull] = m;
    const parts = selectorFull.split(":");
    const selector = parts[0];
    const limitStr = parts[1];
    const limit = limitStr ? parseInt(limitStr, 10) : undefined;
    results.push({
      raw,
      type: "kb",
      category: category as KBPlaceholder["category"],
      selector,
      ...(limit !== undefined && !isNaN(limit) && { limit }),
    });
  }

  for (const m of content.matchAll(BRAND_RE)) {
    const [raw, ns, selector] = m;
    const type = ns as KBPlaceholderType;
    results.push({ raw, type, selector });
  }

  return results;
}

/** 驗證佔位符是否都能被解析 */
export function validate(
  placeholders: KBPlaceholder[],
  kbData: KnowledgeBaseData
): KBValidationResult {
  const unresolved: KBPlaceholder[] = [];

  for (const p of placeholders) {
    if (p.type !== "kb" || !p.category) continue;
    if (resolveKB(p, kbData) === null) {
      unresolved.push(p);
    }
  }

  return { valid: unresolved.length === 0, unresolved };
}

// ── 替換 ──────────────────────────────────────────────────────

/**
 * 將內容中的所有佔位符替換為實際資料。
 * 找不到的佔位符原樣保留（不刪除），方便用戶識別。
 */
export function injectPlaceholders(
  content: string,
  kbData: KnowledgeBaseData,
  brandVars: BrandVars
): string {
  let result = content;

  // KB 佔位符
  result = result.replace(KB_RE, (raw, category, selectorFull) => {
    const parts = selectorFull.split(":");
    const selector = parts[0];
    const limitStr = parts[1];
    const limit = limitStr ? parseInt(limitStr, 10) : undefined;
    const p: KBPlaceholder = {
      raw,
      type: "kb",
      category: category as KBPlaceholder["category"],
      selector,
      ...(limit !== undefined && !isNaN(limit) && { limit }),
    };
    return resolveKB(p, kbData) ?? raw;
  });

  // 品牌 / 日期佔位符
  result = result.replace(BRAND_RE, (raw, ns, key) => {
    if (ns === "company") {
      if (key === "name") return brandVars.companyName ?? raw;
      if (key === "taxId") return brandVars.companyTaxId ?? raw;
    }
    if (ns === "project" && key === "name") return brandVars.projectName ?? raw;
    if (ns === "date" && key === "roc") return toRocDate(new Date());
    return raw;
  });

  return result;
}

// ── KB 解析邏輯 ───────────────────────────────────────────────

function resolveKB(p: KBPlaceholder, kbData: KnowledgeBaseData): string | null {
  if (!p.category) return null;

  switch (p.category) {
    case "00A": {
      const active = (kbData["00A"] as KBEntry00A[]).filter((e) => e.entryStatus === "active");
      return resolve00A(p.selector, active);
    }
    case "00B": {
      const active = (kbData["00B"] as KBEntry00B[]).filter((e) => e.entryStatus === "active");
      return resolve00B(p.selector, p.limit, active);
    }
    case "00C": {
      const active = (kbData["00C"] as KBEntry00C[]).filter((e) => e.entryStatus === "active");
      return resolve00C(p.selector, active);
    }
    case "00D": {
      const active = (kbData["00D"] as KBEntry00D[]).filter((e) => e.entryStatus === "active");
      return resolve00D(p.selector, active);
    }
    case "00E": {
      const active = (kbData["00E"] as KBEntry00E[]).filter((e) => e.entryStatus === "active");
      return resolve00E(p.selector, active);
    }
    default:
      return null;
  }
}

// ── 各知識庫格式化 ────────────────────────────────────────────

function resolve00A(selector: string, entries: KBEntry00A[]): string | null {
  const lower = selector.toLowerCase();
  const matches = entries.filter(
    (e) =>
      e.authorizedRoles?.some((r) => r.toLowerCase().includes(lower)) ||
      e.title?.toLowerCase().includes(lower) ||
      e.name?.toLowerCase().includes(lower)
  );
  if (!matches.length) return null;

  return matches
    .map((e) => {
      const lines = [`**${e.name}**（${e.title}）`];
      if (e.certifications?.length) {
        lines.push("證照：" + e.certifications.map((c) => c.name).join("、"));
      }
      if (e.experiences?.length) {
        lines.push("主要經歷：");
        for (const exp of e.experiences.slice(0, 2)) {
          lines.push(`- ${exp.period}｜${exp.organization}｜${exp.title}`);
        }
      }
      return lines.join("\n");
    })
    .join("\n\n");
}

function resolve00B(
  selector: string,
  limit: number | undefined,
  entries: KBEntry00B[]
): string | null {
  let matches: typeof entries;

  if (selector.toLowerCase() === "recent") {
    matches = [...entries]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, limit ?? 3);
  } else {
    const lower = selector.toLowerCase();
    matches = entries.filter(
      (e) =>
        e.projectName?.toLowerCase().includes(lower) ||
        e.client?.toLowerCase().includes(lower)
    );
  }

  if (!matches.length) return null;

  return matches
    .map((e) => {
      const lines = [`**${e.projectName}**（${e.client}，${e.contractAmount}）`];
      if (e.outcomes) lines.push(`成果：${e.outcomes}`);
      return lines.join("\n");
    })
    .join("\n\n");
}

function resolve00C(selector: string, entries: KBEntry00C[]): string | null {
  const lower = selector.toLowerCase();
  const match = entries.find(
    (e) =>
      e.templateName?.toLowerCase().includes(lower) ||
      e.applicableType?.toLowerCase().includes(lower)
  );
  if (!match) return null;

  const lines = [`**${match.templateName}**（${match.applicableType}，${match.durationRange}）`];
  for (const phase of match.phases ?? []) {
    lines.push(`- ${phase.phase}（${phase.duration}）：${phase.deliverables}`);
  }
  return lines.join("\n");
}

function resolve00D(selector: string, entries: KBEntry00D[]): string | null {
  const lower = selector.toLowerCase();
  const match = entries.find((e) => e.riskName?.toLowerCase().includes(lower));
  if (!match) return null;

  const lines = [`**${match.riskName}**（風險等級：${match.riskLevel}）`];
  lines.push(`預防措施：${match.prevention}`);
  if (match.responseSteps?.length) {
    lines.push("應變步驟：");
    for (const step of match.responseSteps) {
      lines.push(`${step.step}. ${step.action}（負責：${step.responsible}）`);
    }
  }
  return lines.join("\n");
}

function resolve00E(selector: string, entries: KBEntry00E[]): string | null {
  const lower = selector.toLowerCase();
  const match = entries.find((e) => e.projectName?.toLowerCase().includes(lower));
  if (!match) return null;
  return `**${match.projectName}**（${match.result}，${match.year}年）\n${match.oneSentenceSummary}`;
}

// ── 工具函式 ──────────────────────────────────────────────────

function toRocDate(date: Date): string {
  const y = date.getFullYear() - 1911;
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `民國 ${y} 年 ${m} 月 ${d} 日`;
}
