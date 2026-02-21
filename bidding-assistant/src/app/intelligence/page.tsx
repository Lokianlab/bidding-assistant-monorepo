"use client";

import { MobileMenuButton } from "@/components/layout/Sidebar";
import { PCCSearchPanel } from "@/components/pcc/PCCSearchPanel";

export default function IntelligencePage() {
  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <MobileMenuButton />
        <div>
          <h1 className="text-2xl font-bold">情報搜尋</h1>
          <p className="text-muted-foreground text-sm mt-1">
            查詢政府標案公開資料：案件搜尋、廠商投標紀錄、評委名單、決標金額
          </p>
        </div>
      </div>

      {/* 搜尋面板 */}
      <PCCSearchPanel />
    </div>
  );
}
