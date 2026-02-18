import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/kb-markdown?id=00A
 *
 * 此端點由前端呼叫，前端負責從 localStorage 讀取知識庫資料、
 * 用 helpers.ts 的 renderKBToMarkdown() 產生 markdown。
 *
 * 但因為 localStorage 只存在於客戶端，這個 API 改為接收 POST body。
 * 提示詞組裝引擎在客戶端直接呼叫 renderKBToMarkdown() 即可。
 *
 * 此端點保留作為「從 public/prompts/ 讀取靜態檔案」的 fallback。
 * 如果知識庫 DB 為空，組裝引擎會 fallback 讀取原始 .md 檔。
 */
export async function GET(req: NextRequest) {
  const kbId = req.nextUrl.searchParams.get("id");
  if (!kbId || !["00A", "00B", "00C", "00D", "00E"].includes(kbId)) {
    return NextResponse.json({ error: "無效的知識庫 ID" }, { status: 400 });
  }

  // 回傳 JSON 告知前端應使用客戶端渲染
  return NextResponse.json({
    message: "知識庫內容由客戶端動態產生，請使用 renderKBToMarkdown()",
    kbId,
  });
}
