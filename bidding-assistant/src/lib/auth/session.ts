/**
 * Session 提取與管理工具
 *
 * 用途：
 * - Middleware 層：從 httpOnly cookie 讀取 session
 * - API Route 層：從 headers 讀取 middleware 注入的租戶上下文
 * - 型別定義：統一 session 結構
 */

import { NextRequest } from 'next/server';

export interface SessionData {
  userId: string;
  tenantId: string;
  email: string;
  googleId: string;
  role: 'admin' | 'member' | 'viewer';
  iat: number;
}

export interface SessionUser {
  id: string;
  tenantId: string;
  email: string;
  role: 'admin' | 'member' | 'viewer';
}

/**
 * 從 httpOnly cookie 提取 session
 * 用於 Middleware 和伺服器端路由
 *
 * 使用方式：
 *   const session = await getSessionFromRequest(request);
 *   if (!session) return redirect('/login');
 */
export async function getSessionFromRequest(
  request: NextRequest
): Promise<SessionData | null> {
  try {
    const cookieHeader = request.headers.get('cookie');
    if (!cookieHeader) {
      return null;
    }

    // 解析 cookie 字串
    const cookies = cookieHeader.split('; ').reduce(
      (acc, cookie) => {
        const [key, value] = cookie.split('=');
        if (key && value) {
          acc[key] = decodeURIComponent(value);
        }
        return acc;
      },
      {} as Record<string, string>
    );

    const authCookie = cookies['auth-session'];
    if (!authCookie) {
      return null;
    }

    // 解碼 base64 並解析 JSON
    const sessionJson = Buffer.from(authCookie, 'base64').toString('utf-8');
    const sessionData = JSON.parse(sessionJson) as SessionData;

    // 驗證必要欄位
    if (!sessionData.userId || !sessionData.tenantId || !sessionData.email) {
      return null;
    }

    return sessionData;
  } catch (error) {
    console.error('[Session] Error extracting session:', error);
    return null;
  }
}

/**
 * 從 HTTP headers 提取租戶上下文
 * 用於 API routes（middleware 已注入）
 *
 * 使用方式：
 *   const context = getContextFromHeaders(request);
 *   if (!context) throw new Error('Missing tenant context');
 */
export interface TenantContext {
  tenantId: string;
  userId: string;
  role: 'admin' | 'member' | 'viewer';
}

export function getContextFromHeaders(request: NextRequest): TenantContext | null {
  const tenantId = request.headers.get('x-tenant-id');
  const userId = request.headers.get('x-user-id');
  const role = request.headers.get('x-user-role');

  if (!tenantId || !userId || !role) {
    return null;
  }

  return {
    tenantId,
    userId,
    role: role as TenantContext['role'],
  };
}
