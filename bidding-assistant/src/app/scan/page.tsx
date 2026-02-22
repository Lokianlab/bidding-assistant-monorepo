// ====== 行政巡標頁面 ======

"use client";

import { MobileMenuButton } from "@/components/layout/Sidebar";
import { ScanDashboard } from "@/components/scan/ScanDashboard";

export default function ScanPage() {
  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <MobileMenuButton />
        <div>
          <h1 className="text-2xl font-bold">行政巡標</h1>
          <p className="text-muted-foreground text-sm mt-1">
            搜尋 PCC 最新公告，自動分類，一鍵建案到 Notion
          </p>
        </div>
      </div>

      <ScanDashboard />
    </div>
  );
}
