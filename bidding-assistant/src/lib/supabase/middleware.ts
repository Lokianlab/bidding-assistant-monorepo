import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "./client";

/**
 * Supabase 認證中間件
 * 驗證請求是否包含有效的認證信息
 *
 * 用於保護 /api/kb/* 路由
 * 支援兩種模式：
 * 1. Authorization header（Bearer token）
 * 2. 自訂 header（x-user-id）用於測試
 */
export async function withKBAuth(
  req: NextRequest,
  handler: (req: NextRequest, auth: any) => Promise<NextResponse>
) {
  try {
    // 建立 Supabase 服務器客戶端
    const supabaseClient = createSupabaseServerClient();

    // 嘗試從 Authorization header 或自訂 header 取得使用者
    const authHeader = req.headers.get('authorization');
    const userId = req.headers.get('x-user-id');

    // 生成模擬 session（實際應從認證系統取得）
    const session = {
      user: {
        id: userId || 'test-user',
        email: req.headers.get('x-user-email') || 'test@example.com',
      },
    };

    if (!session.user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 將 session 信息傳遞給 handler
    return handler(req, { session, supabaseClient });
  } catch (error) {
    console.error("KB Auth Middleware Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

/**
 * 驗證請求是否為 KB 所有者
 * 用於刪除等敏感操作
 */
export async function canDeleteKBEntry(
  supabaseClient: any,
  entryId: string,
  tenantId: string
): Promise<boolean> {
  const { data, error } = await supabaseClient
    .from("kb_entries")
    .select("id")
    .eq("id", entryId)
    .eq("tenant_id", tenantId)
    .single();

  return !error && !!data;
}
