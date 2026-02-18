"use client";

import { useSettings } from "@/lib/context/settings-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { useState, useMemo } from "react";

interface CheckResult {
  type: "error" | "warning" | "info";
  rule: string;
  message: string;
  position?: string;
}

export default function QualityPage() {
  const { settings } = useSettings();
  const { blacklist, terminology, ironLawEnabled } = settings.modules.qualityRules;

  const [text, setText] = useState("");
  const [results, setResults] = useState<CheckResult[]>([]);
  const [checked, setChecked] = useState(false);

  function runCheck() {
    if (!text.trim()) return;
    const found: CheckResult[] = [];

    // 禁用詞檢查
    blacklist.forEach((word) => {
      const regex = new RegExp(word, "g");
      let match;
      while ((match = regex.exec(text)) !== null) {
        found.push({
          type: "error",
          rule: "禁用詞",
          message: `發現禁用詞「${word}」`,
          position: `位置 ${match.index}`,
        });
      }
    });

    // 用語修正
    terminology.forEach((t) => {
      const regex = new RegExp(t.wrong, "g");
      let match;
      while ((match = regex.exec(text)) !== null) {
        found.push({
          type: "warning",
          rule: "用語修正",
          message: `「${t.wrong}」建議改為「${t.correct}」`,
          position: `位置 ${match.index}`,
        });
      }
    });

    // 鐵律檢查（簡化模擬）
    if (ironLawEnabled.crossValidateNumbers) {
      const numbers = text.match(/\d{1,3}(,\d{3})+|\d+/g);
      if (numbers && numbers.length > 3) {
        found.push({
          type: "info",
          rule: "數字交叉驗證",
          message: `文件中出現 ${numbers.length} 個數字，請人工交叉比對`,
        });
      }
    }

    if (ironLawEnabled.dateConsistency) {
      const dates = text.match(/\d{2,4}[年/.-]\d{1,2}[月/.-]\d{1,2}[日]?/g);
      if (dates && dates.length > 1) {
        found.push({
          type: "info",
          rule: "日期一致性",
          message: `文件中出現 ${dates.length} 個日期，請確認一致性`,
        });
      }
    }

    // 段落長度
    const paragraphs = text.split(/\n\n+/).filter(Boolean);
    paragraphs.forEach((p, i) => {
      if (p.length > 500) {
        found.push({
          type: "warning",
          rule: "段落長度",
          message: `第 ${i + 1} 段超過 500 字（${p.length} 字），建議分段`,
        });
      }
    });

    setResults(found);
    setChecked(true);
  }

  const score = useMemo(() => {
    if (!checked || !text.trim()) return null;
    const errorCount = results.filter((r) => r.type === "error").length;
    const warnCount = results.filter((r) => r.type === "warning").length;
    const raw = 100 - errorCount * 10 - warnCount * 3;
    return Math.max(0, Math.min(100, raw));
  }, [results, checked, text]);

  const errorCount = results.filter((r) => r.type === "error").length;
  const warnCount = results.filter((r) => r.type === "warning").length;
  const infoCount = results.filter((r) => r.type === "info").length;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">品質檢查</h1>
        <p className="text-muted-foreground mt-1">
          檢查禁用詞、用語修正、鐵律規則
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
                <Button onClick={runCheck} disabled={!text.trim()}>
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
                    score >= 80
                      ? "text-green-600"
                      : score >= 60
                        ? "text-yellow-600"
                        : "text-destructive"
                  }`}
                >
                  {score}
                </div>
                <Progress value={score} className="h-3" />
                <p className="text-sm text-muted-foreground">
                  {score >= 80 ? "品質良好" : score >= 60 ? "需要改善" : "品質不佳"}
                </p>
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
              <Separator />
              <p className="text-xs text-muted-foreground">
                至「設定 → 模組更新 → 品質規則」調整
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
