"use client";

import { useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { MobileMenuButton } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { PCCSearchPanel } from "@/components/pcc/PCCSearchPanel";
import { CompetitorAnalysis } from "@/components/pcc/CompetitorAnalysis";
import { MarketTrend } from "@/components/pcc/MarketTrend";
import { CommitteeNetwork } from "@/components/pcc/CommitteeNetwork";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PCCSearchMode } from "@/lib/pcc/types";

export default function IntelligencePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialSearch = searchParams.get("search") ?? undefined;
  const initialMode = (searchParams.get("mode") as PCCSearchMode) || undefined;
  const caseId = searchParams.get("caseId") || "";

  const [tab, setTab] = useState("search");
  const [targetCompany, setTargetCompany] = useState<string | null>(null);
  const [targetAgency, setTargetAgency] = useState<{ unitId: string; unitName: string } | null>(null);

  const handleViewCompany = useCallback((companyName: string) => {
    setTargetCompany(companyName);
    setTab("analysis");
  }, []);

  const handleViewCommittee = useCallback((unitId: string, unitName: string) => {
    setTargetAgency({ unitId, unitName });
    setTab("committee");
  }, []);

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <MobileMenuButton />
        <div className="flex-1">
          <h1 className="text-2xl font-bold">情報搜尋</h1>
          <p className="text-muted-foreground text-sm mt-1">
            查詢政府標案公開資料：案件搜尋、廠商投標紀錄、評委名單、決標金額
          </p>
        </div>
        {/* 跨模組導航：從案件頁進入時顯示「前往戰略分析」按鈕 */}
        {initialSearch && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const params = new URLSearchParams({ caseName: initialSearch });
              if (caseId) params.set("caseId", caseId);
              router.push(`/strategy?${params.toString()}`);
            }}
          >
            前往戰略分析 →
          </Button>
        )}
      </div>

      {/* 主要功能 Tab */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="search">案件搜尋</TabsTrigger>
          <TabsTrigger value="analysis">競爭分析</TabsTrigger>
          <TabsTrigger value="market">市場趨勢</TabsTrigger>
          <TabsTrigger value="committee">評委分析</TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="mt-4">
          <PCCSearchPanel
            onViewCompany={handleViewCompany}
            onViewCommittee={handleViewCommittee}
            initialQuery={initialSearch}
            initialMode={initialMode}
          />
        </TabsContent>

        <TabsContent value="analysis" className="mt-4">
          <CompetitorAnalysis
            targetCompany={targetCompany}
            onTargetConsumed={() => setTargetCompany(null)}
            onViewCommittee={handleViewCommittee}
          />
        </TabsContent>

        <TabsContent value="market" className="mt-4">
          <MarketTrend onViewCommittee={handleViewCommittee} />
        </TabsContent>

        <TabsContent value="committee" className="mt-4">
          <CommitteeNetwork
            targetAgency={targetAgency}
            onTargetConsumed={() => setTargetAgency(null)}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
