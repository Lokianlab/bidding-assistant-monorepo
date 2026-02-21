// ====== 知識庫工具函式 ======
// 純函式：markdown 生成、ID 產生、搜尋等

import type {
  KBId,
  KBEntry00A,
  KBEntry00B,
  KBEntry00C,
  KBEntry00D,
  KBEntry00E,
  KnowledgeBaseData,
} from "./types";

// ====== ID 產生 ======

/** 產生下一個流水號 ID */
export function generateNextId(
  existingIds: string[],
  prefix: string,
): string {
  // 從 "M-001", "M-002" 等提取數字部分
  const nums = existingIds
    .filter((id) => id.startsWith(prefix))
    .map((id) => {
      const numPart = id.slice(prefix.length);
      return parseInt(numPart, 10);
    })
    .filter((n) => !isNaN(n));

  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `${prefix}${String(next).padStart(3, "0")}`;
}

/** 產生年度序號 ID（00B 用）*/
export function generateProjectId(existingIds: string[]): string {
  const year = new Date().getFullYear();
  const prefix = `P-${year}-`;
  const nums = existingIds
    .filter((id) => id.startsWith(prefix))
    .map((id) => parseInt(id.slice(prefix.length), 10))
    .filter((n) => !isNaN(n));

  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `${prefix}${String(next).padStart(3, "0")}`;
}

// ====== Markdown 生成 ======

/** 00A：從資料庫條目生成 markdown */
function renderEntry00A(entry: KBEntry00A): string {
  const lines: string[] = [];
  lines.push(`### ${entry.id}｜${entry.name}`);
  lines.push("");
  lines.push("**基本資訊**");
  lines.push("");
  lines.push("| 欄位 | 內容 |");
  lines.push("|------|------|");
  lines.push(`| 職稱 | ${entry.title} |`);
  lines.push(`| 狀態 | ${entry.status} |`);
  lines.push(`| 公司授權可擔任角色 | ${entry.authorizedRoles.join("、")} |`);
  lines.push("");

  if (entry.education.length > 0) {
    lines.push("**學歷**");
    lines.push("");
    lines.push("| 學校 | 系所 | 學位 |");
    lines.push("|------|------|------|");
    for (const edu of entry.education) {
      lines.push(`| ${edu.school} | ${edu.department} | ${edu.degree} |`);
    }
    lines.push("");
  }

  if (entry.certifications.length > 0) {
    lines.push("**證照與認證**");
    lines.push("");
    lines.push("| 證照名稱 | 發證單位 | 有效期限 |");
    lines.push("|---------|---------|---------|");
    for (const cert of entry.certifications) {
      lines.push(`| ${cert.name} | ${cert.issuer} | ${cert.expiry} |`);
    }
    lines.push("");
  }

  if (entry.experiences.length > 0) {
    lines.push("**工作經歷**");
    lines.push("");
    lines.push("| 期間 | 機構 | 職稱 | 做了什麼（50-80字） |");
    lines.push("|------|------|------|-------------------|");
    for (const exp of entry.experiences) {
      lines.push(`| ${exp.period} | ${exp.organization} | ${exp.title} | ${exp.description} |`);
    }
    lines.push("");
  }

  if (entry.projects.length > 0) {
    lines.push("**專案經歷**");
    lines.push("");
    lines.push("| 角色 | 案名 | 業主 | 年度 | 成果 |");
    lines.push("|------|------|------|------|------|");
    for (const proj of entry.projects) {
      lines.push(`| ${proj.role} | ${proj.projectName} | ${proj.client} | ${proj.year} | ${proj.outcome} |`);
    }
    lines.push("");
  }

  if (entry.additionalCapabilities) {
    lines.push("**其他能力**");
    lines.push("");
    lines.push(entry.additionalCapabilities);
    lines.push("");
  }

  return lines.join("\n");
}

