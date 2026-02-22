"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useKnowledgeBase } from "@/lib/knowledge-base/useKnowledgeBase";

interface Step {
  label: string;
  description: string;
  href: string;
  done: boolean;
}

export function QuickStart() {
  const { data: kb, hydrated } = useKnowledgeBase();

  if (!hydrated) return null;

  const activeCount = (kbId: "00A" | "00B" | "00C" | "00D" | "00E") =>
    (kb[kbId] as Array<{ entryStatus: string }>).filter(
      (e) => e.entryStatus === "active"
    ).length;

  const steps: Step[] = [
    {
      label: "新增團隊成員",
      description: `知識庫 00A：目前 ${activeCount("00A")} 筆`,
      href: "/knowledge-base",
      done: activeCount("00A") >= 3,
    },
    {
      label: "新增公司實績",
      description: `知識庫 00B：目前 ${activeCount("00B")} 筆`,
      href: "/knowledge-base",
      done: activeCount("00B") >= 2,
    },
    {
      label: "搜尋標案",
      description: "用關鍵字搜尋政府標案",
      href: "/intelligence",
      done: false,
    },
    {
      label: "分析適配度",
      description: "五維評分判斷值不值得投",
      href: "/strategy",
      done: false,
    },
  ];

  const kbSteps = steps.filter((s) => s.href === "/knowledge-base");
  const allKBDone = kbSteps.every((s) => s.done);

  // KB 都填好就不顯示
  if (allKBDone) return null;

  return (
    <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">快速開始</CardTitle>
        <p className="text-sm text-muted-foreground">
          先把公司資料填進知識庫，AI 才能寫出有內容的建議書
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {steps.map((step) => (
          <div
            key={step.label}
            className="flex items-center gap-3 rounded-lg border bg-background p-3"
          >
            <span className={`text-sm ${step.done ? "text-green-600" : "text-muted-foreground"}`}>
              {step.done ? "✓" : "○"}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{step.label}</p>
              <p className="text-xs text-muted-foreground">{step.description}</p>
            </div>
            {!step.done && (
              <Button variant="outline" size="sm" asChild>
                <Link href={step.href}>前往</Link>
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
