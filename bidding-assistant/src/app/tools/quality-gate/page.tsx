"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { MobileMenuButton } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { QualityGateDashboard } from "@/components/quality-gate/QualityGateDashboard";
import { DocumentWorkbench } from "@/components/output/DocumentWorkbench";
import { useQualityGate } from "@/lib/quality-gate/useQualityGate";
import { useSettings } from "@/lib/context/settings-context";
import { runChecks } from "@/lib/quality/rules";
import { calculateScore } from "@/lib/quality/score";
import { IRON_LAW_LABELS } from "@/lib/quality/constants";
import type { CheckResult, QualityConfig } from "@/lib/quality/types";
import { useMemo } from "react";

export default function QualityGatePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const caseId = searchParams.get("caseId") || "";
  const caseName = searchParams.get("caseName") || "";
  const initialTab = searchParams.get("tab") ?? "gate";

  const [tab, setTab] = useState(initialTab);

  // --- 品質閘門 state ---
  const [gateText, setGateText] = useState("");
  const { report, isAnalyzing, analyze, clear } = useQualityGate();

  function handleAnalyze() {
    if (!gateText.trim()) return;
    analyze({ text: gateText });
  }

  function handleClear() {
    setGateText("");
    clear();
  }

  // --- 文字檢查 state ---
  const { settings } = useSettings();
  const { blacklist, terminology, ironLawEnabled, customRules } = settings.modules.qualityRules;
  const [checkText, setCheckText] = useState("");
  const [results, setResults] = useState<CheckResult[]>([]);
  const [checked, setChecked] = useState(false);

  function handleCheck() {
    if (!checkText.trim()) return;
    const config: QualityConfig = {
      blacklist,
      terminology,
      ironLawEnabled,
      customRules,
      companyName: settings.company.name,
      companyBrand: settings.company.brand,
    };
    setResults(runChecks(checkText, config));
    setChecked(true);
  }

  const score = useMemo(() => {
    if (!checked || !checkText.trim()) return null;
    return calculateScore(results);
  }, [results, checked, checkText]);

  const errorCount = results.filter((r) => r.type === "error").length;
  const warnCount = results.filter((r) => r.type === "warning").length;
  const infoCount = results.filter((r) => r.type === "info").length;

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <MobileMenuButton />
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold">品質與輸出</h1>
            {caseName && (
              <span className="text-muted-foreground text-sm">— {caseName}</span>
            )}
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            品質閘門、文字檢查、文件輸出一站完成
          </p>
        </div>
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

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="gate">品質閘門</TabsTrigger>
          <TabsTrigger value="text">文字檢查</TabsTrigger>
          <TabsTrigger value="output">文件輸出</TabsTrigger>
        </TabsList>

        {/* 品質閘門 */}
        <TabsContent value="gate" className="mt-4">
          <div className="space-y-4">
            <div className="rounded-lg border p-4 space-y-3">
              <Label htmlFor="quality-text">貼上要檢查的文字</Label>
              <Textarea
                id="quality-text"
                placeholder="將建議書段落貼在這裡，品質閘門會從四個面向檢查..."
                value={gateText}
                onChange={(e) => setGateText(e.target.value)}
                rows={8}
                className="resize-y"
              />
              <div className="flex gap-2">
                <Button onClick={handleAnalyze} disabled={isAnalyzing || !gateText.trim()}>
                  {isAnalyzing ? "分析中..." : "開始檢查"}
                </Button>
                {report && (
                  <Button variant="outline" onClick={handleClear}>
                    清除結果
                  </Button>
                )}
              </div>
            </div>
            {report && (
              <div className="space-y-4">
                <QualityGateDashboard report={report} />
                <div className="flex justify-end gap-2">
                  {caseId && (
                    <Button
                      variant="outline"
                      onClick={() => router.push(`/case-work?id=${caseId}`)}
                    >
                      ← 回到案件
                    </Button>
                  )}
                  <Button onClick={() => setTab("output")}>
                    前往文件輸出 →
                  </Button>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* 文字檢查 */}
        <TabsContent value="text" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">待檢文字</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="貼上建議書文字進行品質檢查..."
                    value={checkText}
                    onChange={(e) => {
                      setCheckText(e.target.value);
                      setChecked(false);
                    }}
                    rows={16}
                    className="font-mono text-sm"
                  />
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-muted-foreground">
                      {checkText.length} 字
                    </span>
                    <Button onClick={handleCheck} disabled={!checkText.trim()}>
                      執行檢查
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {checked && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">檢查結果</CardTitle>
                      <div className="flex gap-2">
                        <Badge variant="destructive">{errorCount} 錯誤</Badge>
                        <Badge variant="secondary">{warnCount} 警告</Badge>
                        <Badge variant="outline">{infoCount} 提示</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {results.length === 0 ? (
                      <p className="text-green-600 font-medium text-center py-8">
                        通過所有檢查
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {results.map((r, i) => (
                          <div
                            key={i}
                            className={`flex items-start gap-3 p-3 rounded-md text-sm ${
                              r.type === "error"
                                ? "bg-destructive/10"
                                : r.type === "warning"
                                  ? "bg-yellow-500/10"
                                  : "bg-blue-500/10"
                            }`}
                          >
                            <span className="text-base">
                              {r.type === "error" ? "🔴" : r.type === "warning" ? "🟡" : "🔵"}
                            </span>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {r.rule}
                                </Badge>
                                {r.position && (
                                  <span className="text-xs text-muted-foreground">{r.position}</span>
                                )}
                              </div>
                              <p className="mt-1">{r.message}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="space-y-4">
              {score !== null && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">品質分數</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center space-y-4">
                    <div
                      className={`text-5xl font-bold ${
                        score.value >= 80
                          ? "text-green-600"
                          : score.value >= 60
                            ? "text-yellow-600"
                            : "text-destructive"
                      }`}
                    >
                      {score.value}
                    </div>
                    <Progress value={score.value} className="h-3" />
                    <p className="text-sm text-muted-foreground">{score.label}</p>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">檢查規則</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span>禁用詞清單</span>
                    <Badge variant="secondary">{blacklist.length} 個</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>用語對照</span>
                    <Badge variant="secondary">{terminology.length} 組</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>自訂規則</span>
                    <Badge variant="secondary">{customRules.length} 個</Badge>
                  </div>
                  <Separator />
                  <p className="text-xs font-medium">鐵律檢查</p>
                  {Object.entries(ironLawEnabled).map(([key, enabled]) => (
                    <div key={key} className="flex items-center justify-between text-xs">
                      <span className={enabled ? "" : "text-muted-foreground"}>
                        {IRON_LAW_LABELS[key] ?? key}
                      </span>
                      <Badge variant={enabled ? "default" : "outline"} className="text-xs">
                        {enabled ? "開" : "關"}
                      </Badge>
                    </div>
                  ))}
                  <Separator />
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>內建規則：段落長度、句子長度、重複內容、承諾風險</p>
                    <p>至「設定 → 模組更新 → 品質規則」調整</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* 文件輸出 */}
        <TabsContent value="output" className="mt-4">
          <DocumentWorkbench />
        </TabsContent>
      </Tabs>
    </div>
  );
}
