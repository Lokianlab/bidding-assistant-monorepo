"use client";

// ====== P1 案件工作頁 ======
// 單一案件全視角：案件資訊 + 備標進度 + 戰略分析 + 情報摘要 + 行動按鈕

import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { MobileMenuButton } from "@/components/layout/Sidebar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { NotionPage } from "@/lib/dashboard/types";
import {
  F,
  DEFAULT_STATUS_COLORS,
  DEFAULT_PRIORITY_COLORS,
} from "@/lib/dashboard/types";
import { fmt, fmtDateTime, parseDateField } from "@/lib/dashboard/helpers";
import { loadCaseById } from "@/lib/case-work/helpers";
import { getCaseProgress, calculateProgress } from "@/lib/case-board/helpers";
import type { CaseProgress } from "@/lib/case-board/types";
import { useFitScore } from "@/lib/strategy/useFitScore";
import { useKnowledgeBase } from "@/lib/knowledge-base/useKnowledgeBase";
import { useSettings } from "@/lib/context/settings-context";
import { readCachedIntelligence } from "@/lib/strategy/intelligence-bridge";
import { FitScoreCard } from "@/components/strategy/FitScoreCard";
import { STAGES } from "@/data/config/stages";

// ── Helpers ────────────────────────────────────────

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className="text-sm">{children || "—"}</span>
    </div>
  );
}

const STAGE_STATUS_STYLES: Record<string, string> = {
  completed: "bg-green-50 text-green-700",
  "in-progress": "bg-blue-50 text-blue-700",
  skipped: "bg-gray-50 text-gray-400 line-through",
  "not-started": "bg-muted/30 text-gray-400",
};

const STAGE_STATUS_ICONS: Record<string, string> = {
  completed: "\u2713",
  "in-progress": "\u25CF",
  skipped: "\u2298",
  "not-started": "\u25CB",
};

// ── Page ───────────────────────────────────────────

