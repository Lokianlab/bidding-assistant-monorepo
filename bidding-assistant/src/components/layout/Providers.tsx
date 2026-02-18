"use client";

import type { ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { SettingsProvider } from "@/lib/context/settings-context";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SettingsProvider>
      <TooltipProvider>
        {children}
        <Toaster />
      </TooltipProvider>
    </SettingsProvider>
  );
}
