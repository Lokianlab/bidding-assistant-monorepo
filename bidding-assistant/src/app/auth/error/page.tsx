/**
 * /auth/error — 認證錯誤頁面
 */

'use client';

import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error') || '未知的登入錯誤';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted p-4">
      <Card className="w-full max-w-md border-destructive/50">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-2xl text-destructive">登入失敗</CardTitle>
          <CardDescription>發生錯誤，無法完成登入</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="p-3 bg-destructive/10 rounded-lg">
            <p className="text-sm text-destructive">{error}</p>
          </div>

          <p className="text-xs text-muted-foreground">
            請檢查是否使用了公司 Google Workspace 帳號登入。
          </p>

          <Button variant="outline" onClick={() => window.location.href = '/auth/login'} className="w-full">
            返回登入頁面
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
