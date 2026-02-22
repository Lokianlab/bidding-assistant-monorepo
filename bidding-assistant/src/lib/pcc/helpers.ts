import type {
  PCCRecord,
  CompanyRole,
  CompanyRoleInfo,
  PCCTenderDetail,
  TenderSummary,
  TenderDetailValue,
} from "./types";

// ====== 公司角色解析 ======

/** 從 name_key 中判斷公司的角色 */
function parseRolesFromKeys(keys: string[]): CompanyRole[] {
  const roles = new Set<CompanyRole>();
  for (const key of keys) {
    // 注意順序：先檢查「未得標」，因為「未得標廠商」包含「得標廠商」子字串
    if (key.includes("未得標廠商")) {
      roles.add("未得標");
    } else if (key.includes("得標廠商")) {
      roles.add("得標");
    } else if (key.includes("投標廠商")) {
      roles.add("投標");
    }
  }
  return Array.from(roles);
}

/** 解析搜尋結果中的公司角色 */
export function parseCompanyRoles(record: PCCRecord): CompanyRoleInfo[] {
  const companies = record.brief.companies;
  if (!companies) return [];

  const result: CompanyRoleInfo[] = [];
  for (const name of companies.names) {
    const keys = companies.name_key[name] ?? [];
    const roles = parseRolesFromKeys(keys);

    // Find matching ID
    let matchedId: string | undefined;
    for (const [id, idKeys] of Object.entries(companies.id_key)) {
      // Check if any key matches a key associated with this company name
      if (idKeys.some((k) => keys.some((nk) => nk.includes(k.split(":")[1] ?? "")))) {
        matchedId = id;
        break;
      }
    }

    result.push({ name, id: matchedId, roles });
  }
  return result;
}

/** 判斷公司是否在此標案得標 */
export function isWinner(record: PCCRecord, companyName: string): boolean {
  const companies = record.brief.companies;
  if (!companies) return false;
  const keys = companies.name_key[companyName] ?? [];
  // 必須有「得標廠商」但不能是「未得標廠商」
  return keys.some((k) => k.includes("得標廠商") && !k.includes("未得標廠商"));
}

// ====== 金額解析 ======

/** 解析 PCC 金額字串 "318,600元" → 318600 */
export function parseAmount(amountStr: string | undefined | null): number | null {
  if (!amountStr) return null;
  const cleaned = amountStr.replace(/[,，元\s]/g, "");
  if (!cleaned) return null; // "元" or "   元" → 清理後空字串，不是 0
  const num = Number(cleaned);
  return isNaN(num) ? null : num;
}

/** 格式化金額顯示 */
export function formatAmount(amount: number | null): string {
  if (amount === null) return "—";
  if (amount >= 100_000_000) {
    return `${(amount / 100_000_000).toFixed(2)} 億`;
  }
  if (amount >= 10_000) {
    return `${(amount / 10_000).toFixed(1)} 萬`;
  }
  return amount.toLocaleString("zh-TW") + " 元";
}

// ====== 標案詳情解析 ======

/** 從動態 key-value detail 中找值（用結尾匹配） */
export function findDetailValue(
  detail: Record<string, TenderDetailValue | unknown>,
  suffix: string,
): string | null {
  for (const [key, val] of Object.entries(detail)) {
    if (key.endsWith(suffix) && typeof val === "string") {
      return val;
    }
  }
  return null;
}

/** 解析標案詳情為結構化摘要 */
export function parseTenderSummary(tender: PCCTenderDetail): TenderSummary {
  const d = tender.detail;
  return {
    title: findDetailValue(d, ":標案名稱") ?? findDetailValue(d, ":案名") ?? "",
    agency: findDetailValue(d, ":機關名稱") ?? "",
    budget: parseAmount(findDetailValue(d, ":預算金額")),
    floorPrice: parseAmount(findDetailValue(d, ":底價金額")),
    awardAmount: parseAmount(findDetailValue(d, ":總決標金額")),
    bidderCount: (() => {
      const str = findDetailValue(d, ":投標廠商家數");
      return str ? parseInt(str, 10) || null : null;
    })(),
    awardDate: findDetailValue(d, ":決標日期"),
    deadline: findDetailValue(d, ":截止投標日期"),
    procurementType: findDetailValue(d, ":採購類別"),
    awardMethod: findDetailValue(d, ":決標方式"),
  };
}

// ====== 日期格式化 ======

/** PCC 日期 20260211 → "2026/02/11" */
export function formatPCCDate(dateNum: number): string {
  const str = String(dateNum);
  if (str.length !== 8) return str;
  return `${str.slice(0, 4)}/${str.slice(4, 6)}/${str.slice(6, 8)}`;
}

// ====== 搜尋結果統計 ======

/** 計算公司在搜尋結果中的得標率 */
export function calcWinRate(
  records: PCCRecord[],
  companyName: string,
): { wins: number; total: number; rate: number } {
  let wins = 0;
  let total = 0;

  for (const record of records) {
    if (record.brief.type !== "決標公告") continue;
    const companies = record.brief.companies;
    if (!companies) continue;

    // Check if company is involved
    const found = companies.names.find((n) => n.includes(companyName));
    if (!found) continue;

    total++;
    if (isWinner(record, found)) {
      wins++;
    }
  }

  return {
    wins,
    total,
    rate: total > 0 ? wins / total : 0,
  };
}