/** 00B：從資料庫條目生成 markdown */
function renderEntry00B(entry: KBEntry00B): string {
  const lines: string[] = [];
  lines.push(`### ${entry.id}`);
  lines.push("");
  lines.push("**基本資訊**");
  lines.push("");
  lines.push("| 欄位 | 內容 |");
  lines.push("|------|------|");
  lines.push(`| 案名 | ${entry.projectName} |`);
  lines.push(`| 委託機關 | ${entry.client} |`);
  lines.push(`| 決標金額 | ${entry.contractAmount} |`);
  lines.push(`| 履約期間 | ${entry.period} |`);
  lines.push(`| 承接主體 | ${entry.entity} |`);
  lines.push(`| 本公司角色 | ${entry.role} |`);
  lines.push(`| 結案狀態 | ${entry.completionStatus} |`);
  lines.push(`| 專案團隊 | ${entry.teamMembers} |`);
  lines.push("");

  if (entry.workItems.length > 0) {
    lines.push("**工作內容細項**");
    lines.push("");
    lines.push("| 工作項目 | 具體描述 |");
    lines.push("|---------|---------|");
    for (const item of entry.workItems) {
      lines.push(`| ${item.item} | ${item.description} |`);
    }
    lines.push("");
  }

  if (entry.outcomes) {
    lines.push("**成果數據**");
    lines.push("");
    lines.push(entry.outcomes);
    lines.push("");
  }

  if (entry.documentLinks) {
    lines.push("**文件連結**");
    lines.push("");
    lines.push(entry.documentLinks);
    lines.push("");
  }

  return lines.join("\n");
}

/** 00C：從資料庫條目生成 markdown */
function renderEntry00C(entry: KBEntry00C): string {
  const lines: string[] = [];
  lines.push(`### ${entry.id}｜${entry.templateName}`);
  lines.push("");
  lines.push("| 欄位 | 內容 |");
  lines.push("|------|------|");
  lines.push(`| 適用類型 | ${entry.applicableType} |`);
  lines.push(`| 預算範圍 | ${entry.budgetRange} |`);
  lines.push(`| 工期範圍 | ${entry.durationRange} |`);
  lines.push("");

  if (entry.phases.length > 0) {
    lines.push("**階段規劃**");
    lines.push("");
    lines.push("| 階段 | 工期 | 交付物 | 檢核點 |");
    lines.push("|------|------|--------|--------|");
    for (const phase of entry.phases) {
      lines.push(`| ${phase.phase} | ${phase.duration} | ${phase.deliverables} | ${phase.checkpoints} |`);
    }
    lines.push("");
  }

  if (entry.warnings) {
    lines.push("**常見低估提醒**");
    lines.push("");
    lines.push(entry.warnings);
    lines.push("");
  }

  return lines.join("\n");
}

/** 00D：從資料庫條目生成 markdown */
function renderEntry00D(entry: KBEntry00D): string {
  const lines: string[] = [];
  lines.push(`### ${entry.id}｜${entry.riskName}`);
  lines.push("");
  lines.push(`**風險等級**：${entry.riskLevel}`);
  lines.push("");

  if (entry.prevention) {
    lines.push("**預防措施**");
    lines.push("");
    lines.push(entry.prevention);
    lines.push("");
  }

  if (entry.responseSteps.length > 0) {
    lines.push("**應變步驟**");
    lines.push("");
    lines.push("| 步驟 | 行動 | 負責人 |");
    lines.push("|------|------|--------|");
    for (const step of entry.responseSteps) {
      lines.push(`| ${step.step} | ${step.action} | ${step.responsible} |`);
    }
    lines.push("");
  }

  if (entry.notes) {
    lines.push("**備註**");
    lines.push("");
    lines.push(entry.notes);
    lines.push("");
  }

  return lines.join("\n");
}

/** 00E：從資料庫條目生成 markdown */
function renderEntry00E(entry: KBEntry00E): string {
  const lines: string[] = [];
  lines.push(`### ${entry.id}｜${entry.projectName}（${entry.result}）`);
  lines.push("");
  lines.push(`**年度**：${entry.year}`);
  lines.push(`**結果**：${entry.result}`);
  lines.push("");

  if (entry.bidPhaseReview) {
    lines.push("**投標階段檢討**");
    lines.push("");
    lines.push(entry.bidPhaseReview);
    lines.push("");
  }

  if (entry.executionReview) {
    lines.push("**執行階段檢討**");
    lines.push("");
    lines.push(entry.executionReview);
    lines.push("");
  }

  if (entry.kbUpdateSuggestions) {
    lines.push("**知識庫更新建議**");
    lines.push("");
    lines.push(entry.kbUpdateSuggestions);
    lines.push("");
  }

  if (entry.aiToolFeedback) {
    lines.push("**AI 工具回饋**");
    lines.push("");
    lines.push(entry.aiToolFeedback);
    lines.push("");
  }

  if (entry.oneSentenceSummary) {
    lines.push("**一句話總結**");
    lines.push("");
    lines.push(entry.oneSentenceSummary);
    lines.push("");
  }

  return lines.join("\n");
}

// ====== 完整 Markdown 生成 ======

