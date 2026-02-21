"use client";

import { type ReactNode, useState, useEffect } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { SettingsProvider } from "@/lib/context/settings-context";

export function Providers({ children }: { children: ReactNode }) {
  // radix-ui@1.4.3 TooltipProvider + sonner Toaster 在 Next.js 16 + React 19 的
  // SSR 階段會觸發 "Cannot read properties of null (reading 'useRef')"。
  // 延遲到 client mount 後才渲染這些元件。
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <SettingsProvider>
      {mounted ? (
        <TooltipProvider>
          {children}
          <Toaster />
        </TooltipProvider>
      ) : (
        children
      )}
    </SettingsProvider>
  );
}
