/**
 * /auth/login — 登入頁面
 *
 * SaaS Phase 1 登入介面
 * Google Workspace OAuth 登入流程
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLoginClick = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 調用 login API 取得授權 URL
      const response = await fetch('/api/auth/login', {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '登入失敗');
      }

      const { authUrl } = await response.json();

      // 重定向到 Google OAuth 流程
      window.location.href = authUrl;
    } catch (err) {
      const message = err instanceof Error ? err.message : '未知錯誤';
      setError(message);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-3xl font-bold">全能標案助理</CardTitle>
          <CardDescription>SaaS 版本登入</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* 說明 */}
          <div className="text-sm text-muted-foreground text-center space-y-2">
            <p>使用 Google Workspace 帳號登入</p>
            <p className="text-xs">僅允許公司域名使用者登入</p>
          </div>

          {/* 錯誤訊息 */}
          {error && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* 登入按鈕 */}
          <Button
            onClick={handleLoginClick}
            disabled={isLoading}
            size="lg"
            className="w-full"
          >
            {isLoading ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                登入中...
              </>
            ) : (
              <>
                <span className="mr-2">🔐</span>
                使用 Google 登入
              </>
            )}
          </Button>

          {/* 底部說明 */}
          <div className="text-xs text-muted-foreground text-center">
            <p>首次登入時會自動建立帳號</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