export default function CaseWorkPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pageId = searchParams.get("id") || "";

  const { data: kb, hydrated: kbHydrated } = useKnowledgeBase();
  const { settings, hydrated: settingsHydrated } = useSettings();

  const [page, setPage] = useState<NotionPage | null>(null);
  const [progress, setProgress] = useState<CaseProgress | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [notFound, setNotFound] = useState(false);

  // 從快取載入案件
  useEffect(() => {
    if (!pageId) {
      setHydrated(true);
      return;
    }
    const loaded = loadCaseById(pageId);
    if (loaded) {
      setPage(loaded);
      setProgress(getCaseProgress(pageId));
    } else {
      setNotFound(true);
    }
    setHydrated(true);
  }, [pageId]);

  // 案件欄位
  const p = page?.properties;
  const caseName = p ? String(p[F.名稱] || "") : "";
  const agency = p ? String(p[F.招標機關] || "") : "";
  const budget =
    p && typeof p[F.預算] === "number" ? (p[F.預算] as number) : null;

  // 截標倒數
  const deadlineInfo = useMemo(() => {
    if (!p || !p[F.截標]) return null;
    const ts = parseDateField(p[F.截標]);
    if (!ts) return null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const daysLeft = Math.ceil((ts - now.getTime()) / 86400000);
    return { daysLeft, dateStr: fmtDateTime(p[F.截標]) };
  }, [p]);

  // 情報（被動讀快取）
  const intelligence = useMemo(() => {
    if (!kbHydrated || !caseName)
      return { selfAnalysis: null, marketTrend: null, tenderSummary: null };
    return readCachedIntelligence(
      settings.company?.brand || "",
      caseName,
    );
  }, [kbHydrated, caseName, settings.company?.brand]);

  // 戰略評分
  const { fitScore, kbMatch } = useFitScore(
    caseName,
    agency,
    budget,
    intelligence,
    kb,
  );

  // 備標進度
  const progressPercent = progress
    ? calculateProgress(progress.stages)
    : 0;

  // ── 空狀態 ──

  if (!pageId) {
    return (
      <div className="p-6 max-w-4xl">
        <div className="flex items-center gap-3 mb-4">
          <MobileMenuButton />
          <h1 className="text-2xl font-bold">案件工作頁</h1>
        </div>
        <p className="text-muted-foreground">
          請從案件看板選擇一個案件。
        </p>
        <Link href="/case-board">
          <Button variant="outline" className="mt-4">
            前往案件看板
          </Button>
        </Link>
      </div>
    );
  }

  if (!hydrated || !settingsHydrated) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground animate-pulse">載入中...</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="p-6 max-w-4xl">
        <div className="flex items-center gap-3 mb-4">
          <MobileMenuButton />
          <h1 className="text-2xl font-bold">找不到案件</h1>
        </div>
        <p className="text-muted-foreground">
          該案件可能已從快取中清除，請重新從案件看板進入。
        </p>
        <Link href="/case-board">
          <Button variant="outline" className="mt-4">
            前往案件看板
          </Button>
        </Link>
      </div>
    );
  }

  if (!page || !p) return null;

  const statusColor =
    DEFAULT_STATUS_COLORS[p[F.進程]] ?? "bg-gray-100 text-gray-600";
  const priorityColor =
    DEFAULT_PRIORITY_COLORS[p[F.投遞序位]] ?? "bg-gray-100 text-gray-600";

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* ── Header ── */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <MobileMenuButton />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/case-board")}
          >
            &larr; 案件看板
          </Button>
          {page.url && page.url !== "#" && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto text-xs"
              onClick={() => window.open(page.url, "_blank")}
            >
              在 Notion 中開啟 &nearr;
            </Button>
          )}
        </div>

        <h1 className="text-xl sm:text-2xl font-bold leading-snug">
          {caseName || "未命名標案"}
        </h1>

        <div className="flex flex-wrap items-center gap-2 mt-2">
          {p[F.進程] && <Badge className={statusColor}>{p[F.進程]}</Badge>}
          {p[F.投遞序位] && (
            <Badge className={priorityColor}>{p[F.投遞序位]}</Badge>
          )}
          {p[F.決策] && <Badge variant="outline">{p[F.決策]}</Badge>}
          {deadlineInfo && (
            <span
              className={`text-xs ml-2 ${
                deadlineInfo.daysLeft <= 3
                  ? "text-red-600 font-medium"
                  : deadlineInfo.daysLeft <= 7
                    ? "text-amber-600"
                    : "text-muted-foreground"
              }`}
            >
              截標 {deadlineInfo.dateStr}
              {deadlineInfo.daysLeft > 0
                ? `（${deadlineInfo.daysLeft} 天後）`
                : deadlineInfo.daysLeft === 0
                  ? "（今天）"
                  : `（已過期 ${Math.abs(deadlineInfo.daysLeft)} 天）`}
            </span>
          )}
        </div>
      </div>

      {/* ── 案件資訊 ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">基本資訊</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Field label="案號">{p[F.案號]}</Field>
            <Field label="招標機關">{p[F.招標機關]}</Field>
            <Field label="評審方式">{p[F.評審方式]}</Field>
            <Field label="標案類型">
              {Array.isArray(p[F.標案類型])
                ? p[F.標案類型].join("、")
                : p[F.標案類型]}
            </Field>
            <Field label="案件唯一碼">{p[F.唯一碼]}</Field>
            <Field label="檔案型態">{p[F.檔案型態]}</Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">投標資訊</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Field label="預算金額">
              {budget ? `$${fmt(budget)}` : null}
            </Field>
            <Field label="截標時間">{fmtDateTime(p[F.截標])}</Field>
            <Field label="評選日期">{fmtDateTime(p[F.評選日期])}</Field>
            <Field label="備標期限">{fmtDateTime(p[F.備標期限])}</Field>
            <Field label="押標金">
              {p[F.押標金] ? `$${fmt(p[F.押標金])}` : null}
            </Field>
            <Field label="領標費">
              {p[F.領標費] ? `$${fmt(p[F.領標費])}` : null}
            </Field>
          </CardContent>
        </Card>
      </div>

      {/* ── 備標進度 ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            備標進度
            <span className="text-xs font-normal text-muted-foreground">
              {progressPercent}% 完成
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* 進度條 */}
          <div className="w-full h-2 bg-muted rounded-full mb-4">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* 階段格 */}
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {STAGES.map((stage) => {
              const sp = progress?.stages.find(
                (s) => s.stageId === stage.id,
              );
              const status = sp?.status || "not-started";
              return (
                <div
                  key={stage.id}
                  className={`flex flex-col items-center gap-1 p-2 rounded text-center ${STAGE_STATUS_STYLES[status]}`}
                >
                  <span className="text-sm">
                    {STAGE_STATUS_ICONS[status]}
                  </span>
                  <span className="text-[10px] font-medium">{stage.id}</span>
                  <span className="text-[9px] text-muted-foreground leading-tight">
                    {stage.name}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── 戰略分析 + 情報摘要 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">戰略分析</CardTitle>
            </CardHeader>
            <CardContent>
              {fitScore ? (
                <FitScoreCard fitScore={fitScore} kbMatch={kbMatch} />
              ) : !kbHydrated ? (
                <p className="text-sm text-muted-foreground animate-pulse">
                  計算中...
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  無法計算評分（缺少案件名稱或知識庫資料）
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">情報摘要</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <IntelItem
              label="競爭分析"
              available={!!intelligence.selfAnalysis}
            />
            <IntelItem
              label="市場趨勢"
              available={!!intelligence.marketTrend}
            />
            <IntelItem
              label="標案摘要"
              available={!!intelligence.tenderSummary}
            />
            <Separator />
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              onClick={() => {
                const params = new URLSearchParams();
                if (caseName) params.set("q", caseName);
                router.push(`/intelligence?${params.toString()}`);
              }}
            >
              前往情報搜尋
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* ── 行動 ── */}
      <Card>
        <CardContent className="pt-4 flex flex-col sm:flex-row gap-2">
          <Button
            className="flex-1"
            onClick={() => {
              const params = new URLSearchParams({ stage: "L1" });
              if (caseName) params.set("caseName", caseName);
              if (agency) params.set("agency", agency);
              if (fitScore) {
                params.set("verdict", fitScore.verdict);
                params.set("total", String(fitScore.total));
              }
              router.push(`/assembly?${params.toString()}`);
            }}
          >
            開始撰寫（進入提示詞組裝）
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              const params = new URLSearchParams();
              if (caseName) params.set("caseName", caseName);
              if (agency) params.set("agency", agency);
              if (budget) params.set("budget", String(budget));
              router.push(`/strategy?${params.toString()}`);
            }}
          >
            詳細戰略分析
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────

function IntelItem({
  label,
  available,
}: {
  label: string;
  available: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs">{label}</span>
      {available ? (
        <Badge
          variant="outline"
          className="text-green-600 border-green-300 text-[10px]"
        >
          已有
        </Badge>
      ) : (
        <Badge variant="outline" className="text-gray-400 text-[10px]">
          尚無
        </Badge>
      )}
    </div>
  );
}
