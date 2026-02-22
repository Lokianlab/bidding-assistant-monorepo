"use client";

import { useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useCompetitorAnalysis } from "@/lib/pcc/useCompetitorAnalysis";
import { usePCCSearch } from "@/lib/pcc/usePCCSearch";
import { parseCompanyRoles, formatPCCDate } from "@/lib/pcc/helpers";
import type { PCCRecord } from "@/lib/pcc/types";
import type { NavigateEvent, CompanyPayload } from "@/lib/explore/types";

interface CompanyViewProps {
  payload: CompanyPayload;
  onNavigate: (event: NavigateEvent) => void;
}

export function CompanyView({ payload, onNavigate }: CompanyViewProps) {
  const { results, loading: searchLoading, error: searchError, search } = usePCCSearch();
  const analysis = useCompetitorAnalysis();

  useEffect(() => {
    search(payload.name, "company");
    analysis.run(payload.name);
  }, [payload.name]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRecordClick = useCallback(
    (record: PCCRecord) => {
      onNavigate({
        type: "tender",
        payload: {
          unitId: record.unit_id,
          jobNumber: record.job_number,
          title: record.brief.title,
          unitName: record.unit_name,
        },
      });
    },
    [onNavigate],
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">{payload.name}</h2>
        <p className="text-sm text-muted-foreground mt-1">廠商投標紀錄與競爭分析</p>
      </div>

      {/* 競爭分析摘要 */}
      {analysis.loading && (
        <div className="py-4 text-center text-muted-foreground text-sm">
          分析競爭紀錄中...
          {analysis.progress && (
            <span className="ml-2">（{analysis.progress.loaded}/{analysis.progress.total} 頁）</span>
          )}
        </div>
      )}

      {analysis.error && (
        <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
          {analysis.error}
        </div>
      )}

      {analysis.data && (
        <section className="space-y-3">
          {/* 統計概覽 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <StatCard label="決標紀錄" value={`${analysis.data.awardRecords} 筆`} />
            <StatCard label="得標率" value={`${(analysis.data.winRate * 100).toFixed(0)}%`} />
            <StatCard label="得標" value={`${analysis.data.wins} 次`} />
            <StatCard label="未得標" value={`${analysis.data.losses} 次`} />
          </div>

          {/* 常碰機關（可鑽探） */}
          {analysis.data.agencies.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="font-medium text-sm mb-2">常投機關</h4>
                <div className="space-y-1">
                  {analysis.data.agencies.slice(0, 8).map((a) => (
                    <div key={a.unitId} className="flex items-center justify-between text-sm">
                      <button
                        className="truncate max-w-[250px] hover:text-primary hover:underline text-left"
                        onClick={() => onNavigate({ type: "agency", payload: { unitId: a.unitId, unitName: a.unitName } })}
                      >
                        {a.unitName}
                      </button>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-muted-foreground">{a.totalCases} 案</span>
                        <Badge variant="default" className="text-xs">{a.myWins} 得標</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* 主要競爭對手（可鑽探） */}
          {analysis.data.competitors.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="font-medium text-sm mb-2">主要競爭對手</h4>
                <div className="space-y-1">
                  {analysis.data.competitors.slice(0, 8).map((c) => (
                    <div key={c.id || c.name} className="flex items-center justify-between text-sm">
                      <button
                        className="truncate max-w-[200px] hover:text-primary hover:underline text-left"
                        onClick={() => onNavigate({ type: "company", payload: { name: c.name } })}
                      >
                        {c.name}
                      </button>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-muted-foreground">
                          撞 {c.encounters} 案
                        </span>
                        <Badge
                          variant={c.myWins > c.theirWins ? "default" : c.myWins < c.theirWins ? "destructive" : "secondary"}
                          className="text-xs"
                        >
                          {c.myWins}:{c.theirWins}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </section>
      )}

      {/* 投標紀錄列表 */}
      <Separator />
      <h4 className="font-medium text-sm">投標紀錄</h4>

      {searchLoading && (
        <div className="py-4 text-center text-muted-foreground text-sm">
          載入投標紀錄...
        </div>
      )}

      {searchError && (
        <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
          {searchError}
        </div>
      )}

      {results && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            共 {results.total_records.toLocaleString()} 筆
          </p>
          {results.records.map((record) => {
            const companies = parseCompanyRoles(record);
            const myRoles = companies.find((c) => c.name.includes(payload.name));
            return (
              <Card
                key={`${record.unit_id}-${record.job_number}`}
                className="py-2 cursor-pointer transition-colors hover:bg-accent/50"
                onClick={() => handleRecordClick(record)}
              >
                <CardContent className="space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-medium leading-snug">{record.brief.title}</h3>
                    {myRoles?.roles.map((role) => (
                      <Badge
                        key={role}
                        variant={
                          role === "得標" ? "default" :
                          role === "未得標" ? "destructive" :
                          "secondary"
                        }
                        className="text-xs shrink-0"
                      >
                        {role}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                    <button
                      className="hover:text-foreground hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigate({ type: "agency", payload: { unitId: record.unit_id, unitName: record.unit_name } });
                      }}
                    >
                      {record.unit_name}
                    </button>
                    <span>{formatPCCDate(record.date)}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3 text-center">
      <div className="text-lg font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
