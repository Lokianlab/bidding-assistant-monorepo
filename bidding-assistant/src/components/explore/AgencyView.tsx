"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAgencyIntel } from "@/lib/pcc/useAgencyIntel";
import { useSettings } from "@/lib/context/settings-context";
import { formatPCCDate } from "@/lib/pcc/helpers";
import type { NavigateEvent, AgencyPayload } from "@/lib/explore/types";

interface AgencyViewProps {
  payload: AgencyPayload;
  onNavigate: (event: NavigateEvent) => void;
}

export function AgencyView({ payload, onNavigate }: AgencyViewProps) {
  const { settings } = useSettings();
  const myCompany = settings.company?.brand || "大員洛川";
  const intel = useAgencyIntel(payload.unitId, true, myCompany);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">{payload.unitName}</h2>
        <p className="text-sm text-muted-foreground mt-1">機關歷史標案分析</p>
      </div>

      {intel.loading && (
        <div className="py-8 text-center text-muted-foreground text-sm">
          載入 {payload.unitName} 歷史標案...
        </div>
      )}

      {intel.error && (
        <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
          {intel.error}
        </div>
      )}

      {intel.data && (
        <div className="space-y-4">
          {/* 統計概覽 */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border p-3 text-center">
              <div className="text-lg font-bold">{intel.data.totalCases}</div>
              <div className="text-xs text-muted-foreground">決標紀錄</div>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <div className="text-lg font-bold">{intel.data.incumbents.length}</div>
              <div className="text-xs text-muted-foreground">在位者</div>
            </div>
          </div>

          {/* 在位者（可鑽探到廠商） */}
          {intel.data.incumbents.length > 0 && (
            <section>
              <h4 className="font-medium text-sm mb-2">在位者（得標 ≥ 2 次）</h4>
              <div className="space-y-1.5">
                {intel.data.incumbents.map((inc) => (
                  <div key={inc.name} className="flex items-center justify-between text-sm">
                    <button
                      className="truncate max-w-[250px] hover:text-primary hover:underline text-left"
                      onClick={() => onNavigate({ type: "company", payload: { name: inc.name } })}
                      title={inc.name}
                    >
                      {inc.name}
                    </button>
                    <Badge variant="default" className="text-xs">{inc.wins} 次得標</Badge>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 我方紀錄 */}
          <Separator />
          {intel.data.myHistory.length > 0 ? (
            <section>
              <h4 className="font-medium text-sm mb-2">
                我方紀錄（{intel.data.myHistory.filter((h) => h.won).length}/{intel.data.myHistory.length} 得標）
              </h4>
              <div className="space-y-1">
                {intel.data.myHistory.map((h) => (
                  <div key={`${h.date}-${h.title}`} className="flex items-center gap-2 text-xs">
                    <Badge variant={h.won ? "default" : "destructive"} className="text-xs shrink-0">
                      {h.won ? "得標" : "未得標"}
                    </Badge>
                    <span className="truncate" title={h.title}>{h.title}</span>
                    <span className="text-muted-foreground shrink-0">{formatPCCDate(h.date)}</span>
                  </div>
                ))}
              </div>
            </section>
          ) : (
            <div className="text-sm text-muted-foreground">我方無此機關投標紀錄</div>
          )}

          {/* 近期標案（可鑽探到案件） */}
          {intel.data.recentCases.length > 0 && (
            <>
              <Separator />
              <section>
                <h4 className="font-medium text-sm mb-2">
                  近期標案（{intel.data.recentCases.length} 筆）
                </h4>
                <div className="space-y-2">
                  {intel.data.recentCases.map((c) => (
                    <Card
                      key={`${c.date}-${c.title}`}
                      className="py-2 cursor-pointer transition-colors hover:bg-accent/50"
                      onClick={() => {
                        // 搜尋此案名來取得完整記錄
                        // 使用標題搜尋來找到這個案件
                        onNavigate({
                          type: "search",
                          payload: { query: c.title.slice(0, 30), mode: "title" },
                        });
                      }}
                    >
                      <CardContent className="space-y-1">
                        <h3 className="text-sm font-medium leading-snug">{c.title}</h3>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{formatPCCDate(c.date)}</span>
                          <span>{c.bidders} 家投標</span>
                          {c.winner && (
                            <button
                              className="text-primary hover:underline"
                              onClick={(e) => {
                                e.stopPropagation();
                                onNavigate({ type: "company", payload: { name: c.winner! } });
                              }}
                            >
                              得標：{c.winner.length > 10 ? c.winner.slice(0, 10) + "…" : c.winner}
                            </button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      )}
    </div>
  );
}
