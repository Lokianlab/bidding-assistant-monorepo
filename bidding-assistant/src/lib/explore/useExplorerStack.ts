"use client";

import { useState, useCallback } from "react";
import type { StackEntry, NavigateEvent } from "./types";

interface UseExplorerStackReturn {
  /** 目前的堆疊（第 0 筆 = 最底層，最後一筆 = 目前顯示） */
  stack: StackEntry[];
  /** 目前顯示的實體（堆疊頂端） */
  current: StackEntry | null;
  /** 鑽進去（push 新實體到堆疊） */
  push: (entry: StackEntry) => void;
  /** 回上一層 */
  pop: () => void;
  /** 跳到麵包屑的某一層（index 之後的全部丟掉） */
  jump: (index: number) => void;
  /** 重設堆疊（回到初始搜尋狀態） */
  reset: () => void;
  /** 從 NavigateEvent 建立 StackEntry 並 push */
  navigate: (event: NavigateEvent) => void;
}

/** 將 NavigateEvent 轉換為 StackEntry */
function eventToEntry(event: NavigateEvent): StackEntry {
  switch (event.type) {
    case "tender":
      return {
        type: "tender",
        id: `${event.payload.unitId}/${event.payload.jobNumber}`,
        label: event.payload.title.length > 20
          ? event.payload.title.slice(0, 20) + "…"
          : event.payload.title,
      };
    case "company":
      return {
        type: "company",
        id: event.payload.name,
        label: event.payload.name,
      };
    case "agency":
      return {
        type: "agency",
        id: event.payload.unitId,
        label: event.payload.unitName,
      };
    case "search":
      return {
        type: "search",
        id: `${event.payload.mode}:${event.payload.query}`,
        label: `搜尋「${event.payload.query}」`,
      };
  }
}

export function useExplorerStack(): UseExplorerStackReturn {
  const [stack, setStack] = useState<StackEntry[]>([]);

  const current = stack.length > 0 ? stack[stack.length - 1] : null;

  const push = useCallback((entry: StackEntry) => {
    setStack((prev) => [...prev, entry]);
  }, []);

  const pop = useCallback(() => {
    setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  const jump = useCallback((index: number) => {
    setStack((prev) => {
      if (index < 0 || index >= prev.length) return prev;
      return prev.slice(0, index + 1);
    });
  }, []);

  const reset = useCallback(() => {
    setStack([]);
  }, []);

  const navigate = useCallback((event: NavigateEvent) => {
    const entry = eventToEntry(event);
    setStack((prev) => [...prev, entry]);
  }, []);

  return { stack, current, push, pop, jump, reset, navigate };
}
