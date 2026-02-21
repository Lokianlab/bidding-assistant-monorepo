"use client";

import { useState, useEffect, useCallback } from "react";
import type { ForumData } from "./types";

interface UseForumResult {
  data: ForumData | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useForum(): UseForumResult {
  const [data, setData] = useState<ForumData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchForum = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/forum");
      if (!res.ok) {
        throw new Error(`載入論壇資料失敗 (${res.status})`);
      }
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "未知錯誤");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchForum();
  }, [fetchForum]);

  return { data, loading, error, refresh: fetchForum };
}
