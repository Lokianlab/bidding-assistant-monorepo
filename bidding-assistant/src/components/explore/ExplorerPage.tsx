"use client";

import { useCallback } from "react";
import { useExplorerStack } from "@/lib/explore/useExplorerStack";
import { ExplorerBreadcrumb } from "./Breadcrumb";
import { SearchView } from "./SearchView";
import { TenderView } from "./TenderView";
import { CompanyView } from "./CompanyView";
import { AgencyView } from "./AgencyView";
import type { NavigateEvent, SearchPayload, TenderPayload, CompanyPayload, AgencyPayload } from "@/lib/explore/types";

export function ExplorerPage() {
  const { stack, current, navigate, jump, reset } = useExplorerStack();

  const handleNavigate = useCallback(
    (event: NavigateEvent) => {
      navigate(event);
    },
    [navigate],
  );

  // 從 StackEntry 的 id 解析回 payload
  const parseTenderPayload = (id: string): TenderPayload | null => {
    const entry = stack.find((e) => e.type === "tender" && e.id === id);
    if (!entry) return null;
    const [unitId, jobNumber] = id.split("/");
    if (!unitId || !jobNumber) return null;
    return { unitId, jobNumber, title: entry.label, unitName: "" };
  };

  // 搜尋模式的初始參數
  const parseSearchPayload = (id: string): SearchPayload | null => {
    const colonIdx = id.indexOf(":");
    if (colonIdx === -1) return null;
    const mode = id.slice(0, colonIdx) as "title" | "company";
    const query = id.slice(colonIdx + 1);
    return { query, mode };
  };

  return (
    <div className="flex flex-col gap-4">
      {/* 麵包屑 */}
      <ExplorerBreadcrumb stack={stack} onJump={jump} />

      {/* 根據目前堆疊頂端渲染對應 View */}
      {!current ? (
        // 初始狀態：搜尋頁
        <SearchView onNavigate={handleNavigate} />
      ) : current.type === "search" ? (
        (() => {
          const sp = parseSearchPayload(current.id);
          return (
            <SearchView
              onNavigate={handleNavigate}
              initialQuery={sp?.query}
              initialMode={sp?.mode}
            />
          );
        })()
      ) : current.type === "tender" ? (
        (() => {
          const [unitId, jobNumber] = current.id.split("/");
          return (
            <TenderView
              key={current.id}
              payload={{ unitId: unitId || "", jobNumber: jobNumber || "", title: current.label, unitName: "" }}
              onNavigate={handleNavigate}
            />
          );
        })()
      ) : current.type === "company" ? (
        <CompanyView
          key={current.id}
          payload={{ name: current.id }}
          onNavigate={handleNavigate}
        />
      ) : current.type === "agency" ? (
        (() => {
          // agency 的 label = unitName
          return (
            <AgencyView
              key={current.id}
              payload={{ unitId: current.id, unitName: current.label }}
              onNavigate={handleNavigate}
            />
          );
        })()
      ) : null}
    </div>
  );
}
