"use client";

import Link from "next/link";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import type { NotionPage } from "@/lib/dashboard/types";
import { F, DEFAULT_STATUS_COLORS, DEFAULT_PRIORITY_COLORS } from "@/lib/dashboard/types";
import { fmt, fmtDateTime } from "@/lib/dashboard/helpers";

interface ProjectDetailSheetProps {
  page: NotionPage | null;
  open: boolean;
  onClose: () => void;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className="text-sm">{children || "—"}</span>
    </div>
  );
}

export function ProjectDetailSheet({ page, open, onClose }: ProjectDetailSheetProps) {
  if (!page) return null;
  const p = page.properties;

  const statusColor = DEFAULT_STATUS_COLORS[p[F.進程]] ?? "bg-gray-100 text-gray-600";
  const priorityColor = DEFAULT_PRIORITY_COLORS[p[F.投遞序位]] ?? "bg-gray-100 text-gray-600";

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-base leading-snug pr-4">
            {p[F.名稱] || "未命名標案"}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-5">
          {/* 狀態標籤 */}
          <div className="flex flex-wrap gap-2">
            {p[F.進程] && (
              <Badge className={statusColor}>{p[F.進程]}</Badge>
            )}
            {p[F.投遞序位] && (
              <Badge className={priorityColor}>{p[F.投遞序位]}</Badge>
            )}
            {p[F.決策] && (
              <Badge variant="outline">{p[F.決策]}</Badge>
            )}
          </div>

          <Separator />

          {/* 基本資訊 */}
          <div>
            <p className="text-xs font-medium mb-2">基本資訊</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="案件唯一碼">{p[F.唯一碼]}</Field>
              <Field label="案號">{p[F.案號]}</Field>
              <Field label="招標機關">{p[F.招標機關]}</Field>
              <Field label="評審方式">{p[F.評審方式]}</Field>
              <Field label="標案類型">
                {Array.isArray(p[F.標案類型])
                  ? p[F.標案類型].join("、")
                  : p[F.標案類型]}
              </Field>
              <Field label="檔案型態">{p[F.檔案型態]}</Field>
              <Field label="電子投標">{p[F.電子投標] ? "是" : "否"}</Field>
              <Field label="決標公告">{p[F.決標公告]}</Field>
            </div>
          </div>

          <Separator />

          {/* 投標資訊 */}
          <div>
            <p className="text-xs font-medium mb-2">投標資訊</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="預算金額">
                {p[F.預算] ? `$${fmt(p[F.預算])}` : null}
              </Field>
              <Field label="截標時間">{fmtDateTime(p[F.截標])}</Field>
              <Field label="評選日期">{fmtDateTime(p[F.評選日期])}</Field>
              <Field label="備標期限">{fmtDateTime(p[F.備標期限])}</Field>
            </div>
          </div>

          <Separator />

          {/* 成本資訊 */}
          <div>
            <p className="text-xs font-medium mb-2">成本資訊</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="押標金">
                {p[F.押標金] ? `$${fmt(p[F.押標金])}` : null}
              </Field>
              <Field label="領標費">
                {p[F.領標費] ? `$${fmt(p[F.領標費])}` : null}
              </Field>
            </div>
          </div>

          <Separator />

          {/* 進度資訊 */}
          <div>
            <p className="text-xs font-medium mb-2">進度資訊</p>
            <div className="grid grid-cols-1 gap-3">
              <Field label="企劃人員">
                {Array.isArray(p[F.企劃主筆])
                  ? p[F.企劃主筆].join("、")
                  : p[F.企劃主筆]}
              </Field>
              <Field label="備標進度">
                {Array.isArray(p[F.進度]) ? (
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {p[F.進度].map((s: string) => (
                      <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                    ))}
                  </div>
                ) : (
                  p[F.進度]
                )}
              </Field>
            </div>
          </div>

          <Separator />

          {/* 快速行動列 */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">快速行動</p>
            <div className="grid grid-cols-2 gap-2">
              <Link href={`/case-work?id=${page.id}`} className="col-span-2">
                <Button variant="default" size="sm" className="w-full">
                  前往工作頁
                </Button>
              </Link>
              <Link href={`/intelligence?search=${encodeURIComponent(p[F.名稱] || "")}&caseId=${page.id}`}>
                <Button variant="outline" size="sm" className="w-full">
                  查情報
                </Button>
              </Link>
              <Link href={`/assembly?caseId=${page.id}&caseName=${encodeURIComponent(p[F.名稱] || "")}`}>
                <Button variant="outline" size="sm" className="w-full">
                  開始撰寫
                </Button>
              </Link>
              <Link href={`/tools/quality-gate?caseId=${page.id}&caseName=${encodeURIComponent(p[F.名稱] || "")}`} className="col-span-2">
                <Button variant="outline" size="sm" className="w-full">
                  品質檢查
                </Button>
              </Link>
            </div>
            {page.url && page.url !== "#" && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => window.open(page.url, "_blank")}
              >
                在 Notion 開啟 ↗
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
