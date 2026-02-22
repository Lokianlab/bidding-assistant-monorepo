/**
 * 知識庫 API 認證與租戶隔離中間件
 *
 * 暫時實現：使用 Bearer token 的簡單驗證
 * TODO：集成 next-auth getServerSession（待 P1b 完成）
 */

import { NextRequest } from 'next/server';

export interface AuthSession {
  userId: string;
  userEmail: string;
  tenantId: string;
}

/**
 * 從 request 中提取並驗證 auth token
 * 暫時使用 Bearer token，格式：Bearer {base64-encoded-json}
 *
 * 生產環境應改為 next-auth getServerSession
 */
export async function requireAuth(request: NextRequest): Promise<AuthSession> {
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const error = new Error('Unauthorized');
    (error as any).statusCode = 401;
    throw error;
  }

  const token = authHeader.substring('Bearer '.length);

  try {
    // 暫時：嘗試從 token 解析 JSON
    // 預期格式：userId:email:tenantId
    const [userId, userEmail, tenantId] = Buffer.from(token, 'base64')
      .toString('utf-8')
      .split(':');

    if (!userId || !userEmail || !tenantId) {
      throw new Error('Invalid token format');
    }

    return { userId, userEmail, tenantId };
  } catch {
    const error = new Error('Invalid token');
    (error as any).statusCode = 401;
    throw error;
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
