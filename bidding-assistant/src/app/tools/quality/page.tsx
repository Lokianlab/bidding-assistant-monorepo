"use client";

import { useSettings } from "@/lib/context/settings-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { useState, useMemo } from "react";
import { runChecks } from "@/lib/quality/rules";
import { calculateScore } from "@/lib/quality/score";
import type { CheckResult, QualityConfig } from "@/lib/quality/types";

export default function QualityPage() {
  const { settings } = useSettings();
  const { blacklist, terminology, ironLawEnabled, customRules } = settings.modules.qualityRules;

  const [text, setText] = useState("");
  const [results, setResults] = useState<CheckResult[]>([]);
  const [checked, setChecked] = useState(false);

  function handleCheck() {
    if (!text.trim()) return;

    const config: QualityConfig = {
      blacklist,
      terminology,
      ironLawEnabled,
      customRules,
      companyName: settings.company.name,
      companyBrand: settings.company.brand,
    };

    setResults(runChecks(text, config));
    setChecked(true);
  }

  const score = useMemo(() => {
    if (!checked || !text.trim()) return null;
    return calculateScore(results);
  }, [results, checked, text]);

  const errorCount = results.filter((r) => r.type === "error").length;
  const warnCount = results.filter((r) => r.type === "warning").length;
  const infoCount = results.filter((r) => r.type === "info").length;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">品質檢查</h1>
        <p className="text-muted-foreground mt-1">
          檢查禁用詞、用語修正、鐵律規則、承諾風險、重複內容
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左側：文字輸入 */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">待檢文字</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="貼上建議書文字進行品質檢查..."
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  setChecked(false);
                }}
                rows={16}
                className="font-mono text-sm"
              />
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-muted-foreground">
                  {text.length} 字
                </span>
                <Button onClick={handleCheck} disabled={!text.trim()}>
                  執行檢查
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 檢查結果 */}
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

        {/* 右側：分數 */}
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
                    {key === "crossValidateNumbers" && "數字交叉驗證"}
                    {key === "budgetConsistency" && "預算一致性"}
                    {key === "dateConsistency" && "日期一致性"}
                    {key === "teamConsistency" && "團隊一致性"}
                    {key === "scopeConsistency" && "範疇一致性"}
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
    </div>
  );
}
