// ====== Notion 建案 API ======
// POST /api/notion/create-case — 將 PCC 掃描到的標案建入 Notion 追蹤資料庫

import { NextRequest, NextResponse } from "next/server";
import { mapTenderToNotionProperties } from "@/lib/scan/notion-mapper";
import type { ScanTender } from "@/lib/scan/types";

export async function POST(req: NextRequest) {
  try {
    const { token, databaseId, tender } = await req.json();

    if (!token || !databaseId) {
      return NextResponse.json(
        { error: "缺少 Notion token 或 databaseId" },
        { status: 400 },
      );
    }

    if (!tender?.title) {
      return NextResponse.json(
        { error: "缺少標案資料（title 必填）" },
        { status: 400 },
      );
    }

    const properties = mapTenderToNotionProperties(tender as ScanTender);

    const res = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        parent: { database_id: databaseId },
        properties,
      }),
    });

    const data = (await res.json()) as { id?: string; url?: string; message?: string };

    if (!res.ok) {
      return NextResponse.json(
        { error: data.message ?? "Notion 建案失敗" },
        { status: res.status },
      );
    }

    return NextResponse.json({
      pageId: data.id,
      url: data.url,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "建案錯誤";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
