/**
 * POST /api/auth/login
 *
 * 發起 Google OAuth 流程
 * 返回授權 URL，前端重定向到該 URL
 */

import { getAuthorizationUrl } from '@/lib/auth/oauth-config';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // 取得基礎 URL（從 referer 或環境變數）
    const baseUrl = new URL(request.url).origin;
    const authUrl = getAuthorizationUrl(baseUrl);

    return NextResponse.json({
      authUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知錯誤';
    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}
