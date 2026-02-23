"use client";

import { useState, useCallback, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePCCSearch } from "@/lib/pcc/usePCCSearch";
import { parseCompanyRoles, formatPCCDate, calcWinRate } from "@/lib/pcc/helpers";
import { useSettings } from "@/lib/context/settings-context";
import type { PCCRecord, PCCSearchMode } from "@/lib/pcc/types";
import type { NavigateEvent } from "@/lib/explore/types";

interface SearchViewProps {
  onNavigate: (event: NavigateEvent) => void;
  /** 初始搜尋（從 StackEntry 帶入） */
  initialQuery?: string;
  initialMode?: PCCSearchMode;
}

export function SearchView({ onNavigate, initialQuery, initialMode }: SearchViewProps) {
  const { settings } = useSettings();
  const brandName = settings.company?.brand || "大員洛川";
  const [query, setQuery] = useState(initialQuery ?? "");
  const [mode, setMode] = useState<PCCSearchMode>(initialMode ?? "title");
  const { results, loading, error, search } = usePCCSearch();
  const [autoSearched, setAutoSearched] = useState(false);

  useEffect(() => {
    if (initialQuery && !autoSearched) {
      setAutoSearched(true);
      search(initialQuery, initialMode ?? "title");
    }
  }, [initialQuery, initialMode, autoSearched, search]);

  const handleSearch = useCallback(() => {
    if (query.trim()) {
      search(query, mode);
    }
  }, [query, mode, search]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") handleSearch();
    },
    [handleSearch],
  );

  const handlePageChange = useCallback(
    (page: number) => {
      search(query, mode, page);
    },
    [query, mode, search],
  );

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
      <Tabs value={mode} onValueChange={(v) => setMode(v as PCCSearchMode)}>
        <TabsList>
          <TabsTrigger value="title">按案名搜尋</TabsTrigger>
          <TabsTrigger value="company">按廠商搜尋</TabsTrigger>
        </TabsList>
        <TabsContent value="title" className="mt-3">
          <p className="text-muted-foreground text-sm mb-2">
            輸入關鍵字搜尋標案名稱（如：食農教育、走讀、導覽規劃）
          </p>
        </TabsContent>
        <TabsContent value="company" className="mt-3">
          <p className="text-muted-foreground text-sm mb-2">
            輸入廠商名稱查看投標紀錄（如：{brandName}）
          </p>
        </TabsContent>
      </Tabs>

      <div className="flex gap-2">
        <Input
          placeholder={mode === "title" ? "輸入標案關鍵字..." : "輸入廠商名稱..."}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1"
        />
        <Button onClick={handleSearch} disabled={loading || !query.trim()}>
          {loading ? "搜尋中..." : "搜尋"}
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
          {error}
        </div>
      )}

      {results && (
        <SearchResults
          results={results}
          mode={mode}
          query={query}
          onRecordClick={handleRecordClick}
          onCompanyClick={(name) => onNavigate({ type: "company", payload: { name } })}
          onAgencyClick={(unitId, unitName) => onNavigate({ type: "agency", payload: { unitId, unitName } })}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}

// ====== 搜尋結果列表 ======

function SearchResults({
  results,
  mode,
  query,
  onRecordClick,
  onCompanyClick,
  onAgencyClick,
  onPageChange,
}: {
  results: { total_records: number; total_pages: number; page: number; records: PCCRecord[] };
  mode: PCCSearchMode;
  query: string;
  onRecordClick: (record: PCCRecord) => void;
  onCompanyClick: (name: string) => void;
  onAgencyClick: (unitId: string, unitName: string) => void;
  onPageChange: (page: number) => void;
}) {
  const winRate = mode === "company" ? calcWinRate(results.records, query) : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          共 {results.total_records.toLocaleString()} 筆結果
          （第 {results.page}/{results.total_pages} 頁）
        </p>
        {winRate && winRate.total > 0 && (
          <Badge variant="secondary">
            得標率 {(winRate.rate * 100).toFixed(0)}%（{winRate.wins}/{winRate.total}）
          </Badge>
        )}
      </div>

      <div className="space-y-2">
        {results.records.map((record) => (
          <RecordCard
            key={`${record.unit_id}-${record.job_number}`}
            record={record}
            mode={mode}
            companyQuery={query}
            onClick={() => onRecordClick(record)}
            onCompanyClick={onCompanyClick}
            onAgencyClick={() => onAgencyClick(record.unit_id, record.unit_name)}
          />
        ))}
      </div>

      {results.total_pages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={results.page <= 1}
            onClick={() => onPageChange(results.page - 1)}
          >
            上一頁
          </Button>
          <span className="text-sm text-muted-foreground">
            {results.page} / {results.total_pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={results.page >= results.total_pages}
            onClick={() => onPageChange(results.page + 1)}
          >
            下一頁
          </Button>
        </div>
      )}
    </div>
  );
}

// ====== 單筆結果卡片（增加可鑽探連結） ======

function RecordCard({
  record,
  mode,
  companyQuery,
  onClick,
  onCompanyClick,
  onAgencyClick,
}: {
  record: PCCRecord;
  mode: PCCSearchMode;
  companyQuery: string;
  onClick: () => void;
  onCompanyClick: (name: string) => void;
  onAgencyClick: () => void;
}) {
  const companies = parseCompanyRoles(record);
  const isAward = record.brief.type === "決標公告";

  return (
    <Card className="py-3 transition-colors hover:bg-accent/50">
      <CardContent className="space-y-2">
        {/* 標題列（點擊整行進入案件詳情） */}
        <div
          className="flex items-start justify-between gap-2 cursor-pointer"
          onClick={onClick}
        >
          <h3 className="text-sm font-medium leading-snug">
            {record.brief.title}
          </h3>
          <Badge variant={isAward ? "default" : "outline"} className="shrink-0">
            {record.brief.type}
          </Badge>
        </div>

        {/* 基本資訊 */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <button
            className="hover:text-foreground hover:underline"
            onClick={(e) => { e.stopPropagation(); onAgencyClick(); }}
          >
            {record.unit_name}
          </button>
          <span>{formatPCCDate(record.date)}</span>
          {record.job_number && <span>案號 {record.job_number}</span>}
        </div>

        {/* 公司角色（可點擊鑽進廠商） */}
        {isAward && companies.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {companies.map((c, companyIndex) => {
              const shortName = c.name.replace(/\s*\(.*\)\s*$/, "").trim();
              const isTarget = mode === "company" && c.name.includes(companyQuery);
              return c.roles.map((role, roleIndex) => (
                <Badge
                  key={`${record.unit_id}-${record.job_number}-${companyIndex}-${roleIndex}`}
                  variant={
                    role === "得標" ? "default" :
                    role === "未得標" ? "destructive" :
                    "secondary"
                  }
                  className={`text-xs cursor-pointer hover:ring-2 hover:ring-ring ${isTarget ? "ring-2 ring-ring" : ""}`}
                  onClick={(e) => { e.stopPropagation(); onCompanyClick(shortName); }}
                >
                  {shortName.length > 8 ? shortName.slice(0, 8) + "…" : shortName}
                  {" "}{role}
                </Badge>
              ));
            })}
          </div>
        )}

        {/* 標題搜尋時顯示投標廠商數 */}
        {mode === "title" && isAward && companies.length > 0 && (
          <div className="text-xs text-muted-foreground">
            {companies.length} 家廠商投標
          </div>
        )}
      </CardContent>
    </Card>
  );
}
