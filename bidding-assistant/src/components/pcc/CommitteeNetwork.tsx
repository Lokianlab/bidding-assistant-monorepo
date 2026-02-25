"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useCommitteeAnalysis } from "@/lib/pcc/useCommitteeAnalysis";
import { formatPCCDate } from "@/lib/pcc/helpers";
import type { CommitteeMemberProfile } from "@/lib/pcc/committee-analysis";
import { pccApiFetch } from "@/lib/pcc/api";
import type { PCCSearchResponse } from "@/lib/pcc/types";

interface CommitteeNetworkProps {
  /** 從外部帶入的機關（自動觸發分析） */
  targetAgency?: { unitId: string; unitName: string } | null;
  onTargetConsumed?: () => void;
}

export function CommitteeNetwork({ targetAgency, onTargetConsumed }: CommitteeNetworkProps = {}) {
  const [unitId, setUnitId] = useState("");
  const [unitName, setUnitName] = useState("");
  const { data, loading, progress, error, run } = useCommitteeAnalysis();
  const consumedRef = useRef<string | null>(null);

  const [agencyQuery, setAgencyQuery] = useState("");
  const [agencyOptions, setAgencyOptions] = useState<{ unitId: string; unitName: string }[]>([]);
  const [agencySearching, setAgencySearching] = useState(false);
  const [selectedAgency, setSelectedAgency] = useState<{ unitId: string; unitName: string } | null>(null);

  // 外部跳轉：自動帶入機關並觸發分析
  useEffect(() => {
    if (targetAgency && targetAgency.unitId !== consumedRef.current) {
      consumedRef.current = targetAgency.unitId;
      setUnitId(targetAgency.unitId);
      setUnitName(targetAgency.unitName);
      setSelectedAgency(targetAgency);
      run(targetAgency.unitId, targetAgency.unitName);
      onTargetConsumed?.();
    }
  }, [targetAgency, run, onTargetConsumed]);

  const searchAgencies = async () => {
    if (!agencyQuery.trim()) return;
    setAgencySearching(true);
    setAgencyOptions([]);
    setSelectedAgency(null);
    try {
      const data = await pccApiFetch<PCCSearchResponse>("searchByTitle", {
        query: agencyQuery.trim(),
        page: 1,
      });
      const seen = new Set<string>();
      const agencies: { unitId: string; unitName: string }[] = [];
      for (const r of data.records ?? []) {
        if (!seen.has(r.unit_id)) {
          seen.add(r.unit_id);
          agencies.push({ unitId: r.unit_id, unitName: r.unit_name });
        }
      }
      setAgencyOptions(agencies);
    } catch {
      // silently ignore
    } finally {
      setAgencySearching(false);
    }
  };

  const handleSelectAgency = (agency: { unitId: string; unitName: string }) => {
    setSelectedAgency(agency);
    setUnitId(agency.unitId);
    setUnitName(agency.unitName);
    run(agency.unitId, agency.unitName);
    setAgencyOptions([]);
  };

  return (
    <div className="space-y-4">
      {/* 機關搜尋 */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="輸入機關名稱關鍵字搜尋..."
            value={agencyQuery}
            onChange={(e) => setAgencyQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchAgencies()}
            className="flex-1"
            disabled={loading}
          />
          <Button onClick={searchAgencies} disabled={agencySearching || loading || !agencyQuery.trim()} variant="outline">
            {agencySearching ? "搜尋中..." : "搜尋機關"}
          </Button>
        </div>

        {/* 機關選單 */}
        {agencyOptions.length > 0 && (
          <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
            {agencyOptions.map((a) => (
              <button
                key={a.unitId}
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center justify-between gap-2"
                onClick={() => handleSelectAgency(a)}
              >
                <span className="truncate">{a.unitName}</span>
                <span className="text-xs text-muted-foreground shrink-0">{a.unitId}</span>
              </button>
            ))}
          </div>
        )}

        {/* 已選機關 */}
        {selectedAgency && (
          <div className="flex items-center gap-2 text-sm bg-muted rounded-lg px-3 py-2">
            <span className="truncate flex-1">{selectedAgency.unitName}</span>
            <span className="text-xs text-muted-foreground">{selectedAgency.unitId}</span>
          </div>
        )}
      </div>

      {/* 進度條 */}
      {loading && progress && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>正在取得標案詳情...</span>
            <span>{progress.loaded} / {progress.total}</span>
          </div>
          <Progress value={(progress.loaded / progress.total) * 100} />
        </div>
      )}

      {error && (
        <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
          {error}
        </div>
      )}

      {data && <CommitteeResults data={data} />}
    </div>
  );
}

// ====== 分析結果展示 ======

function CommitteeResults({ data }: { data: import("@/lib/pcc/committee-analysis").CommitteeAnalysis }) {
  if (data.totalTenders === 0) {
    return (
      <div className="text-sm text-muted-foreground py-8 text-center">
        該機關無決標紀錄
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 總覽 */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-2xl font-bold">{data.totalTenders}</div>
            <div className="text-xs text-muted-foreground">分析標案數</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-2xl font-bold">{data.totalMembers}</div>
            <div className="text-xs text-muted-foreground">不重複評委</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-2xl font-bold">{data.frequentMembers.length}</div>
            <div className="text-xs text-muted-foreground">常見評委</div>
          </CardContent>
        </Card>
      </div>

      {/* 常見評委列表 */}
      {data.frequentMembers.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-4">
          無評委出現 2 次以上
        </div>
      ) : (
        <div className="space-y-3">
          <h3 className="font-medium text-sm">常見評委（出現 ≥ 2 次）</h3>
          {data.frequentMembers.map((member) => (
            <MemberCard key={member.name} member={member} />
          ))}
        </div>
      )}
    </div>
  );
}

// ====== 單一評委卡片 ======

function MemberCard({ member }: { member: CommitteeMemberProfile }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card>
      <CardHeader className="pb-2 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm">{member.name}</CardTitle>
            <Badge variant="outline" className="text-xs">{member.status}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="text-xs">{member.appearances} 次</Badge>
            <Badge
              variant={member.attendanceRate >= 0.8 ? "default" : "secondary"}
              className="text-xs"
            >
              出席 {(member.attendanceRate * 100).toFixed(0)}%
            </Badge>
          </div>
        </div>
        {member.experience && (
          <p className="text-xs text-muted-foreground mt-1">{member.experience}</p>
        )}
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0">
          {/* 關聯機關 */}
          {member.agencies.length > 1 && (
            <div className="mb-2">
              <span className="text-xs text-muted-foreground">跨機關：</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {member.agencies.map((a) => (
                  <Badge key={a} variant="secondary" className="text-xs">{a}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* 逐案紀錄 */}
          <div className="space-y-1">
            {member.tenders.map((t) => (
              <div
                key={`${t.date}-${t.tenderTitle}`}
                className="flex items-center gap-2 text-xs"
              >
                <span className="text-muted-foreground shrink-0">
                  {formatPCCDate(t.date)}
                </span>
                <Badge
                  variant={t.attended ? "default" : "destructive"}
                  className="text-xs shrink-0"
                >
                  {t.attended ? "出席" : "未出席"}
                </Badge>
                <span className="truncate" title={t.tenderTitle}>
                  {t.tenderTitle}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
