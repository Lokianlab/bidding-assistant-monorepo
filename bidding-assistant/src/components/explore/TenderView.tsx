"use client";

import { useEffect, useState } from "react";
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
import { useSettings } from "@/lib/context/settings-context";
import type {
  PCCRecord,
  PCCTenderDetail,
  TenderSummary,
} from "@/lib/pcc/types";
import type { NavigateEvent, TenderPayload } from "@/lib/explore/types";

interface TenderViewProps {
  payload: TenderPayload;
  onNavigate: (event: NavigateEvent) => void;
}

export function TenderView({ payload, onNavigate }: TenderViewProps) {
  const { settings } = useSettings();
  const myCompany = settings.company?.brand || "大員洛川";
  const [detail, setDetail] = useState<PCCTenderDetail | null>(null);
  const [summary, setSummary] = useState<TenderSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 用搜尋 API 取得基本 record 資訊（公司列表等）
  const [record, setRecord] = useState<PCCRecord | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setDetail(null);
    setSummary(null);

    fetchTenderDetail(payload.unitId, payload.jobNumber)
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
  }, [payload.unitId, payload.jobNumber]);

  // 取得此案件在搜尋結果中的 record（含公司列表），用 getTenderDetail 回傳的結構組合
  useEffect(() => {
    // 建一個 synthetic PCCRecord 以解析公司資訊
    if (detail) {
      // PCCTenderDetail 的 detail 裡可能有公司資訊，但主要從搜尋快取取
      // 這裡我們只需用它來顯示摘要，公司從 detail 解析
      setRecord(null); // 不需要 record，公司列表從 detail 裡解析
    }
  }, [detail]);

  const agencyIntel = useAgencyIntel(payload.unitId, true, myCompany);

  // unitName 可能從 StackEntry 無法取得，用 summary.agency 補
  const unitName = payload.unitName || summary?.agency || "";

  return (
    <div className="space-y-4 text-sm">
      {/* 標題 */}
      <div>
        <h2 className="text-lg font-bold leading-snug">{payload.title}</h2>
        <div className="flex items-center gap-2 mt-2">
          <button
            className="text-sm text-primary hover:underline"
            onClick={() => onNavigate({ type: "agency", payload: { unitId: payload.unitId, unitName } })}
          >
            {unitName || "載入中..."}
          </button>
          <span className="text-muted-foreground text-xs">
            案號 {payload.jobNumber}
          </span>
        </div>
      </div>

      {/* 載入狀態 */}
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

      {/* 標案摘要 */}
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
            {summary.awardDate && (
              <>
                <span className="text-muted-foreground">決標日期</span>
                <span>{summary.awardDate}</span>
              </>
            )}
          </div>

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

      {/* 參與廠商（可鑽探） */}
      {detail && <CompanySection detail={detail} onNavigate={onNavigate} />}

      {/* 評委名單 */}
      {detail?.evaluation_committee && detail.evaluation_committee.length > 0 && (
        <>
          <Separator />
          <section>
            <h4 className="font-medium mb-2">
              評選委員（{detail.evaluation_committee.length} 位）
            </h4>
            <div className="space-y-2">
              {detail.evaluation_committee.map((m) => (
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
        </>
      )}

      {/* 機關情報 */}
      <Separator />
      <AgencyIntelSection
        intel={agencyIntel}
        unitName={unitName}
        unitId={payload.unitId}
        onNavigate={onNavigate}
      />

      {/* PCC 原始連結 */}
      <Separator />
      <a
        href={`https://web.pcc.gov.tw/tps/atm/AtmAwardAction.do?newEdit=false&searchMode=common&method=inquiryForPublic&pkAtmMain=${payload.unitId}:${payload.jobNumber}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-primary hover:underline"
      >
        在政府電子採購網查看
      </a>
    </div>
  );
}

// ====== 從標案詳情解析參與廠商 ======

function CompanySection({
  detail,
  onNavigate,
}: {
  detail: PCCTenderDetail;
  onNavigate: (event: NavigateEvent) => void;
}) {
  // 從 detail 的 key-value 裡解析公司
  const companies: { name: string; role: string }[] = [];

  for (const [key, val] of Object.entries(detail.detail ?? {})) {
    if (typeof val === "string") continue;
    if (val && typeof val === "object") {
      // 格式：{ "廠商代碼": "xxx", "廠商名稱": "yyy", ... }
      const obj = val as Record<string, string>;
      if (obj["廠商名稱"]) {
        let role = "投標";
        if (key.includes("得標廠商") && !key.includes("未得標")) role = "得標";
        else if (key.includes("未得標")) role = "未得標";
        companies.push({ name: obj["廠商名稱"], role });
      }
    }
  }

  if (companies.length === 0) return null;

  return (
    <>
      <Separator />
      <section>
        <h4 className="font-medium mb-2">參與廠商</h4>
        <div className="space-y-1.5">
          {companies.map((c) => {
            const shortName = c.name.replace(/\s*\(.*\)\s*$/, "").trim();
            return (
              <div key={c.name} className="flex items-center gap-2">
                <button
                  className="text-sm truncate flex-1 text-left hover:text-primary hover:underline"
                  onClick={() => onNavigate({ type: "company", payload: { name: shortName } })}
                >
                  {c.name}
                </button>
                <Badge
                  variant={
                    c.role === "得標" ? "default" :
                    c.role === "未得標" ? "destructive" :
                    "secondary"
                  }
                  className="text-xs"
                >
                  {c.role}
                </Badge>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}

// ====== 機關情報區塊 ======

function AgencyIntelSection({
  intel,
  unitName,
  unitId,
  onNavigate,
}: {
  intel: { data: { totalCases: number; recentCases: { title: string; date: number; winner: string | null; bidders: number }[]; incumbents: { name: string; wins: number }[]; myHistory: { title: string; date: number; won: boolean }[] } | null; loading: boolean; error: string | null };
  unitName: string;
  unitId: string;
  onNavigate: (event: NavigateEvent) => void;
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
      <div className="flex items-center justify-between">
        <h4 className="font-medium">機關情報（{unitName}）</h4>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={() => onNavigate({ type: "agency", payload: { unitId, unitName } })}
        >
          查看完整
        </Button>
      </div>

      <div className="text-sm text-muted-foreground">
        共 {data.totalCases} 筆決標紀錄
      </div>

      {data.incumbents.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-1">在位者（得標 ≥ 2 次）</p>
          <div className="space-y-1">
            {data.incumbents.map((inc) => (
              <div key={inc.name} className="flex items-center justify-between text-sm">
                <button
                  className="truncate max-w-[200px] hover:text-primary hover:underline text-left"
                  onClick={() => onNavigate({ type: "company", payload: { name: inc.name } })}
                  title={inc.name}
                >
                  {inc.name}
                </button>
                <Badge variant="default" className="text-xs">{inc.wins} 次得標</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.myHistory.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-1">
            我方在此機關的紀錄（{data.myHistory.filter((h) => h.won).length}/{data.myHistory.length} 得標）
          </p>
          <div className="space-y-1">
            {data.myHistory.map((h, i) => (
              <div key={`${h.date}-${h.title}-${i}`} className="flex items-center gap-2 text-xs">
                <Badge variant={h.won ? "default" : "destructive"} className="text-xs shrink-0">
                  {h.won ? "得標" : "未得標"}
                </Badge>
                <span className="truncate" title={h.title}>{h.title}</span>
                <span className="text-muted-foreground shrink-0">{formatPCCDate(h.date)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
