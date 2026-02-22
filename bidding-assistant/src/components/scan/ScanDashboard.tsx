// ====== 巡標主面板 ======

"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSettings } from "@/lib/context/settings-context";
import { useScanResults } from "@/lib/scan/useScanResults";
import {
  addExclusion,
  getExcludedJobNumbers,
  addCreatedCase,
  getCreatedJobNumbers,
} from "@/lib/scan/exclusion";
import { DEFAULT_KEYWORD_RULES } from "@/lib/scan/constants";
import { TenderCard } from "./TenderCard";
import { CreateCaseDialog } from "./CreateCaseDialog";
import type { ScanResult, KeywordCategory, KeywordRule } from "@/lib/scan/types";

// ── 分類說明面板 ──────────────────────────────────────────────────────────────

const EXPLAIN_CATEGORY_META: Record<
  "must" | "review" | "exclude",
  { icon: string; label: string; headingClass: string }
> = {
  must: { icon: "⭐", label: "必選", headingClass: "text-yellow-600 dark:text-yellow-400" },
  review: { icon: "🔍", label: "需要看", headingClass: "text-blue-600 dark:text-blue-400" },
  exclude: { icon: "❌", label: "排除", headingClass: "text-red-600 dark:text-red-400" },
};

function ClassificationRulesPanel({ rules }: { rules: KeywordRule[] }) {
  const grouped = {
    must: rules.filter((r) => r.category === "must"),
    review: rules.filter((r) => r.category === "review"),
    exclude: rules.filter((r) => r.category === "exclude"),
  };

  return (
    <div className="rounded-md border bg-muted/50 p-4 text-sm space-y-3">
      <p className="text-xs text-muted-foreground">
        篩選優先序：排除 › 命中關鍵字越長越優先 › ⭐ 必選 › 🔍 需要看 › 其他
      </p>
      <div className="grid gap-4 sm:grid-cols-4">
        {(["must", "review", "exclude"] as const).map((cat) => {
          const meta = EXPLAIN_CATEGORY_META[cat];
          return (
            <div key={cat}>
              <p className={`font-medium mb-1.5 ${meta.headingClass}`}>
                {meta.icon} {meta.label}
              </p>
              <ul className="space-y-1 text-muted-foreground">
                {grouped[cat].map((rule) => (
                  <li key={rule.label} className="flex items-start gap-1">
                    <span className="select-none">·</span>
                    <span>
                      {rule.label}
                      {rule.budgetMax !== undefined && rule.keywords.length === 0 && (
                        <span className="ml-1 text-xs">
                          （預算 ≤ {(rule.budgetMax / 10000).toFixed(0)} 萬）
                        </span>
                      )}
                      {rule.keywords.length > 0 && (
                        <span className="ml-1 text-xs opacity-70">
                          {rule.keywords.join("、")}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
        <div>
          <p className="font-medium mb-1.5 text-muted-foreground">❓ 其他</p>
          <p className="text-muted-foreground text-xs">不符合上述任何規則的標案</p>
        </div>
      </div>
    </div>
  );
}

const TAB_CONFIG: { value: KeywordCategory; label: string; icon: string }[] = [
  { value: "must", label: "推薦", icon: "⭐" },
  { value: "review", label: "需要看", icon: "🔍" },
  { value: "other", label: "其他", icon: "❓" },
  { value: "exclude", label: "已排除", icon: "❌" },
];

export function ScanDashboard() {
  const router = useRouter();
  const { settings } = useSettings();
  const { data, loading, error, scan } = useScanResults();
  const [activeTab, setActiveTab] = useState<KeywordCategory>("must");
  const [showRules, setShowRules] = useState(false);
  // 初始化時從 localStorage 載入排除清單（hydration-safe）
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingResult, setPendingResult] = useState<ScanResult | null>(null);
  const [createdCases, setCreatedCases] = useState<Set<string>>(new Set());
  useEffect(() => {
    setSkipped(new Set(getExcludedJobNumbers()));
    setCreatedCases(new Set(getCreatedJobNumbers()));
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
    // 新掃描保留持久化的記憶（不清空）
    setSkipped(new Set(getExcludedJobNumbers()));
    setCreatedCases(new Set(getCreatedJobNumbers()));
    scan(settings.scan?.searchKeywords);
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
      addCreatedCase(pendingResult.tender.jobNumber);
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
              {data.filteredExpired ? (
                <span className="ml-1">
                  （已過濾 {data.filteredExpired} 筆過期）
                </span>
              ) : null}
              {data.errors && data.errors.length > 0 && (
                <span className="text-yellow-600 ml-2" title={
                  data.errors.map((e: { keyword: string; error: string }) =>
                    `${e.keyword}：${e.error}`
                  ).join("\n")
                }>
                  （{data.errors.map((e: { keyword: string }) => e.keyword).join("、")} 搜尋失敗）
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
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowRules((r) => !r)}
            aria-expanded={showRules}
          >
            {showRules ? "收起說明" : "分類說明"}
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/settings/modules">關鍵字設定</Link>
          </Button>
          <Button onClick={handleScan} disabled={loading}>
            {loading ? "掃描中..." : "手動掃描"}
          </Button>
        </div>
      </div>

      {/* 分類說明面板 */}
      {showRules && <ClassificationRulesPanel rules={DEFAULT_KEYWORD_RULES} />}

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
          <div className="inline-block h-8 w-8 mb-4 animate-spin rounded-full border-4 border-muted border-t-primary" />
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
                      createStatus={createdCases.has(result.tender.jobNumber) ? "done" : "idle"}
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
