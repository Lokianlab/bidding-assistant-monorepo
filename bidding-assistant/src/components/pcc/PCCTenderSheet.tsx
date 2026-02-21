"use client";

import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { fetchTenderDetail } from "@/lib/pcc/usePCCSearch";
import {
  parseTenderSummary,
  formatAmount,
  formatPCCDate,
  parseCompanyRoles,
} from "@/lib/pcc/helpers";
import type {
  PCCRecord,
  PCCTenderDetail,
  TenderSummary,
  EvaluationCommitteeMember,
} from "@/lib/pcc/types";

interface PCCTenderSheetProps {
  record: PCCRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PCCTenderSheet({ record, open, onOpenChange }: PCCTenderSheetProps) {
  const [detail, setDetail] = useState<PCCTenderDetail | null>(null);
  const [summary, setSummary] = useState<TenderSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!record || !open) {
      setDetail(null);
      setSummary(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchTenderDetail(record.unit_id, record.job_number)
      .then((data) => {
        if (cancelled) return;
        const tender = data as PCCTenderDetail;
        setDetail(tender);
        setSummary(parseTenderSummary(tender));
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "載入失敗");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [record, open]);

  if (!record) return null;

  const companies = parseCompanyRoles(record);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-base leading-snug pr-4">
            {record.brief.title}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4 text-sm">
          {/* 基本資訊 */}
          <section className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{record.brief.type}</Badge>
              <span className="text-muted-foreground">
                {formatPCCDate(record.date)}
              </span>
            </div>
            <div className="grid grid-cols-[5rem_1fr] gap-y-1 text-sm">
              <span className="text-muted-foreground">機關</span>
              <span>{record.unit_name}</span>
              <span className="text-muted-foreground">案號</span>
              <span>{record.job_number}</span>
            </div>
          </section>

          {/* 搜尋結果中的公司 */}
          {companies.length > 0 && (
            <>
              <Separator />
              <section>
                <h4 className="font-medium mb-2">參與廠商</h4>
                <div className="space-y-1">
                  {companies.map((c) => (
                    <div key={c.name} className="flex items-center gap-2">
                      <span className="text-sm truncate flex-1">{c.name}</span>
                      {c.roles.map((role) => (
                        <Badge
                          key={role}
                          variant={
                            role === "得標" ? "default" :
                            role === "未得標" ? "destructive" :
                            "secondary"
                          }
                          className="text-xs"
                        >
                          {role}
                        </Badge>
                      ))}
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          <Separator />

          {/* 標案詳情（從 API 載入） */}
          {loading && (
            <div className="py-8 text-center text-muted-foreground">
              載入標案詳情中...
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
              {error}
            </div>
          )}

          {summary && (
            <section className="space-y-3">
              <h4 className="font-medium">標案詳情</h4>
              <div className="grid grid-cols-[5rem_1fr] gap-y-2 text-sm">
                {summary.budget !== null && (
                  <>
                    <span className="text-muted-foreground">預算</span>
                    <span>{formatAmount(summary.budget)}</span>
                  </>
                )}
                {summary.floorPrice !== null && (
                  <>
                    <span className="text-muted-foreground">底價</span>
                    <span>{formatAmount(summary.floorPrice)}</span>
                  </>
                )}
                {summary.awardAmount !== null && (
                  <>
                    <span className="text-muted-foreground">決標金額</span>
                    <span className="font-medium">{formatAmount(summary.awardAmount)}</span>
                  </>
                )}
                {summary.bidderCount !== null && (
                  <>
                    <span className="text-muted-foreground">投標家數</span>
                    <span>{summary.bidderCount} 家</span>
                  </>
                )}
                {summary.awardMethod && (
                  <>
                    <span className="text-muted-foreground">決標方式</span>
                    <span>{summary.awardMethod}</span>
                  </>
                )}
                {summary.procurementType && (
                  <>
                    <span className="text-muted-foreground">採購類別</span>
                    <span>{summary.procurementType}</span>
                  </>
                )}
              </div>

              {/* 底價/預算比 */}
              {summary.budget && summary.floorPrice && (
                <div className="bg-muted rounded-lg p-3">
                  <span className="text-muted-foreground text-xs">底價 / 預算 = </span>
                  <span className="font-medium">
                    {((summary.floorPrice / summary.budget) * 100).toFixed(1)}%
                  </span>
                </div>
              )}
            </section>
          )}

          {/* 評委名單 */}
          {detail?.evaluation_committee && detail.evaluation_committee.length > 0 && (
            <>
              <Separator />
              <EvaluationCommitteeSection members={detail.evaluation_committee} />
            </>
          )}

          {/* PCC 原始連結 */}
          <Separator />
          <div className="flex gap-2">
            <a
              href={record.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline"
            >
              在政府電子採購網查看
            </a>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ====== 評委名單區塊 ======

function EvaluationCommitteeSection({ members }: { members: EvaluationCommitteeMember[] }) {
  return (
    <section>
      <h4 className="font-medium mb-2">
        評選委員（{members.length} 位）
      </h4>
      <div className="space-y-2">
        {members.map((m) => (
          <div key={m.sequence} className="rounded-lg border p-2.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium">{m.name}</span>
              <div className="flex gap-1">
                <Badge variant="outline" className="text-xs">{m.status}</Badge>
                {m.attendance === "是" && (
                  <Badge variant="secondary" className="text-xs">出席</Badge>
                )}
              </div>
            </div>
            {m.experience && (
              <p className="text-xs text-muted-foreground mt-1">{m.experience}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
