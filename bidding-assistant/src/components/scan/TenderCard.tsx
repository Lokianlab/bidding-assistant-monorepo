// ====== 單筆候選標案卡片 ======

"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ScanResult, KeywordCategory } from "@/lib/scan/types";

const CATEGORY_CONFIG: Record<KeywordCategory, {
  label: string;
  badgeClass: string;
}> = {
  must: { label: "推薦", badgeClass: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  review: { label: "需要看", badgeClass: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
  exclude: { label: "已排除", badgeClass: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
  other: { label: "其他", badgeClass: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200" },
};

export type CreateStatus = "idle" | "creating" | "done" | "error";

interface TenderCardProps {
  result: ScanResult;
  onCreateCase?: (result: ScanResult) => void;
  onSkip?: (result: ScanResult) => void;
  onViewDetail?: (result: ScanResult) => void;
  createStatus?: CreateStatus;
}

export function TenderCard({ result, onCreateCase, onSkip, onViewDetail, createStatus = "idle" }: TenderCardProps) {
  const { tender, classification } = result;
  const config = CATEGORY_CONFIG[classification.category];

  return (
    <Card className="transition-colors hover:border-primary/30">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge className={config.badgeClass} variant="secondary">
                {config.label}
              </Badge>
              {classification.matchedLabel && classification.category !== "other" && (
                <span className="text-xs text-muted-foreground" title={
                  classification.matchedKeywords.length > 0
                    ? `匹配：${classification.matchedKeywords.join("、")}`
                    : undefined
                }>
                  {classification.matchedLabel}
                </span>
              )}
            </div>
            <h3 className="font-medium text-sm leading-snug mb-1 break-words">
              {tender.url ? (
                <a
                  href={tender.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline hover:text-primary"
                >
                  {tender.title}
                </a>
              ) : (
                tender.title
              )}
            </h3>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {tender.unit && <span>{tender.unit}</span>}
              <span>{tender.budget > 0 ? formatBudget(tender.budget) : "預算未公告"}</span>
              {tender.deadline && (
                <span>截止 {tender.deadline}</span>
              )}
              {tender.publishDate && (
                <span>公告 {formatDate(tender.publishDate)}</span>
              )}
              {tender.category && (
                <span>{tender.category}</span>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1 shrink-0">
            {classification.category !== "exclude" && (
              <Button
                size="sm"
                variant={
                  createStatus === "done"
                    ? "secondary"
                    : createStatus === "error"
                      ? "destructive"
                      : classification.category === "must"
                        ? "default"
                        : "outline"
                }
                onClick={() => createStatus === "idle" && onCreateCase?.(result)}
                disabled={!onCreateCase || createStatus === "creating" || createStatus === "done"}
                className="text-xs"
              >
                {createStatus === "creating"
                  ? "建案中..."
                  : createStatus === "done"
                    ? "已建案"
                    : createStatus === "error"
                      ? "重試"
                      : "建案"}
              </Button>
            )}
            {onViewDetail && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onViewDetail(result)}
                className="text-xs"
              >
                詳情
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onSkip?.(result)}
              className="text-xs text-muted-foreground"
            >
              跳過
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatBudget(amount: number): string {
  if (amount >= 100_000_000) return `${(amount / 100_000_000).toFixed(1)}億`;
  if (amount >= 10_000) return `${(amount / 10_000).toFixed(0)}萬`;
  return `${amount.toLocaleString()}元`;
}

function formatDate(dateStr: string): string {
  // PCC date format: "20260228"
  if (dateStr.length === 8) {
    return `${dateStr.slice(0, 4)}/${dateStr.slice(4, 6)}/${dateStr.slice(6, 8)}`;
  }
  return dateStr;
}
