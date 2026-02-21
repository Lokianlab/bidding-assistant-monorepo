"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { ForumData } from "./types";

interface UseForumResult {
  data: ForumData | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

const POLL_INTERVAL = 30_000; // 30 秒自動刷新

export function useForum(): UseForumResult {
  const [data, setData] = useState<ForumData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchingRef = useRef(false);

  const fetchForum = useCallback(async (silent = false) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    if (!silent) {
      setLoading(true);
      setError(null);
    }

    try {
      const res = await fetch("/api/forum");
      if (!res.ok) {
        throw new Error(`載入論壇資料失敗 (${res.status})`);
      }
      const json = await res.json();
      setData(json);
      if (!silent) setError(null);
    } catch (e) {
      if (!silent) {
        setError(e instanceof Error ? e.message : "未知錯誤");
      }
    } finally {
      if (!silent) setLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  // 初次載入
  useEffect(() => {
    fetchForum(false);
  }, [fetchForum]);

  // 自動輪詢（每 30 秒靜默刷新，不顯示 loading 狀態）
  useEffect(() => {
    const interval = setInterval(() => fetchForum(true), POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchForum]);

  return { data, loading, error, refresh: () => fetchForum(false) };
}
