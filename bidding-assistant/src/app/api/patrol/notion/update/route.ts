/**
 * POST /api/patrol/notion/update
 *
 * P0 巡標 Layer B：更新 Notion 案件頁面（摘要/情蒐/進度）
 * 接收 NotionCaseUpdateInput，回傳 NotionCaseUpdateResult
 */

import { NextRequest, NextResponse } from 'next/server';
import { updateNotionCase } from '@/lib/patrol/notion-writer';
import type { NotionCaseUpdateInput } from '@/lib/patrol/types';

export async function POST(req: NextRequest) {
  try {
    const { token, input } = (await req.json()) as {
      token?: string;
      input?: NotionCaseUpdateInput;
    };

    if (!token) {
      return NextResponse.json(
        { success: false, error: '缺少 Notion token' },
        { status: 400 },
      );
    }

    if (!input?.notionPageId) {
      return NextResponse.json(
        { success: false, error: '缺少 Notion 頁面 ID' },
        { status: 400 },
      );
    }

    const result = await updateNotionCase(input, token);

    return NextResponse.json(result, {
      status: result.success ? 200 : 400,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '更新錯誤';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
