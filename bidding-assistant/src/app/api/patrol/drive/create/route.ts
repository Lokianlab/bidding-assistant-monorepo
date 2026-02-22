/**
 * POST /api/patrol/drive/create
 *
 * P0 巡標 Layer B：建立 Google Drive 備標資料夾
 * 接收 DriveCreateFolderInput，回傳 DriveCreateFolderResult
 *
 * 注意：需要 Google Drive OAuth2 access token（尚未確認授權方式）
 */

import { NextRequest, NextResponse } from 'next/server';
import { createDriveFolder } from '@/lib/patrol/drive-writer';
import type { DriveCreateFolderInput } from '@/lib/patrol/types';

export async function POST(req: NextRequest) {
  try {
    const { accessToken, parentFolderId, input } = (await req.json()) as {
      accessToken?: string;
      parentFolderId?: string;
      input?: DriveCreateFolderInput;
    };

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: '缺少 Google Drive access token' },
        { status: 400 },
      );
    }

    if (!parentFolderId) {
      return NextResponse.json(
        { success: false, error: '缺少父資料夾 ID（B. 備標集中區）' },
        { status: 400 },
      );
    }

    if (!input?.caseUniqueId || !input?.title) {
      return NextResponse.json(
        { success: false, error: '缺少建資料夾資料（caseUniqueId 和 title 必填）' },
        { status: 400 },
      );
    }

    const result = await createDriveFolder(input, accessToken, parentFolderId);

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
