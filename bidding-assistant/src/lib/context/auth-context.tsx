/**
 * 認證上下文（SaaS Phase 1B OAuth）
 *
 * 用途：
 * - 管理用戶會話狀態
 * - 提供當前用戶和租戶 ID
 * - 提供登出方法
 */

'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export interface SessionData {
  userId: string;
  tenantId: string;
  email: string;
  googleId: string;
  iat: number;
}

interface AuthContextType {
  session: SessionData | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * 從 auth-session cookie 解析會話數據
 */
function parseSessionCookie(cookieValue: string): SessionData | null {
  try {
    const decoded = Buffer.from(cookieValue, 'base64').toString('utf-8');
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

/**
 * 認證提供者（應在應用根部使用）
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // 初始化：從 cookie 讀取會話
  useEffect(() => {
    const initSession = () => {
      try {
        // 從 document.cookie 讀取
        const cookies = document.cookie.split('; ').reduce(
          (acc, cookie) => {
            const [key, value] = cookie.split('=');
            acc[key] = decodeURIComponent(value);
            return acc;
          },
          {} as Record<string, string>
        );

        const authCookie = cookies['auth-session'];
        if (authCookie) {
          const sessionData = parseSessionCookie(authCookie);
          setSession(sessionData);
        }
      } catch (error) {
        console.error('Failed to parse session cookie:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // 需要延遲，確保 DOM 已準備好
    if (typeof document !== 'undefined') {
      initSession();
    }
  }, []);

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setSession(null);
      router.push('/auth/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const value: AuthContextType = {
    session,
    isLoading,
    isAuthenticated: session !== null,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook：使用認證上下文
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth 必須在 AuthProvider 內使用');
  }
  return context;
}

/**
 * Hook：獲取當前租戶 ID
 */
export function useTenantId(): string {
  const { session, isLoading } = useAuth();
  if (isLoading) {
    throw new Error('Session 仍在載入中');
  }
  if (!session) {
    throw new Error('用戶未認證');
  }
  return session.tenantId;
}

/**
 * Hook：檢查認證狀態並在未認證時重定向
 */
export function useRequireAuth() {
  const { session, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isLoading, isAuthenticated, router]);

  return { isReady: !isLoading && isAuthenticated };
}
