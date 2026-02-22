/**
 * 認證上下文測試（SaaS Phase 1B OAuth）
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useAuth, AuthProvider, useTenantId, useRequireAuth } from '../auth-context';

// 模擬 next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
  })),
}));

describe('AuthContext', () => {
  const mockSessionCookie = {
    userId: 'user-123',
    tenantId: 'tenant-456',
    email: 'user@example.com',
    googleId: 'google-123',
    iat: Math.floor(Date.now() / 1000),
  };

  beforeEach(() => {
    // 清除 cookie
    document.cookie = 'auth-session=; Max-Age=0';
  });

  describe('AuthProvider', () => {
    it('應提供認證上下文', () => {
      const TestComponent = () => {
        const { isAuthenticated } = useAuth();
        return <div>{isAuthenticated ? '已認證' : '未認證'}</div>;
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByText('未認證')).toBeTruthy();
    });

    it('應從 cookie 讀取會話', async () => {
      const encodedSession = Buffer.from(JSON.stringify(mockSessionCookie)).toString('base64');
      document.cookie = `auth-session=${encodedSession}; path=/`;

      const TestComponent = () => {
        const { session, isLoading } = useAuth();
        if (isLoading) return <div>載入中</div>;
        return <div>{session?.email}</div>;
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('user@example.com')).toBeTruthy();
      });
    });
  });

  describe('useAuth Hook', () => {
    it('應返回認證狀態', () => {
      const TestComponent = () => {
        const { isAuthenticated, isLoading } = useAuth();
        return (
          <div>
            <div data-testid="loading">{isLoading ? '是' : '否'}</div>
            <div data-testid="authenticated">{isAuthenticated ? '是' : '否'}</div>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('authenticated').textContent).toBe('否');
    });

    it('未在 AuthProvider 中應拋出錯誤', () => {
      const TestComponent = () => {
        useAuth();
        return null;
      };

      // 預期會拋出錯誤
      expect(() => render(<TestComponent />)).toThrow('useAuth 必須在 AuthProvider 內使用');
    });

    it('應提供 logout 方法', async () => {
      const TestComponent = () => {
        const { logout } = useAuth();
        return <button onClick={logout}>登出</button>;
      };

      // 模擬 fetch
      global.fetch = vi.fn(() =>
        Promise.resolve({ ok: true } as Response)
      );

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      const button = screen.getByText('登出');
      fireEvent.click(button);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/auth/logout', { method: 'POST' });
      });
    });
  });

  describe('useTenantId Hook', () => {
    it('已認證時應返回租戶 ID', async () => {
      const encodedSession = Buffer.from(JSON.stringify(mockSessionCookie)).toString('base64');
      document.cookie = `auth-session=${encodedSession}; path=/`;

      const TestComponent = () => {
        const { isLoading } = useAuth();
        if (isLoading) return <div>載入中</div>;
        const tenantId = useTenantId();
        return <div>{tenantId}</div>;
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('tenant-456')).toBeTruthy();
      });
    });

    it('未認證時應拋出錯誤', async () => {
      const TestComponent = () => {
        const { isLoading } = useAuth();
        if (isLoading) return <div>載入中</div>;
        useTenantId();
        return null;
      };

      expect(() =>
        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        )
      ).toThrow('用戶未認證');
    });
  });

  describe('useRequireAuth Hook', () => {
    it('已認證時應返回 isReady=true', async () => {
      const encodedSession = Buffer.from(JSON.stringify(mockSessionCookie)).toString('base64');
      document.cookie = `auth-session=${encodedSession}; path=/`;

      const TestComponent = () => {
        const { isReady } = useRequireAuth();
        return <div data-testid="ready">{isReady ? '就緒' : '未就緒'}</div>;
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('ready').textContent).toBe('就緒');
      });
    });
  });
});
