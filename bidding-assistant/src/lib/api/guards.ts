/**
 * API Route 守衛函式
 *
 * 職責：
 * - 從 middleware 注入的 headers 提取租戶上下文
 * - 檢查角色權限
 * - 統一錯誤處理
 */

import { NextRequest } from 'next/server';
import { getContextFromHeaders, TenantContext } from '@/lib/auth/session';

/**
 * 錯誤類
 */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

/**
 * API route 路由守衛
 * 從 headers 提取租戶上下文，無效則拋出錯誤
 *
 * 使用方式：
 *   export async function GET(req: NextRequest) {
 *     const { tenantId, userId, role } = withTenant(req);
 *     // ... 業務邏輯
 *   }
 */
export function withTenant(request: NextRequest): TenantContext {
  const context = getContextFromHeaders(request);

  if (!context) {
    throw new HttpError(400, 'Missing tenant context headers');
  }

  return context;
}

/**
 * 角色檢查
 *
 * 使用方式：
 *   const { role } = withTenant(req);
 *   requireRole(role, ['admin']);
 */
export function requireRole(
  userRole: string,
  allowedRoles: string[]
): void {
  if (!allowedRoles.includes(userRole)) {
    throw new HttpError(
      403,
      `Forbidden: requires role ${allowedRoles.join(' or ')}`
    );
  }
}

/**
 * 檢查用戶是否為管理員
 */
export function requireAdmin(userRole: string): void {
  requireRole(userRole, ['admin']);
}

/**
 * 檢查用戶是否可寫入（admin 或 member）
 */
export function requireWriter(userRole: string): void {
  requireRole(userRole, ['admin', 'member']);
}
