"use client";

import { useState, useCallback } from "react";
import { MobileMenuButton } from "@/components/layout/Sidebar";
import { PCCSearchPanel } from "@/components/pcc/PCCSearchPanel";
import { CompetitorAnalysis } from "@/components/pcc/CompetitorAnalysis";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function IntelligencePage() {
  const [tab, setTab] = useState("search");
  const [targetCompany, setTargetCompany] = useState<string | null>(null);

  const handleViewCompany = useCallback((companyName: string) => {
    setTargetCompany(companyName);
    setTab("analysis");
  }, []);

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

      {/* 主要功能 Tab */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="search">案件搜尋</TabsTrigger>
          <TabsTrigger value="analysis">競爭分析</TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="mt-4">
          <PCCSearchPanel onViewCompany={handleViewCompany} />
        </TabsContent>

        <TabsContent value="analysis" className="mt-4">
          <CompetitorAnalysis
            targetCompany={targetCompany}
            onTargetConsumed={() => setTargetCompany(null)}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
