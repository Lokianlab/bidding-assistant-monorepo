/**
 * POST /api/patrol/drive/create
 *
 * P0 巡標 Layer B：建立 Google Drive 備標資料夾
 * 接收 DriveCreateFolderInput，自動用環境變數處理 OAuth 和資料夾 ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { createDriveFolderAuto } from '@/lib/patrol/drive-writer';
import type { DriveCreateFolderInput } from '@/lib/patrol/types';

export async function POST(req: NextRequest) {
  try {
    const { input } = (await req.json()) as {
      input?: DriveCreateFolderInput;
    };

    if (!input?.caseUniqueId || !input?.title) {
      return NextResponse.json(
        { success: false, error: '缺少建資料夾資料（caseUniqueId 和 title 必填）' },
        { status: 400 },
      );
    }

    const result = await createDriveFolderAuto(input);

    return NextResponse.json(result, {
      status: result.success ? 200 : 400,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '建立資料夾錯誤';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
