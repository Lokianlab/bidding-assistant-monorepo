/**
 * Next.js Middleware（Edge Function）
 *
 * 職責：
 * 1. 保護受限路由（/api/kb, /kb, /dashboard, /settings）
 * 2. 驗證 session
 * 3. 注入租戶上下文到 headers（供 API routes 使用）
 * 4. 無效 session 重導至 /login
 */

import { type NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/session';

const protectedRoutes = ['/api/kb', '/api/bids', '/kb', '/dashboard', '/settings'];
const publicRoutes = ['/', '/login', '/auth'];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // 公開路由直接放行
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // 受保護路由需要驗證
  if (protectedRoutes.some((route) => pathname.startsWith(route))) {
    const session = await getSessionFromRequest(request);

    if (!session?.userId || !session?.tenantId) {
      // 無效 session 或不存在 → 重導至登入
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // 注入租戶上下文到 headers（傳遞給 API routes）
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-tenant-id', session.tenantId);
    requestHeaders.set('x-user-id', session.userId);
    requestHeaders.set('x-user-role', session.role || 'member');

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
