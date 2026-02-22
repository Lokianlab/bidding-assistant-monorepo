"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { fetchTenderDetail } from "@/lib/pcc/usePCCSearch";
import {
  parseTenderSummary,
  formatAmount,
  formatPCCDate,
  parseCompanyRoles,
} from "@/lib/pcc/helpers";
import { useAgencyIntel } from "@/lib/pcc/useAgencyIntel";
import { generateScoutPrompt, buildScoutInput } from "@/lib/pcc/scout-report";
import { useSettings } from "@/lib/context/settings-context";
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
  onViewCompany?: (companyName: string) => void;
  onViewCommittee?: (unitId: string, unitName: string) => void;
}

export function PCCTenderSheet({ record, open, onOpenChange, onViewCompany, onViewCommittee }: PCCTenderSheetProps) {
  const router = useRouter();
  const { settings } = useSettings();
  const myCompany = settings.company?.brand || "大員洛川";
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

  const agencyIntel = useAgencyIntel(record?.unit_id ?? null, open, myCompany);

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
                  {companies.map((c) => {
                    // 去掉英文括號後的部分，取前面的中文名
                    const shortName = c.name.replace(/\s*\(.*\)\s*$/, "").trim();
                    return (
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
                        {onViewCompany && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => onViewCompany(shortName)}
                          >
                            分析
                          </Button>
                        )}
                      </div>
                    );
                  })}
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
              {onViewCommittee && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => onViewCommittee(record.unit_id, record.unit_name)}
                >
                  分析此機關的評委網路
                </Button>
              )}
            </>
          )}

          {/* 機關情報 */}
          <Separator />
          <AgencyIntelSection intel={agencyIntel} unitName={record.unit_name} />

          {/* 跨模組導航：分析適配度 */}
          <Separator />
          <Button
            variant="default"
            size="sm"
            className="w-full"
            onClick={() => {
              const params = new URLSearchParams();
              params.set("caseName", summary?.title || record.brief.title);
              params.set("agency", record.unit_name);
              if (summary?.budget) params.set("budget", String(summary.budget));
              onOpenChange(false);
              router.push(`/strategy?${params.toString()}`);
            }}
          >
            分析適配度（值不值得投）
          </Button>

          {/* P 偵察報告 + PCC 原始連結 */}
          <Separator />
          <ScoutReportButton
            record={record}
            summary={summary}
            agencyIntel={agencyIntel.data}
            companies={companies}
            committee={detail?.evaluation_committee}
          />
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

// ====== 機關情報區塊 ======

function AgencyIntelSection({
  intel,
  unitName,
}: {
  intel: { data: ReturnType<typeof useAgencyIntel>["data"]; loading: boolean; error: string | null };
  unitName: string;
}) {
  if (intel.loading) {
    return (
      <section>
        <h4 className="font-medium mb-2">機關情報</h4>
        <div className="py-4 text-center text-muted-foreground text-sm">
          載入 {unitName} 歷史標案...
        </div>
      </section>
    );
  }

  if (intel.error) {
    return (
      <section>
        <h4 className="font-medium mb-2">機關情報</h4>
        <div className="text-xs text-muted-foreground">無法載入：{intel.error}</div>
      </section>
    );
  }

  if (!intel.data) return null;

  const { data } = intel;

  return (
    <section className="space-y-3">
      <h4 className="font-medium">機關情報（{unitName}）</h4>

      <div className="text-sm text-muted-foreground">
        共 {data.totalCases} 筆決標紀錄
      </div>

      {/* 在位者 */}
      {data.incumbents.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-1">在位者（得標 ≥ 2 次）</p>
          <div className="space-y-1">
            {data.incumbents.map((inc) => (
              <div key={inc.name} className="flex items-center justify-between text-sm">
                <span className="truncate max-w-[200px]" title={inc.name}>{inc.name}</span>
                <Badge variant="default" className="text-xs">{inc.wins} 次得標</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 我方紀錄 */}
      {data.myHistory.length > 0 ? (
        <div>
          <p className="text-xs text-muted-foreground mb-1">
            我方在此機關的紀錄（{data.myHistory.filter((h) => h.won).length}/{data.myHistory.length} 得標）
          </p>
          <div className="space-y-1">
            {data.myHistory.map((h) => (
              <div key={`${h.date}-${h.title}`} className="flex items-center gap-2 text-xs">
                <Badge variant={h.won ? "default" : "destructive"} className="text-xs shrink-0">
                  {h.won ? "得標" : "未得標"}
                </Badge>
                <span className="truncate" title={h.title}>{h.title}</span>
                <span className="text-muted-foreground shrink-0">{formatPCCDate(h.date)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-xs text-muted-foreground">我方無此機關投標紀錄</div>
      )}

      {/* 近期標案 */}
      {data.recentCases.length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            近期標案（{data.recentCases.length} 筆）
          </summary>
          <div className="mt-2 space-y-1">
            {data.recentCases.map((c) => (
              <div key={`${c.date}-${c.title}`} className="flex items-center gap-2">
                <span className="text-muted-foreground shrink-0">{formatPCCDate(c.date)}</span>
                <span className="truncate flex-1">{c.title}</span>
                <span className="text-muted-foreground shrink-0">{c.bidders}家</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}

function ScoutReportButton({
  record,
  summary,
  agencyIntel,
  companies,
  committee,
}: {
  record: PCCRecord;
  summary: TenderSummary | null;
  agencyIntel: { totalCases: number; incumbents: { name: string; wins: number }[]; myHistory: { title: string; date: number; won: boolean }[] } | null;
  companies: { name: string; id?: string; roles: ("投標" | "得標" | "未得標")[] }[];
  committee?: EvaluationCommitteeMember[];
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    const competitorNames = companies
      .filter((c) => c.roles.includes("得標") || c.roles.includes("未得標"))
      .map((c) => c.name.replace(/\s*\(.*\)\s*$/, "").trim());

    const input = buildScoutInput({
      title: record.brief.title,
      agency: record.unit_name,
      jobNumber: record.job_number,
      summary,
      agencyIntel,
      competitorNames,
      committee,
    });

    const prompt = generateScoutPrompt(input);
    navigator.clipboard.writeText(prompt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [record, summary, agencyIntel, companies, committee]);

  return (
    <Button
      variant="outline"
      size="sm"
      className="w-full text-xs"
      onClick={handleCopy}
    >
      {copied ? "已複製！貼到 Perplexity 即可" : "複製 P 偵察 Prompt"}
    </Button>
  );
}

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
