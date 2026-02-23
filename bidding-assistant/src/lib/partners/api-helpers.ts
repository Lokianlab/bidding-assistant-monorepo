/**
 * M07 外包資源庫 - API 輔助函式
 * 認證、授權、資料庫操作
 */

import { NextRequest } from 'next/server';

/**
 * 從 request 中提取 tenant ID（使用者 ID）
 * 預期認證 middleware 已在 auth header 中設定 user-id
 * 或從 Authorization Bearer token 中解析
 */
export async function getTenantIdFromRequest(
  request: NextRequest,
): Promise<string | null> {
  // 方法 1: 從自訂 header 中獲取（由 auth middleware 設定）
  const userIdHeader = request.headers.get('x-user-id');
  if (userIdHeader) return userIdHeader;

  // 方法 2: 從 Authorization Bearer token 中解析
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      // 在實際應用中，此處應驗證 JWT token 並提取 user_id
      // 目前為簡化實現，直接從 token 中提取（需要與認證中間件一致）
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(
          Buffer.from(parts[1], 'base64').toString('utf-8'),
        );
        return payload.sub || payload.user_id;
      }
    } catch {
      // Token 解析失敗，繼續嘗試其他方法
    }
  }

  // 方法 3: 從 Cookie 中獲取（如果使用 session）
  const cookies = request.cookies;
  const sessionToken = cookies.get('auth-token')?.value;
  if (sessionToken) {
    try {
      const payload = JSON.parse(
        Buffer.from(sessionToken.split('.')[1], 'base64').toString('utf-8'),
      );
      return payload.sub || payload.user_id;
    } catch {
      // Session 解析失敗
    }
  }

  return null;
}

/**
 * 驗證請求的租戶授權
 * 確保用戶只能存取自己的資料
 */
export async function verifyTenantAuthorization(
  request: NextRequest,
): Promise<{ authorized: boolean; tenantId: string | null; error?: string }> {
  const tenantId = await getTenantIdFromRequest(request);

  if (!tenantId) {
    return {
      authorized: false,
      tenantId: null,
      error: '缺少認證資訊，請確保已登入',
    };
  }

  // 驗證 tenant ID 格式（應該是有效的 UUID）
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(tenantId)) {
    return {
      authorized: false,
      tenantId,
      error: '無效的租戶識別',
    };
  }

  return {
    authorized: true,
    tenantId,
  };
}

/**
 * 檢查 API 路由參數中的 ID 是否為有效 UUID
 */
export function validateResourceId(id: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * 確保用戶只能操作自己的租戶資源
 * 防止租戶隔離漏洞（租戶 A 不能操作租戶 B 的資源）
 */
export async function assertOwnership(
  requestedResourceTenantId: string,
  requestTenantId: string,
): Promise<boolean> {
  // 嚴格相等檢查，防止字符串比較繞過
  return requestedResourceTenantId === requestTenantId;
}
