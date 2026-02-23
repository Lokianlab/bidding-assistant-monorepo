/**
 * 知識庫 API 認證與租戶隔離中間件
 *
 * 實現：從 P1B OAuth 的 httpOnly cookie 讀取 session
 * Cookie 格式：auth-session=base64(JSON)
 * JSON 結構：{ userId, tenantId, email, googleId, iat }
 */

import { NextRequest } from 'next/server';

export interface AuthSession {
  userId: string;
  userEmail: string;
  tenantId: string;
}

/**
 * 從 request cookies 中提取並驗證 auth session
 * 讀取 auth-session cookie（由 P1B OAuth 設定）
 */
export async function requireAuth(request: NextRequest): Promise<AuthSession> {
  const cookieHeader = request.headers.get('cookie');

  if (!cookieHeader) {
    const error = new Error('Unauthorized - No session cookie');
    (error as any).statusCode = 401;
    throw error;
  }

  try {
    // 解析 cookie 字串
    const cookies = cookieHeader.split('; ').reduce(
      (acc, cookie) => {
        const [key, value] = cookie.split('=');
        acc[key] = decodeURIComponent(value);
        return acc;
      },
      {} as Record<string, string>
    );

    const authCookie = cookies['auth-session'];
    if (!authCookie) {
      const error = new Error('Unauthorized - No auth session');
      (error as any).statusCode = 401;
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
    };
  } catch (error: any) {
    if (error.statusCode === 401) {
      throw error;
    }
    const err = new Error('Invalid session');
    (err as any).statusCode = 401;
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
