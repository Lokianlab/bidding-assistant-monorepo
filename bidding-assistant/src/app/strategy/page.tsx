"use client";

// ====== M03 戰略分析頁面 ======

import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { MobileMenuButton } from "@/components/layout/Sidebar";
import { FitScoreCard } from "@/components/strategy/FitScoreCard";
import { useFitScore } from "@/lib/strategy/useFitScore";
import { useKnowledgeBase } from "@/lib/knowledge-base/useKnowledgeBase";
import { useSettings } from "@/lib/context/settings-context";
import { readCachedIntelligence } from "@/lib/strategy/intelligence-bridge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function StrategyPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: kb, hydrated } = useKnowledgeBase();
  const { settings } = useSettings();

  // 來源案件 ID（從 case-work 進入時帶入，用於「← 回到案件」按鈕）
  const caseId = searchParams.get("caseId") || "";

  // 表單狀態（從 URL 參數或空值初始化）
  const [caseName, setCaseName] = useState(searchParams.get("caseName") || "");
  const [agency, setAgency] = useState(searchParams.get("agency") || "");
  const [budgetInput, setBudgetInput] = useState(searchParams.get("budget") || "");

  // 送出後鎖定分析
  const [submitted, setSubmitted] = useState(false);
  const [frozenInput, setFrozenInput] = useState({
    caseName: "",
    agency: "",
    budget: null as number | null,
  });

  const handleAnalyze = () => {
    if (!caseName.trim()) return;
    const budget = budgetInput
      ? parseFloat(budgetInput.replace(/[^0-9.]/g, ""))
      : null;
    setFrozenInput({
      caseName: caseName.trim(),
      agency: agency.trim(),
      budget: isNaN(budget ?? NaN) ? null : budget,
    });
    setSubmitted(true);
  };

  // 從 PCC 快取被動讀取已有的情報資料（不發 API 請求）
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

  // 從情報頁帶參數過來時自動分析
  const [autoAnalyzed, setAutoAnalyzed] = useState(false);
  useEffect(() => {
    if (autoAnalyzed || !hydrated) return;
    const urlCaseName = searchParams.get("caseName");
    if (urlCaseName && urlCaseName.trim()) {
      handleAnalyze();
      setAutoAnalyzed(true);
    }
  }, [hydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasKBData =
    kb["00A"].length > 0 || kb["00B"].length > 0;

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

      {/* 輸入表單 */}
      <div className="rounded-lg border p-4 space-y-4">
        <h2 className="font-semibold">案件資訊</h2>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="caseName">案件名稱 *</Label>
            <Input
              id="caseName"
              placeholder="例：114 年臺灣文化節活動策展計畫"
              value={caseName}
              onChange={(e) => {
                setCaseName(e.target.value);
                setSubmitted(false);
              }}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="agency">機關名稱</Label>
              <Input
                id="agency"
                placeholder="例：文化部"
                value={agency}
                onChange={(e) => {
                  setAgency(e.target.value);
                  setSubmitted(false);
                }}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="budget">預算金額（元）</Label>
              <Input
                id="budget"
                placeholder="例：5000000"
                value={budgetInput}
                onChange={(e) => {
                  setBudgetInput(e.target.value);
                  setSubmitted(false);
                }}
              />
            </div>
          </div>
        </div>

        {!hasKBData && hydrated && (
          <p className="text-xs text-yellow-600">
            ⚠️ 知識庫尚無資料（00A 團隊、00B 實績），評分準確度較低。請先到「知識庫管理」新增資料。
          </p>
        )}
        {submitted && intelligence.selfAnalysis && (
          <p className="text-xs text-green-600">
            ✓ 已自動載入情報模組的競爭分析資料，機關熟悉度評分基於歷史投標紀錄
          </p>
        )}
        {submitted && intelligence.marketTrend && (
          <p className="text-xs text-green-600">
            ✓ 已自動載入「{intelligence.marketTrend.keyword}」市場趨勢，競爭強度評分基於實際資料
          </p>
        )}

        <Button
          onClick={handleAnalyze}
          disabled={!caseName.trim()}
          className="w-full md:w-auto"
        >
          開始分析
        </Button>
      </div>

      {/* 分析結果 */}
      {submitted && fitScore && (
        <div className="space-y-4">
          <h2 className="font-semibold">
            分析結果：
            <span className="text-muted-foreground font-normal ml-2">
              {frozenInput.caseName}
            </span>
          </h2>
          <FitScoreCard fitScore={fitScore} kbMatch={kbMatch} />

          {/* 跨模組導航 */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              className="w-full"
              onClick={() => {
                const params = new URLSearchParams({ stage: "L1" });
                if (frozenInput.caseName) params.set("caseName", frozenInput.caseName);
                if (frozenInput.agency) params.set("agency", frozenInput.agency);
                if (fitScore) {
                  params.set("verdict", fitScore.verdict);
                  params.set("total", String(fitScore.total));
                }
                if (caseId) params.set("caseId", caseId);
                router.push(`/assembly?${params.toString()}`);
              }}
            >
              開始撰寫（進入提示詞組裝）
            </Button>
          </div>
        </div>
      )}

      {submitted && !fitScore && (
        <p className="text-muted-foreground text-sm">
          請輸入案件名稱後再進行分析。
        </p>
      )}
    </div>
  );
}
