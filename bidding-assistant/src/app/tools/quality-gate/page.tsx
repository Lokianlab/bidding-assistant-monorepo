"use client";

import { useState } from "react";
import { MobileMenuButton } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { QualityGateDashboard } from "@/components/quality-gate/QualityGateDashboard";
import { useQualityGate } from "@/lib/quality-gate/useQualityGate";

export default function QualityGatePage() {
  const [text, setText] = useState("");
  const { report, isAnalyzing, analyze, clear } = useQualityGate();

  function handleAnalyze() {
    if (!text.trim()) return;
    analyze({ text });
  }

  function handleClear() {
    setText("");
    clear();
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <MobileMenuButton />
        <div>
          <h1 className="text-2xl font-bold">品質閘門</h1>
          <p className="text-muted-foreground text-sm mt-1">
            四道檢查：文字品質、事實查核、需求對照、實務檢驗
          </p>
        </div>
      </div>

      {/* 輸入區 */}
      <div className="rounded-lg border p-4 space-y-3">
        <Label htmlFor="quality-text">貼上要檢查的文字</Label>
        <Textarea
          id="quality-text"
          placeholder="將建議書段落貼在這裡，品質閘門會從四個面向檢查..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          className="resize-y"
        />
        <div className="flex gap-2">
          <Button onClick={handleAnalyze} disabled={isAnalyzing || !text.trim()}>
            {isAnalyzing ? "分析中..." : "開始檢查"}
          </Button>
          {report && (
            <Button variant="outline" onClick={handleClear}>
              清除結果
            </Button>
          )}
        </div>
      </div>

      {/* 報告 */}
      {report && <QualityGateDashboard report={report} />}
    </div>
  );
}
