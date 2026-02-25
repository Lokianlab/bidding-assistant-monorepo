"use client";

// ====== M03 戰略分析頁面 ======

import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { MobileMenuButton } from "@/components/layout/Sidebar";
import { FitScoreCard } from "@/components/strategy/FitScoreCard";
import { useFitScore } from "@/lib/strategy/useFitScore";
import { useKnowledgeBase } from "@/lib/knowledge-base/useKnowledgeBase";
import { useSettings } from "@/lib/context/settings-context";
import { readCachedIntelligence } from "@/lib/strategy/intelligence-bridge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { loadCache } from "@/lib/dashboard/helpers";
import type { NotionPage } from "@/lib/dashboard/types";
import { F } from "@/lib/dashboard/types";

export default function StrategyPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: kb, hydrated } = useKnowledgeBase();
  const { settings } = useSettings();

  // 來源案件 ID（從 case-work 進入時帶入，用於「← 回到案件」按鈕）
  const caseId = searchParams.get("caseId") || "";

  // URL 參數模式：從 case-work 帶真實案件資料進來
  const urlCaseName = searchParams.get("caseName") || "";
  const urlAgency = searchParams.get("agency") || "";
  const urlBudget = searchParams.get("budget") || "";
  const hasUrlParams = !!urlCaseName;

  // ── 選擇器模式（直接從側欄進入）──
  const [cachedPages, setCachedPages] = useState<NotionPage[]>([]);
  const [caseSearch, setCaseSearch] = useState("");
  const [selectedPage, setSelectedPage] = useState<NotionPage | null>(null);

  useEffect(() => {
    const cached = loadCache();
    if (cached?.pages?.length) setCachedPages(cached.pages);
  }, []);

  const filteredCases = useMemo(() => {
    const kw = caseSearch.toLowerCase();
    return cachedPages
      .filter((p) => {
        if (!kw) return true;
        const name = String(p.properties[F.名稱] ?? "").toLowerCase();
        const ag = String(p.properties[F.招標機關] ?? "").toLowerCase();
        return name.includes(kw) || ag.includes(kw);
      })
      .slice(0, 30);
  }, [cachedPages, caseSearch]);

  // ── 分析用資料（URL 模式 or 快取選案）──
  const caseName = hasUrlParams
    ? urlCaseName
    : String(selectedPage?.properties[F.名稱] ?? "");

  const agency = hasUrlParams
    ? urlAgency
    : String(selectedPage?.properties[F.招標機關] ?? "");

  const budget: number | null = hasUrlParams
    ? (parseFloat(urlBudget.replace(/[^0-9.]/g, "")) || null)
    : (typeof selectedPage?.properties[F.預算] === "number"
        ? (selectedPage.properties[F.預算] as number)
        : null);

  // ── 送出後鎖定分析 ──
  const [submitted, setSubmitted] = useState(false);
  const [frozenInput, setFrozenInput] = useState({
    caseName: "",
    agency: "",
    budget: null as number | null,
  });

  const handleAnalyze = () => {
    if (!caseName.trim()) return;
    setFrozenInput({ caseName: caseName.trim(), agency: agency.trim(), budget });
    setSubmitted(true);
  };

  // 從 PCC 快取被動讀取情報資料（不發 API 請求）
  const intelligence = useMemo(
    () =>
      hydrated && frozenInput.caseName
        ? readCachedIntelligence(settings.company?.brand || "", frozenInput.caseName)
        : { selfAnalysis: null, marketTrend: null, tenderSummary: null },
    [hydrated, frozenInput.caseName, settings.company?.brand],
  );

  const { fitScore, kbMatch } = useFitScore(
    frozenInput.caseName,
    frozenInput.agency,
    frozenInput.budget,
    intelligence,
    kb,
  );

  // URL 模式：帶參數進來時自動分析
  const [autoAnalyzed, setAutoAnalyzed] = useState(false);
  useEffect(() => {
    if (autoAnalyzed || !hydrated || !hasUrlParams) return;
    if (urlCaseName.trim()) {
      handleAnalyze();
      setAutoAnalyzed(true);
    }
  }, [hydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasKBData = kb["00A"].length > 0 || kb["00B"].length > 0;
  const canAnalyze = hasUrlParams || !!selectedPage;

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <MobileMenuButton />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">戰略分析</h1>
            {caseId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/case-work?id=${caseId}`)}
              >
                ← 回到案件
              </Button>
            )}
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            五維適配度評分，協助決策是否投標
          </p>
        </div>
      </div>

      {/* ── 選擇器模式（直接從側欄進入，無 URL 參數） ── */}
      {!hasUrlParams && (
        <div className="rounded-lg border p-4 space-y-3">
          <h2 className="font-semibold">選擇要分析的案件</h2>

          {cachedPages.length === 0 ? (
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>尚無 Notion 案件資料。請先連線 Notion，再從案件看板進入。</p>
              <Link href="/case-board">
                <Button variant="outline" size="sm">前往案件看板</Button>
              </Link>
            </div>
          ) : (
            <>
              <Input
                placeholder="搜尋案名或機關..."
                value={caseSearch}
                onChange={(e) => { setCaseSearch(e.target.value); setSubmitted(false); }}
                className="h-8 text-sm"
              />
              <div className="max-h-64 overflow-y-auto border rounded divide-y text-sm">
                {filteredCases.length === 0 && (
                  <p className="p-3 text-muted-foreground">無符合案件</p>
                )}
                {filteredCases.map((p) => {
                  const name = String(p.properties[F.名稱] ?? "（無名稱）");
                  const ag = String(p.properties[F.招標機關] ?? "");
                  const bdg = p.properties[F.預算];
                  const isSelected = selectedPage?.id === p.id;
                  return (
                    <button
                      key={p.id}
                      className={`w-full text-left px-3 py-2 hover:bg-accent transition-colors ${isSelected ? "bg-accent font-medium" : ""}`}
                      onClick={() => { setSelectedPage(p); setSubmitted(false); }}
                    >
                      <div className="truncate">{name}</div>
                      {ag && (
                        <div className="text-xs text-muted-foreground truncate">
                          {ag}
                          {typeof bdg === "number" && ` · ${bdg.toLocaleString("zh-TW")} 元`}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              {selectedPage && (
                <p className="text-xs text-green-600">
                  ✓ 已選擇：{String(selectedPage.properties[F.名稱] ?? "")}
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* ── URL 模式：顯示帶入的案件資訊 ── */}
      {hasUrlParams && (
        <div className="rounded-lg border p-4 space-y-1">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">分析案件</p>
          <p className="font-medium">{urlCaseName}</p>
          {urlAgency && <p className="text-sm text-muted-foreground">{urlAgency}</p>}
          {budget && (
            <p className="text-sm text-muted-foreground">
              預算：{budget.toLocaleString("zh-TW")} 元
            </p>
          )}
        </div>
      )}

      {/* ── 分析按鈕 ── */}
      {canAnalyze && !submitted && (
        <div className="space-y-2">
          {!hasKBData && hydrated && (
            <p className="text-xs text-yellow-600">
              ⚠️ 知識庫尚無資料（00A 團隊、00B 實績），評分準確度較低。請先到「知識庫管理」新增資料。
            </p>
          )}
          <Button onClick={handleAnalyze} disabled={!caseName.trim()}>
            開始分析
          </Button>
        </div>
      )}

      {/* ── 分析結果 ── */}
      {submitted && fitScore && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">
              分析結果：
              <span className="text-muted-foreground font-normal ml-2">
                {frozenInput.caseName}
              </span>
            </h2>
            <Button variant="outline" size="sm" onClick={() => setSubmitted(false)}>
              重新選擇
            </Button>
          </div>
          {intelligence.selfAnalysis && (
            <p className="text-xs text-green-600">
              ✓ 機關熟悉度評分基於 PCC 歷史投標紀錄
            </p>
          )}
          {intelligence.marketTrend && (
            <p className="text-xs text-green-600">
              ✓ 競爭強度評分基於「{intelligence.marketTrend.keyword}」市場趨勢實際資料
            </p>
          )}
          <FitScoreCard fitScore={fitScore} kbMatch={kbMatch} />

          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              className="w-full"
              onClick={() => {
                const params = new URLSearchParams({ stage: "L1" });
                if (frozenInput.caseName) params.set("caseName", frozenInput.caseName);
                if (frozenInput.agency) params.set("agency", frozenInput.agency);
                params.set("verdict", fitScore.verdict);
                params.set("total", String(fitScore.total));
                if (caseId) params.set("caseId", caseId);
                router.push(`/assembly?${params.toString()}`);
              }}
            >
              開始撰寫（進入提示詞組裝）
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
