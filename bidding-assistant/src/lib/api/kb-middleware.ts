/**
 * 知識庫 API 認證與租戶隔離中間件（過渡層）
 *
 * 支援兩種模式：
 * 1. 新模式（P1F middleware）：從 headers 讀取 x-tenant-id, x-user-id
 * 2. 舊模式（P1B）：從 httpOnly cookie 讀取 session
 *
 * 短期內維持向後相容，長期應全面遷移到新 guard 系統
 */

import { NextRequest } from 'next/server';

export interface AuthSession {
  userId: string;
  userEmail: string;
  tenantId: string;
  role?: 'admin' | 'member' | 'viewer';
}

/**
 * 從 request 中提取並驗證 auth session
 * 優先讀取 headers（P1F middleware 模式），再回退到 cookie（P1B 模式）
 */
interface AuthError extends Error {
  statusCode?: number;
}

export async function requireAuth(request: NextRequest): Promise<AuthSession> {
  // 優先嘗試新模式：從 headers 讀取
  const tenantId = request.headers.get('x-tenant-id');
  const userId = request.headers.get('x-user-id');

  if (tenantId && userId) {
    // P1F middleware 已注入租戶上下文
    return {
      userId,
      userEmail: '', // headers 中沒有 email，但不影響租戶隔離
      tenantId,
      role: (request.headers.get('x-user-role') as AuthSession['role']) || 'member',
    };
  }

  // 回退到舊模式：從 cookie 讀取
  const cookieHeader = request.headers.get('cookie');

  if (!cookieHeader) {
    const error: AuthError = new Error('Unauthorized - No session cookie');
    error.statusCode = 401;
    throw error;
  }

  try {
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
      const error: AuthError = new Error('Unauthorized - No auth session');
      error.statusCode = 401;
      throw error;
    }

    // 解碼 session JSON
    const sessionJson = Buffer.from(authCookie, 'base64').toString('utf-8');
    const session = JSON.parse(sessionJson);

    if (!session.userId || !session.email || !session.tenantId) {
      throw new Error('Invalid session format');
    }

    return {
      userId: session.userId,
      userEmail: session.email,
      tenantId: session.tenantId,
      role: session.role || 'member',
    };
  } catch (error: unknown) {
    if (error instanceof Error && 'statusCode' in error && error.statusCode === 401) {
      throw error;
    }
    const err: AuthError = new Error('Invalid session');
    err.statusCode = 401;
    throw err;
  }
}

/**
 * 驗證用戶是否有權刪除項目
 * - Admin 或項目建立者可刪除
 */
export function canDelete(
  session: AuthSession,
  createdBy: string,
  isAdmin: boolean = false,
): boolean {
  return isAdmin || session.userId === createdBy;
}
