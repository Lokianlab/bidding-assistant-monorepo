"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { startTransition } from "react";
import type { NotionPage } from "@/lib/dashboard/types";
import { loadPerfCache, savePerfCache, type PerfCacheData } from "@/lib/dashboard/helpers";
import { REVIEW_STATUSES, buildStatusFilter } from "@/lib/dashboard/types";
import { F } from "@/lib/dashboard/types";
import { FIELDS_PERFORMANCE } from "@/lib/constants/notion-fields";

// ====== Notion API filter（只抓績效相關案件） ======
const REVIEW_FILTER = buildStatusFilter(REVIEW_STATUSES, F.進程);

export interface PerformanceDataState {
  allPages: NotionPage[];
  loading: boolean;
  connected: boolean;
  bgLoading: boolean;
  loadProgress: string;
  fetchData: (isRefresh?: boolean) => Promise<void>;
}

/**
 * 績效資料載入 hook
 * 兩階段：快速首批 → 背景逐批續抓
 * 含快取、斷點續傳、AbortController
 */
export function usePerformanceData(
  token: string,
  databaseId: string,
  hydrated: boolean,
): PerformanceDataState {
  const [allPages, setAllPages] = useState<NotionPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [bgLoading, setBgLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState("");

  const schemaRef = useRef<PerfCacheData["schema"] | null>(null);
  const bgAbortRef = useRef<AbortController | null>(null);
  const propIdsRef = useRef<string[] | undefined>(undefined);

  // ====== 背景續抓 ======
  const fetchRemaining = useCallback(async (
    cursor: string,
    existingPages: NotionPage[],
    schema: PerfCacheData["schema"] | null,
    propIds?: string[],
  ) => {
    if (bgAbortRef.current) bgAbortRef.current.abort();
    const abortCtrl = new AbortController();
    bgAbortRef.current = abortCtrl;

    setBgLoading(true);
    if (schema) schemaRef.current = schema;
    if (propIds) propIdsRef.current = propIds;
    const curSchema = schema ?? schemaRef.current;
    const curPropIds = propIds ?? propIdsRef.current;

    let accumulated = [...existingPages];
    let nextCursor: string | null = cursor;
    let round = 0;

    while (nextCursor && !abortCtrl.signal.aborted) {
      round++;
      setLoadProgress(`背景載入中…已載入 ${accumulated.length} 件，第 ${round + 1} 批`);
      try {
        const bgRes = await fetch("/api/notion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: abortCtrl.signal,
          body: JSON.stringify({
            token, databaseId,
            action: "continue_query",
            data: {
              cursor: nextCursor,
              filter: REVIEW_FILTER,
              filterProperties: curPropIds,
            },
          }),
        });
        const bgResult = await bgRes.json();
        if (!bgResult.pages?.length) {
          nextCursor = null;
          break;
        }

        accumulated = [...accumulated, ...bgResult.pages];
        startTransition(() => { setAllPages(accumulated); });

        if (bgResult.hasMore && bgResult.nextCursor) {
          nextCursor = bgResult.nextCursor as string;
          if (curSchema) savePerfCache(curSchema, accumulated, false, nextCursor, curPropIds);
        } else {
          nextCursor = null;
        }
      } catch {
        if (!abortCtrl.signal.aborted && curSchema) {
          savePerfCache(curSchema, accumulated, false, nextCursor, curPropIds);
          setLoadProgress(`載入中斷（已載入 ${accumulated.length} 件），下次開啟將自動接續`);
        }
        setBgLoading(false);
        return;
      }
    }

    if (!abortCtrl.signal.aborted) {
      if (curSchema) savePerfCache(curSchema, accumulated, true, undefined, curPropIds);
      setLoadProgress("");
    }
    setBgLoading(false);
  }, [token, databaseId]);

  // ====== 主載入 ======
  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh && bgAbortRef.current) {
      bgAbortRef.current.abort();
      bgAbortRef.current = null;
    }

    if (!token || !databaseId) {
      setAllPages([]);
      setConnected(false);
      setLoading(false);
      return;
    }

    let hasCached = false;
    if (!isRefresh) {
      const cached = loadPerfCache();
      if (cached && cached.pages.length > 0) {
        setAllPages(cached.pages);
        setConnected(true);
        setLoading(false);
        hasCached = true;
        schemaRef.current = cached.schema;
        if (cached.propIds) propIdsRef.current = cached.propIds;

        if (!cached.complete && cached.nextCursor) {
          fetchRemaining(cached.nextCursor, cached.pages, cached.schema, cached.propIds);
          return;
        }
      }
    }

    if (!hasCached) setLoading(true);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const res = await fetch("/api/notion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          token, databaseId,
          action: "schema_and_query",
          data: { filter: REVIEW_FILTER, quickLoad: true, fields: FIELDS_PERFORMANCE },
        }),
      });
      clearTimeout(timeout);
      const result = await res.json();

      if (result.pages?.length) {
        setAllPages(result.pages);
        setConnected(true);
        setLoading(false);
        schemaRef.current = result.schema;
        const resPropIds: string[] | undefined = result._propIds;
        if (resPropIds) propIdsRef.current = resPropIds;

        if (result.hasMore && result.nextCursor) {
          if (result.schema) savePerfCache(result.schema, result.pages, false, result.nextCursor, resPropIds);
          fetchRemaining(result.nextCursor, result.pages, result.schema, resPropIds);
        } else {
          if (result.schema) savePerfCache(result.schema, result.pages, true, undefined, resPropIds);
        }
      } else if (result.pages) {
        setAllPages([]);
        setConnected(true);
      } else if (!hasCached) {
        setAllPages([]);
        setConnected(false);
      }
    } catch {
      if (!hasCached) {
        const cached = loadPerfCache();
        if (cached && cached.pages.length > 0) {
          setAllPages(cached.pages);
          setConnected(true);
          if (cached.propIds) propIdsRef.current = cached.propIds;
          if (!cached.complete && cached.nextCursor) {
            fetchRemaining(cached.nextCursor, cached.pages, cached.schema, cached.propIds);
          }
        }
      }
    }
    setLoading(false);
  }, [token, databaseId, fetchRemaining]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time data fetch triggered by hydration flag
    if (hydrated) fetchData();
  }, [hydrated, fetchData]);

  return { allPages, loading, connected, bgLoading, loadProgress, fetchData };
}
