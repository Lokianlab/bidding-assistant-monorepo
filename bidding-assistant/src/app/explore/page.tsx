"use client";

import { MobileMenuButton } from "@/components/layout/Sidebar";
import { ExplorerPage } from "@/components/explore/ExplorerPage";

export default function ExplorePage() {
  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <MobileMenuButton />
        <div>
          <h1 className="text-2xl font-bold">情報探索</h1>
          <p className="text-muted-foreground text-sm mt-1">
            搜尋標案、點進詳情、再鑽進廠商或機關，無限探索
          </p>
        </div>
      </div>

      {/* Explorer 主體 */}
      <ExplorerPage />
    </div>
  );
}
