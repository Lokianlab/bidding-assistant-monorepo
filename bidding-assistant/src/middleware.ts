/**
 * Next.js Middleware：多租戶隔離層（SaaS Phase 1F）
 *
 * 職責：
 * 1. 驗證 session 有效性
 * 2. 從 session 提取 tenantId，注入 x-tenant-id header
 * 3. 保護專屬路由（/api/*, /dashboard 等）
 * 4. 未認證用戶重導向到登入
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * 從 session cookie 解析租戶 ID
 * Session 格式：base64(JSON({userId, tenantId, email, ...}))
 */
function extractTenantId(request: NextRequest): string | null {
  try {
    const authSession = request.cookies.get('auth-session')?.value;
    if (!authSession) {
      return null;
    }

    const decoded = JSON.parse(
      Buffer.from(authSession, 'base64').toString('utf-8'),
    );
    return decoded.tenantId || null;
  } catch {
    // Cookie 無效或不是 JSON，返回 null
    return null;
  }
}

/**
 * 檢查路由是否需要認證
 */
function requiresAuth(pathname: string): boolean {
  // 保護的路由模式
  const protectedPatterns = [
    /^\/api\/kb/, // 知識庫 API
    /^\/api\/cron\//, // Cron 端點
    /^\/dashboard/, // 儀表板
    /^\/tools/, // 工具
    /^\/settings/, // 設定
  ];

  return protectedPatterns.some((pattern) => pattern.test(pathname));
}

/**
 * 檢查路由是否為公開路由
 */
function isPublicRoute(pathname: string): boolean {
  const publicPatterns = [
    /^\/api\/auth\/(login|logout|callback)/, // 登入/登出/callback
    /^\/auth\//, // 認證頁面
    /^\/$/, // 首頁
    /^\/api\/health/, // 健康檢查
  ];

  return publicPatterns.some((pattern) => pattern.test(pathname));
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // 公開路由：直接通過
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // 需要認證的路由
  if (requiresAuth(pathname)) {
    const tenantId = extractTenantId(request);

    if (!tenantId) {
      // 未認證用戶重導向到登入
      // API 路由返回 401，頁面路由重導向
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 },
        );
      } else {
        return NextResponse.redirect(new URL('/auth/login', request.url));
      }
    }

    // 注入 tenantId 到 header
    const response = NextResponse.next();
    response.headers.set('x-tenant-id', tenantId);
    return response;
  }

  // 其他路由：直接通過
  return NextResponse.next();
}

export const config = {
  matcher: [
    // 保護 API 路由
    '/api/:path*',
    // 保護頁面路由
    '/dashboard/:path*',
    '/tools/:path*',
    '/settings/:path*',
  ],
};
