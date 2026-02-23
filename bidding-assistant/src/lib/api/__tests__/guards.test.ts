/**
 * P1F API Guards 測試
 *
 * 驗證：
 * - 租戶上下文提取
 * - 角色檢查
 * - 錯誤處理
 */

import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import {
  withTenant,
  requireRole,
  requireAdmin,
  requireWriter,
  HttpError,
} from '@/lib/api/guards';
import { getContextFromHeaders } from '@/lib/auth/session';

describe('API Guards - P1F', () => {
  describe('withTenant - 租戶上下文提取', () => {
    it('有完整 headers 時應返回租戶上下文', () => {
      const request = new NextRequest(new URL('http://localhost:3000/api/test'), {
        headers: {
          'x-tenant-id': 'tenant-123',
          'x-user-id': 'user-456',
          'x-user-role': 'member',
        },
      });

      const context = withTenant(request);

      expect(context.tenantId).toBe('tenant-123');
      expect(context.userId).toBe('user-456');
      expect(context.role).toBe('member');
    });

    it('缺少 x-tenant-id 時應拋出錯誤', () => {
      const request = new NextRequest(new URL('http://localhost:3000/api/test'), {
        headers: {
          'x-user-id': 'user-456',
          'x-user-role': 'member',
        },
      });

      expect(() => withTenant(request)).toThrow(HttpError);
    });

    it('缺少 x-user-id 時應拋出錯誤', () => {
      const request = new NextRequest(new URL('http://localhost:3000/api/test'), {
        headers: {
          'x-tenant-id': 'tenant-123',
          'x-user-role': 'member',
        },
      });

      expect(() => withTenant(request)).toThrow(HttpError);
    });

    it('缺少 x-user-role 時應拋出錯誤', () => {
      const request = new NextRequest(new URL('http://localhost:3000/api/test'), {
        headers: {
          'x-tenant-id': 'tenant-123',
          'x-user-id': 'user-456',
        },
      });

      expect(() => withTenant(request)).toThrow(HttpError);
    });

    it('拋出錯誤時 status 應為 400', () => {
      const request = new NextRequest(new URL('http://localhost:3000/api/test'));

      try {
        withTenant(request);
        expect.fail('應該拋出錯誤');
      } catch (error: any) {
        expect(error.status).toBe(400);
      }
    });
  });

  describe('getContextFromHeaders - 從 headers 提取上下文', () => {
    it('有完整 headers 時應返回租戶上下文', () => {
      const request = new NextRequest(new URL('http://localhost:3000/api/test'), {
        headers: {
          'x-tenant-id': 'tenant-abc',
          'x-user-id': 'user-xyz',
          'x-user-role': 'admin',
        },
      });

      const context = getContextFromHeaders(request);

      expect(context).not.toBeNull();
      expect(context?.tenantId).toBe('tenant-abc');
      expect(context?.userId).toBe('user-xyz');
      expect(context?.role).toBe('admin');
    });

    it('缺少任何 header 時應返回 null', () => {
      const request = new NextRequest(new URL('http://localhost:3000/api/test'), {
        headers: {
          'x-tenant-id': 'tenant-abc',
          // 缺少其他 headers
        },
      });

      const context = getContextFromHeaders(request);
      expect(context).toBeNull();
    });
  });

  describe('多租戶隔離 - 不同租戶', () => {
    it('租戶 A 的 context 應包含 tenant-a', () => {
      const request = new NextRequest(new URL('http://localhost:3000/api/test'), {
        headers: {
          'x-tenant-id': 'tenant-a',
          'x-user-id': 'user-a',
          'x-user-role': 'member',
        },
      });

      const context = withTenant(request);
      expect(context.tenantId).toBe('tenant-a');
    });

    it('租戶 B 的 context 應包含 tenant-b（不同於 tenant-a）', () => {
      const request = new NextRequest(new URL('http://localhost:3000/api/test'), {
        headers: {
          'x-tenant-id': 'tenant-b',
          'x-user-id': 'user-b',
          'x-user-role': 'member',
        },
      });

      const context = withTenant(request);
      expect(context.tenantId).toBe('tenant-b');
      expect(context.tenantId).not.toBe('tenant-a');
    });
  });

  describe('角色檢查 - requireRole', () => {
    it('用戶角色在允許清單中應通過', () => {
      expect(() => requireRole('admin', ['admin', 'member'])).not.toThrow();
    });

    it('用戶角色在允許清單中應通過 - member', () => {
      expect(() => requireRole('member', ['admin', 'member'])).not.toThrow();
    });

    it('用戶角色不在允許清單中應拋出 403', () => {
      try {
        requireRole('viewer', ['admin', 'member']);
        expect.fail('應該拋出錯誤');
      } catch (error: any) {
        expect(error.status).toBe(403);
        expect(error.message).toContain('Forbidden');
      }
    });

    it('錯誤訊息應包含允許的角色', () => {
      try {
        requireRole('viewer', ['admin']);
        expect.fail('應該拋出錯誤');
      } catch (error: any) {
        expect(error.message).toContain('admin');
      }
    });

    it('多個允許角色時應在錯誤訊息中列出', () => {
      try {
        requireRole('viewer', ['admin', 'editor']);
        expect.fail('應該拋出錯誤');
      } catch (error: any) {
        expect(error.message).toContain('admin or editor');
      }
    });
  });

  describe('Admin 檢查 - requireAdmin', () => {
    it('Admin 角色應通過', () => {
      expect(() => requireAdmin('admin')).not.toThrow();
    });

    it('Member 角色應拋出 403', () => {
      try {
        requireAdmin('member');
        expect.fail('應該拋出錯誤');
      } catch (error: any) {
        expect(error.status).toBe(403);
      }
    });

    it('Viewer 角色應拋出 403', () => {
      try {
        requireAdmin('viewer');
        expect.fail('應該拋出錯誤');
      } catch (error: any) {
        expect(error.status).toBe(403);
      }
    });
  });

  describe('Writer 檢查 - requireWriter', () => {
    it('Admin 角色應通過', () => {
      expect(() => requireWriter('admin')).not.toThrow();
    });

    it('Member 角色應通過', () => {
      expect(() => requireWriter('member')).not.toThrow();
    });

    it('Viewer 角色應拋出 403', () => {
      try {
        requireWriter('viewer');
        expect.fail('應該拋出錯誤');
      } catch (error: any) {
        expect(error.status).toBe(403);
      }
    });
  });

  describe('整合測試 - API route 使用場景', () => {
    it('GET /api/kb/items 場景 - member 可讀取', () => {
      const request = new NextRequest(
        new URL('http://localhost:3000/api/kb/items'),
        {
          headers: {
            'x-tenant-id': 'tenant-123',
            'x-user-id': 'user-456',
            'x-user-role': 'member',
          },
        }
      );

      const context = withTenant(request);
      // member 應該能讀取（假設讀取權限不限制）
      expect(context.role).toBe('member');
    });

    it('POST /api/kb/items 場景 - member 可建立，viewer 不可', () => {
      // Member 可建立
      expect(() => requireWriter('member')).not.toThrow();

      // Viewer 不可建立
      try {
        requireWriter('viewer');
        expect.fail('應該拋出錯誤');
      } catch (error: any) {
        expect(error.status).toBe(403);
      }
    });

    it('DELETE /api/kb/items/:id 場景 - admin 可刪除，其他不可', () => {
      // Admin 可刪除
      expect(() => requireAdmin('admin')).not.toThrow();

      // Member 不可刪除
      try {
        requireAdmin('member');
        expect.fail('應該拋出錯誤');
      } catch (error: any) {
        expect(error.status).toBe(403);
      }
    });
  });

  describe('HttpError 類', () => {
    it('HttpError 應包含 status 和 message', () => {
      const error = new HttpError(403, 'Forbidden');

      expect(error.status).toBe(403);
      expect(error.message).toBe('Forbidden');
      expect(error.name).toBe('HttpError');
    });

    it('HttpError 應是 Error 的子類', () => {
      const error = new HttpError(500, 'Internal Server Error');

      expect(error instanceof Error).toBe(true);
    });
  });
});
