// ====== 巡標掃描 API ======
// POST /api/scan — 用多個關鍵字搜 PCC，篩選分類後回傳結果

import { NextRequest, NextResponse } from "next/server";
import { classifyTender, classifyTenders, countByCategory, sortByPriority } from "@/lib/scan/keyword-engine";
import { DEFAULT_SEARCH_KEYWORDS, DEFAULT_KEYWORD_RULES } from "@/lib/scan/constants";
import { findDetailValue, parseAmount } from "@/lib/pcc/helpers";
import type { ScanTender } from "@/lib/scan/types";
import type { PCCSearchResponse, PCCRecord, TenderDetailValue } from "@/lib/pcc/types";

const API_BASE = "https://pcc-api.openfun.app/api";
const MIN_INTERVAL_MS = 300;
/** 已決標的公告類型（不需要再投） */
const EXPIRED_BRIEF_TYPES = ["決標公告", "無法決標公告", "撤銷公告"];
let lastRequestTime = 0;

/** 帶 rate limiting 的 PCC 搜尋 */
async function pccSearch(query: string, page = 1): Promise<PCCSearchResponse> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_INTERVAL_MS) {
    await new Promise((r) => setTimeout(r, MIN_INTERVAL_MS - elapsed));
  }
  lastRequestTime = Date.now();

  const url = new URL(`${API_BASE}/searchbytitle`);
  url.searchParams.set("query", query);
  url.searchParams.set("page", String(page));

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    if (res.status === 429) {
      throw new Error("PCC API 請求過於頻繁，請稍後再試");
    }
    throw new Error(`PCC API 錯誤: ${res.status}`);
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("text/html")) {
    throw new Error("PCC API 端點回傳非預期格式");
  }

  return res.json() as Promise<PCCSearchResponse>;
}

/** YYYYMMDD 數字 → "YYYY-MM-DD" ISO 日期字串 */
function pccDateToISO(dateNum: number): string {
  const s = String(dateNum);
  if (s.length !== 8) return s;
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}

/** 判斷 brief type 是否已決標（不需打 detail） */
function isDecided(record: PCCRecord): boolean {
  return EXPIRED_BRIEF_TYPES.includes(record.brief.type);
}

/** 從 PCC detail API 取截標日期和預算（帶 rate limiting） */
async function fetchTenderExtra(
  unitId: string,
  jobNumber: string,
): Promise<{ deadline: string | null; budget: number | null }> {
  try {
    const now = Date.now();
    const elapsed = now - lastRequestTime;
    if (elapsed < MIN_INTERVAL_MS) {
      await new Promise((r) => setTimeout(r, MIN_INTERVAL_MS - elapsed));
    }
    lastRequestTime = Date.now();

    const url = new URL(`${API_BASE}/tender`);
    url.searchParams.set("unit_id", unitId);
    url.searchParams.set("job_number", jobNumber);

    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return { deadline: null, budget: null };

    const data = await res.json() as { detail?: Record<string, TenderDetailValue> };
    if (!data.detail) return { deadline: null, budget: null };

    return {
      deadline: findDetailValue(data.detail, ":截止投標日期"),
      budget: parseAmount(findDetailValue(data.detail, ":預算金額")),
    };
  } catch {
    return { deadline: null, budget: null };
  }
}

/** 判斷截標日期是否已過 */
function isDeadlinePassed(deadline: string | null): boolean {
  if (!deadline) return false; // 查不到截標日就不過濾（保守）
  // PCC 格式可能是 "114/03/15" 或 "2025/03/15" 等
  const cleaned = deadline.replace(/\//g, "-");
  // 嘗試解析民國年（三位數年份）
  const rocMatch = cleaned.match(/^(\d{2,3})-(\d{2})-(\d{2})/);
  let dateStr: string;
  if (rocMatch && Number(rocMatch[1]) < 200) {
    // 民國年轉西元
    dateStr = `${Number(rocMatch[1]) + 1911}-${rocMatch[2]}-${rocMatch[3]}`;
  } else {
    dateStr = cleaned;
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false; // 解析失敗就不過濾
  // 截標日當天 23:59:59 前都算有效
  d.setHours(23, 59, 59, 999);
  return d.getTime() < Date.now();
}

/** 將 PCC record 轉為 ScanTender（brief 層級，預算未知） */
function toScanTender(record: PCCRecord): ScanTender {
  return {
    title: record.brief.title,
    unit: record.unit_name,
    jobNumber: record.job_number,
    budget: 0, // brief 不含預算，需另外取 detail
    deadline: "", // brief 不含截標日，detail API 才有
    publishDate: pccDateToISO(record.date),
    url: record.url,
    category: record.brief.type,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const keywords: string[] =
      Array.isArray(body.keywords) && body.keywords.length > 0
        ? body.keywords
        : DEFAULT_SEARCH_KEYWORDS;
    const maxPagesPerKeyword: number = body.maxPages ?? 1;

    // Phase 1: 逐關鍵字搜尋 + 去重 + 擋掉已決標
    const seen = new Set<string>();
    const candidates: { record: PCCRecord; tender: ScanTender }[] = [];
    const errors: { keyword: string; error: string }[] = [];
    let filteredCount = 0;

    for (const kw of keywords) {
      try {
        for (let page = 1; page <= maxPagesPerKeyword; page++) {
          const result = await pccSearch(kw, page);
          for (const record of result.records) {
            const key = `${record.job_number}:${record.unit_id}`;
            if (seen.has(key)) continue;
            seen.add(key);

            // 已決標 / 撤銷 → 直接排除（不需打 detail）
            if (isDecided(record)) {
              filteredCount++;
              continue;
            }

            candidates.push({ record, tender: toScanTender(record) });
          }
          if (page >= result.total_pages) break;
        }
      } catch (err) {
        errors.push({
          keyword: kw,
          error: err instanceof Error ? err.message : "搜尋失敗",
        });
      }
    }

    // Phase 2: 只對 must/review 打 detail API（other/exclude 跳過，省 API call）
    // 取捨：純預算規則（≤100萬）在 brief 層級無法判斷（budget=0），這類 other 不升級為 must
    const allTenders: ScanTender[] = [];
    for (const { record, tender } of candidates) {
      const briefClass = classifyTender(tender.title, 0, DEFAULT_KEYWORD_RULES);

      if (briefClass.category === "must" || briefClass.category === "review") {
        // 只有高優先級才打 detail API 取截標日和預算
        const extra = await fetchTenderExtra(record.unit_id, record.job_number);
        if (isDeadlinePassed(extra.deadline)) {
          filteredCount++;
          continue;
        }
        if (extra.deadline) tender.deadline = extra.deadline;
        if (extra.budget !== null) tender.budget = extra.budget;
      }
      // other/exclude 不打 detail，直接收入（不做截標日過濾）
      allTenders.push(tender);
    }

    // 分類 + 排序
    const classified = classifyTenders(allTenders, DEFAULT_KEYWORD_RULES);
    const sorted = sortByPriority(classified);
    const counts = countByCategory(classified);

    return NextResponse.json({
      scannedAt: new Date().toISOString(),
      searchKeywords: keywords,
      results: sorted,
      counts,
      totalRaw: allTenders.length,
      filteredExpired: filteredCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "巡標掃描錯誤";
    console.error("Scan API error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
