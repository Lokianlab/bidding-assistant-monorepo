// ====== 巡標主面板 ======

"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useScanResults } from "@/lib/scan/useScanResults";
import {
  addExclusion,
  getExcludedJobNumbers,
} from "@/lib/scan/exclusion";
import { TenderCard } from "./TenderCard";
import { CreateCaseDialog } from "./CreateCaseDialog";
import type { ScanResult, KeywordCategory } from "@/lib/scan/types";

const TAB_CONFIG: { value: KeywordCategory; label: string; icon: string }[] = [
  { value: "must", label: "推薦", icon: "⭐" },
  { value: "review", label: "需要看", icon: "🔍" },
  { value: "other", label: "其他", icon: "❓" },
  { value: "exclude", label: "已排除", icon: "❌" },
];

export function ScanDashboard() {
  const router = useRouter();
  const { data, loading, error, scan } = useScanResults();
  const [activeTab, setActiveTab] = useState<KeywordCategory>("must");
  // 初始化時從 localStorage 載入排除清單（hydration-safe）
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingResult, setPendingResult] = useState<ScanResult | null>(null);
  const [createdCases, setCreatedCases] = useState<Set<string>>(new Set());
  useEffect(() => {
    setSkipped(new Set(getExcludedJobNumbers()));
  }, []);

  // 按類別分組
  const grouped = useMemo(() => {
    if (!data) return null;
    const groups: Record<KeywordCategory, ScanResult[]> = {
      must: [],
      review: [],
      other: [],
      exclude: [],
    };
    for (const r of data.results) {
      if (!skipped.has(r.tender.jobNumber)) {
        groups[r.classification.category].push(r);
      }
    }
    return groups;
  }, [data, skipped]);

  const handleScan = () => {
    // 新掃描保留持久化的排除記憶（不清空）
    setSkipped(new Set(getExcludedJobNumbers()));
    scan();
  };

  const handleSkip = (result: ScanResult) => {
    addExclusion(result.tender.jobNumber);
    setSkipped((prev) => new Set(prev).add(result.tender.jobNumber));
  };

  const handleCreateCase = (result: ScanResult) => {
    setPendingResult(result);
    setDialogOpen(true);
  };

  const handleCreateSuccess = (pageUrl: string) => {
    if (pendingResult) {
      setCreatedCases((prev) => new Set(prev).add(pendingResult.tender.jobNumber));
    }
    setDialogOpen(false);
    setPendingResult(null);
    if (pageUrl) {
      window.open(pageUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleViewDetail = (result: ScanResult) => {
    const title = result.tender.title;
    router.push(`/intelligence?search=${encodeURIComponent(title)}`);
  };

  return (
    <div className="space-y-6">
      <CreateCaseDialog
        result={pendingResult}
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setPendingResult(null); }}
        onSuccess={handleCreateSuccess}
      />

      {/* 控制列 */}
      <div className="flex items-center justify-between">
        <div>
          {data && (
            <p className="text-sm text-muted-foreground">
              共 {data.totalRaw} 筆公告，
              推薦 {data.counts.must} 筆，
              待審 {data.counts.review} 筆
              {data.errors && data.errors.length > 0 && (
                <span className="text-yellow-600 ml-2">
                  （{data.errors.length} 個關鍵字搜尋失敗）
                </span>
              )}
              {createdCases.size > 0 && (
                <span className="text-green-600 dark:text-green-400 ml-2">
                  ✅ 已建案 {createdCases.size} 筆
                </span>
              )}
            </p>
          )}
        </div>
        <Button onClick={handleScan} disabled={loading}>
          {loading ? "掃描中..." : "手動掃描"}
        </Button>
      </div>

      {/* 錯誤訊息 */}
      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-950 p-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* 尚未掃描的初始狀態 */}
      {!data && !loading && !error && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg mb-2">點擊「手動掃描」開始巡標</p>
          <p className="text-sm">系統會用預設關鍵字搜尋 PCC 最新公告，自動分類後呈現給你</p>
        </div>
      )}

      {/* 載入中 */}
      {loading && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg mb-2">正在搜尋 PCC 公告...</p>
          <p className="text-sm">搜尋多個關鍵字需要一些時間，請稍候</p>
        </div>
      )}

      {/* 結果面板 */}
      {data && grouped && !loading && (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as KeywordCategory)}>
          <TabsList className="w-full justify-start">
            {TAB_CONFIG.map(({ value, label, icon }) => (
              <TabsTrigger key={value} value={value} className="gap-1">
                <span>{icon}</span>
                <span>{label}</span>
                <Badge variant="secondary" className="ml-1 text-xs">
                  {grouped[value].length}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          {TAB_CONFIG.map(({ value }) => (
            <TabsContent key={value} value={value} className="mt-4">
              {grouped[value].length === 0 ? (
                <p className="text-center py-8 text-muted-foreground text-sm">
                  這個類別沒有標案
                </p>
              ) : (
                <div className="space-y-2">
                  {grouped[value].map((result) => (
                    <TenderCard
                      key={`${result.tender.jobNumber}:${result.tender.unit}`}
                      result={result}
                      onSkip={handleSkip}
                      onCreateCase={value !== "exclude" ? handleCreateCase : undefined}
                      onViewDetail={handleViewDetail}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
