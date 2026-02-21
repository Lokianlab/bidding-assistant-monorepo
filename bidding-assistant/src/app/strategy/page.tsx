"use client";

// ====== M03 戰略分析頁面 ======

import { useState, useMemo } from "react";
import { MobileMenuButton } from "@/components/layout/Sidebar";
import { FitScoreCard } from "@/components/strategy/FitScoreCard";
import { useFitScore } from "@/lib/strategy/useFitScore";
import { useKnowledgeBase } from "@/lib/knowledge-base/useKnowledgeBase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { IntelligenceInputs } from "@/lib/strategy/types";

const EMPTY_INTELLIGENCE: IntelligenceInputs = {
  selfAnalysis: null,
  marketTrend: null,
  tenderSummary: null,
};

export default function StrategyPage() {
  const { data: kb, hydrated } = useKnowledgeBase();

  // 表單狀態
  const [caseName, setCaseName] = useState("");
  const [agency, setAgency] = useState("");
  const [budgetInput, setBudgetInput] = useState("");

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

  const { fitScore, kbMatch } = useFitScore(
    frozenInput.caseName,
    frozenInput.agency,
    frozenInput.budget,
    EMPTY_INTELLIGENCE,
    kb,
  );

  const hasKBData =
    kb["00A"].length > 0 || kb["00B"].length > 0;

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <MobileMenuButton />
        <div>
          <h1 className="text-2xl font-bold">戰略分析</h1>
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
        <div className="space-y-2">
          <h2 className="font-semibold">
            分析結果：
            <span className="text-muted-foreground font-normal ml-2">
              {frozenInput.caseName}
            </span>
          </h2>
          <FitScoreCard fitScore={fitScore} kbMatch={kbMatch} />
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
