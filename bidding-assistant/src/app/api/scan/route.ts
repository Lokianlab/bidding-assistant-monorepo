// ====== 巡標掃描 API ======
// POST /api/scan — 用多個關鍵字搜 PCC，篩選分類後回傳結果

import { NextRequest, NextResponse } from "next/server";
import { classifyTenders, countByCategory, sortByPriority } from "@/lib/scan/keyword-engine";
import { DEFAULT_SEARCH_KEYWORDS, DEFAULT_KEYWORD_RULES } from "@/lib/scan/constants";
import type { ScanTender } from "@/lib/scan/types";
import type { PCCSearchResponse, PCCRecord } from "@/lib/pcc/types";

const API_BASE = "https://pcc-api.openfun.app/api";
const MIN_INTERVAL_MS = 300;
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

    // 逐關鍵字搜尋 + 去重
    const seen = new Set<string>();
    const allTenders: ScanTender[] = [];
    const errors: { keyword: string; error: string }[] = [];

    for (const kw of keywords) {
      try {
        for (let page = 1; page <= maxPagesPerKeyword; page++) {
          const result = await pccSearch(kw, page);
          for (const record of result.records) {
            // 用 job_number + unit_id 去重（同案可能出現在不同關鍵字搜尋）
            const key = `${record.job_number}:${record.unit_id}`;
            if (!seen.has(key)) {
              seen.add(key);
              allTenders.push(toScanTender(record));
            }
          }
          // 不需要翻更多頁
          if (page >= result.total_pages) break;
        }
      } catch (err) {
        errors.push({
          keyword: kw,
          error: err instanceof Error ? err.message : "搜尋失敗",
        });
      }
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
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "巡標掃描錯誤";
    console.error("Scan API error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
