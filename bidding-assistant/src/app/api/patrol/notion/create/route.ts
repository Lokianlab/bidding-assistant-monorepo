/**
 * POST /api/patrol/notion/create
 *
 * P0 巡標 Layer B：建立 Notion 案件頁面
 * 接收 NotionCaseCreateInput，回傳 NotionCaseCreateResult
 */

import { NextRequest, NextResponse } from 'next/server';
import { createNotionCase } from '@/lib/patrol/notion-writer';
import type { NotionCaseCreateInput } from '@/lib/patrol/types';

export async function POST(req: NextRequest) {
  try {
    const { token, databaseId, input } = (await req.json()) as {
      token?: string;
      databaseId?: string;
      input?: NotionCaseCreateInput;
    };

    if (!token || !databaseId) {
      return NextResponse.json(
        { success: false, error: '缺少 Notion token 或 databaseId' },
        { status: 400 },
      );
    }

    if (!input?.title) {
      return NextResponse.json(
        { success: false, error: '缺少建檔資料（title 必填）' },
        { status: 400 },
      );
    }

    const result = await createNotionCase(input, token, databaseId);

    return NextResponse.json(result, {
      status: result.success ? 200 : 400,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '建檔錯誤';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