const KB_HEADERS: Record<KBId, { title: string; description: string }> = {
  "00A": {
    title: "00A｜團隊成員資料庫",
    description: "供各階段 AI 動態篩選合適人選、動態生成符合本案需求的人員介紹",
  },
  "00B": {
    title: "00B｜公司實績資料庫",
    description: "供各階段 AI 動態篩選與本案最相關的實績、動態生成客製化實績描述",
  },
  "00C": {
    title: "00C｜時程範本庫",
    description: "供 AI 根據案件類型自動選擇合適的時程範本",
  },
  "00D": {
    title: "00D｜應變SOP庫",
    description: "供 AI 根據案件特性挑選相關風險 SOP",
  },
  "00E": {
    title: "00E｜案後檢討庫",
    description: "供 AI 參考過去案件的經驗教訓",
  },
};

/** 將某個知識庫的全部啟用條目渲染為完整 Markdown */
export function renderKBToMarkdown(
  kbId: KBId,
  data: KnowledgeBaseData,
): string {
  const header = KB_HEADERS[kbId];
  const now = new Date().toLocaleDateString("zh-TW");
  const lines: string[] = [];

  lines.push(`# ${header.title}`);
  lines.push("");
  lines.push(`> **用途**：${header.description}`);
  lines.push(`> **最後更新**：${now}`);
  lines.push("");
  lines.push("---");
  lines.push("");

  const entries = data[kbId] as Array<{ entryStatus: string }>;
  const activeEntries = entries.filter((e) => e.entryStatus === "active");

  if (activeEntries.length === 0) {
    lines.push("（尚無資料）");
    return lines.join("\n");
  }

  switch (kbId) {
    case "00A":
      lines.push("## 成員資料");
      lines.push("");
      for (const entry of activeEntries as KBEntry00A[]) {
        lines.push(renderEntry00A(entry));
        lines.push("---");
        lines.push("");
      }
      break;
    case "00B":
      lines.push("## 實績資料");
      lines.push("");
      for (const entry of activeEntries as KBEntry00B[]) {
        lines.push(renderEntry00B(entry));
        lines.push("---");
        lines.push("");
      }
      break;
    case "00C":
      lines.push("## 時程範本");
      lines.push("");
      for (const entry of activeEntries as KBEntry00C[]) {
        lines.push(renderEntry00C(entry));
        lines.push("---");
        lines.push("");
      }
      break;
    case "00D":
      lines.push("## 應變SOP");
      lines.push("");
      for (const entry of activeEntries as KBEntry00D[]) {
        lines.push(renderEntry00D(entry));
        lines.push("---");
        lines.push("");
      }
      break;
    case "00E":
      lines.push("## 案後檢討");
      lines.push("");
      for (const entry of activeEntries as KBEntry00E[]) {
        lines.push(renderEntry00E(entry));
        lines.push("---");
        lines.push("");
      }
      break;
  }

  return lines.join("\n");
}

// ====== 搜尋 ======

/** 從 entry 提取可搜尋文字 */
function extractSearchableText(entry: object): string {
  const parts: string[] = [];
  for (const value of Object.values(entry)) {
    if (typeof value === "string") {
      parts.push(value);
    } else if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === "string") {
          parts.push(item);
        } else if (typeof item === "object" && item !== null) {
          parts.push(...Object.values(item as Record<string, unknown>).filter((v): v is string => typeof v === "string"));
        }
      }
    }
  }
  return parts.join(" ").toLowerCase();
}

/** 搜尋知識庫條目 */
export function searchEntries<T extends { id: string }>(
  entries: T[],
  query: string,
): T[] {
  if (!query.trim()) return entries;
  const q = query.toLowerCase();
  return entries.filter((entry) =>
    extractSearchableText(entry).includes(q)
  );
}

// ====== 統計 ======

/** 計算各知識庫的條目數量 */
export function getKBStats(data: KnowledgeBaseData): Record<KBId, { total: number; active: number; draft: number; archived: number }> {
  const kbIds: KBId[] = ["00A", "00B", "00C", "00D", "00E"];
  const result = {} as Record<KBId, { total: number; active: number; draft: number; archived: number }>;

  for (const id of kbIds) {
    const entries = data[id] as Array<{ entryStatus: string }>;
    result[id] = {
      total: entries.length,
      active: entries.filter((e) => e.entryStatus === "active").length,
      draft: entries.filter((e) => e.entryStatus === "draft").length,
      archived: entries.filter((e) => e.entryStatus === "archived").length,
    };
  }

  return result;
}
