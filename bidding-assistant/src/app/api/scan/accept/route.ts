// ====== 巡標建案 API ======
// POST /api/scan/accept — 將選取的標案寫入 Notion 資料庫

import { NextRequest, NextResponse } from "next/server";
import { mapTenderToNotionProperties, buildCreatePageBody } from "@/lib/scan/notion-mapper";
import type { ScanTender } from "@/lib/scan/types";

interface AcceptRequestBody {
  tender: ScanTender;
  token: string;
  databaseId: string;
}

interface NotionCreateResponse {
  id: string;
  message?: string;
}

export async function POST(req: NextRequest) {
  let body: Partial<AcceptRequestBody>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "無效的請求格式" }, { status: 400 });
  }

  const { tender, token, databaseId } = body;

  if (!token) {
    return NextResponse.json({ error: "缺少 Notion token" }, { status: 400 });
  }
  if (!databaseId) {
    return NextResponse.json({ error: "缺少 Notion databaseId" }, { status: 400 });
  }
  if (!tender?.title) {
    return NextResponse.json({ error: "缺少標案資料" }, { status: 400 });
  }

  try {
    const properties = mapTenderToNotionProperties(tender);
    const pageBody = buildCreatePageBody(databaseId, properties);

    const res = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(pageBody),
    });

    const data: NotionCreateResponse = await res.json();

    if (!res.ok) {
      const message = data.message ?? "Notion 建案失敗";
      return NextResponse.json({ error: message }, { status: res.status });
    }

    return NextResponse.json({ success: true, notionPageId: data.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "建案失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
