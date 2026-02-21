"use client";

// ====== 知識庫資料 Hook ======
// 管理 localStorage 中的知識庫資料

import { logger } from "@/lib/logger";

import { useState, useEffect, useCallback } from "react";
import type {
  KBId,
  KBEntry00A,
  KBEntry00B,
  KBEntry00C,
  KBEntry00D,
  KBEntry00E,
  KnowledgeBaseData,
} from "./types";
import { KB_STORAGE_KEY, KB_DATA_VERSION, EMPTY_KB_DATA } from "./constants";

/** 從 localStorage 載入資料 */
function loadKBData(): KnowledgeBaseData {
  if (typeof window === "undefined") return { ...EMPTY_KB_DATA };
  try {
    const raw = localStorage.getItem(KB_STORAGE_KEY);
    if (!raw) return { ...EMPTY_KB_DATA };
    const parsed = JSON.parse(raw) as KnowledgeBaseData;
    // 版本檢查（未來擴充用）
    if (!parsed.version || parsed.version < KB_DATA_VERSION) {
      // 執行資料遷移（目前 v1 不需要）
      parsed.version = KB_DATA_VERSION;
    }
    // 確保所有 key 存在
    return {
      "00A": parsed["00A"] ?? [],
      "00B": parsed["00B"] ?? [],
      "00C": parsed["00C"] ?? [],
      "00D": parsed["00D"] ?? [],
      "00E": parsed["00E"] ?? [],
      lastUpdated: parsed.lastUpdated ?? new Date().toISOString(),
      version: KB_DATA_VERSION,
    };
  } catch {
    return { ...EMPTY_KB_DATA };
  }
}

/** 儲存到 localStorage */
function saveKBData(data: KnowledgeBaseData): void {
  try {
    const toSave = { ...data, lastUpdated: new Date().toISOString() };
    localStorage.setItem(KB_STORAGE_KEY, JSON.stringify(toSave));
  } catch (err) {
    logger.warn("system", "知識庫儲存失敗", String(err));
  }
}

export function useKnowledgeBase() {
  const [data, setData] = useState<KnowledgeBaseData>(() => loadKBData());
  const [hydrated] = useState(() => typeof window !== "undefined");

  // data 變更時自動儲存
  useEffect(() => {
    if (hydrated) {
      saveKBData(data);
    }
  }, [data, hydrated]);

  // ====== CRUD 操作 ======

  /** 新增 00A 條目 */
  const addEntry00A = useCallback((entry: KBEntry00A) => {
    setData((prev) => ({
      ...prev,
      "00A": [...prev["00A"], entry],
    }));
  }, []);

  /** 更新 00A 條目 */
  const updateEntry00A = useCallback((id: string, updates: Partial<KBEntry00A>) => {
    setData((prev) => ({
      ...prev,
      "00A": prev["00A"].map((e) => (e.id === id ? { ...e, ...updates, updatedAt: new Date().toISOString() } : e)),
    }));
  }, []);

  /** 新增 00B 條目 */
  const addEntry00B = useCallback((entry: KBEntry00B) => {
    setData((prev) => ({
      ...prev,
      "00B": [...prev["00B"], entry],
    }));
  }, []);

  /** 更新 00B 條目 */
  const updateEntry00B = useCallback((id: string, updates: Partial<KBEntry00B>) => {
    setData((prev) => ({
      ...prev,
      "00B": prev["00B"].map((e) => (e.id === id ? { ...e, ...updates, updatedAt: new Date().toISOString() } : e)),
    }));
  }, []);

  /** 新增 00C 條目 */
  const addEntry00C = useCallback((entry: KBEntry00C) => {
    setData((prev) => ({
      ...prev,
      "00C": [...prev["00C"], entry],
    }));
  }, []);

  /** 更新 00C 條目 */
  const updateEntry00C = useCallback((id: string, updates: Partial<KBEntry00C>) => {
    setData((prev) => ({
      ...prev,
      "00C": prev["00C"].map((e) => (e.id === id ? { ...e, ...updates, updatedAt: new Date().toISOString() } : e)),
    }));
  }, []);

  /** 新增 00D 條目 */
  const addEntry00D = useCallback((entry: KBEntry00D) => {
    setData((prev) => ({
      ...prev,
      "00D": [...prev["00D"], entry],
    }));
  }, []);

  /** 更新 00D 條目 */
  const updateEntry00D = useCallback((id: string, updates: Partial<KBEntry00D>) => {
    setData((prev) => ({
      ...prev,
      "00D": prev["00D"].map((e) => (e.id === id ? { ...e, ...updates, updatedAt: new Date().toISOString() } : e)),
    }));
  }, []);

  /** 新增 00E 條目 */
  const addEntry00E = useCallback((entry: KBEntry00E) => {
    setData((prev) => ({
      ...prev,
      "00E": [...prev["00E"], entry],
    }));
  }, []);

  /** 更新 00E 條目 */
  const updateEntry00E = useCallback((id: string, updates: Partial<KBEntry00E>) => {
    setData((prev) => ({
      ...prev,
      "00E": prev["00E"].map((e) => (e.id === id ? { ...e, ...updates, updatedAt: new Date().toISOString() } : e)),
    }));
  }, []);

  /** 通用：刪除任一知識庫條目 */
  const deleteEntry = useCallback((kbId: KBId, entryId: string) => {
    setData((prev) => ({
      ...prev,
      [kbId]: (prev[kbId] as Array<{ id: string }>).filter((e) => e.id !== entryId),
    }));
  }, []);

  /** 通用：更新條目狀態 */
  const updateEntryStatus = useCallback(
    (kbId: KBId, entryId: string, status: "active" | "draft" | "archived") => {
      setData((prev) => ({
        ...prev,
        [kbId]: (prev[kbId] as Array<{ id: string; entryStatus: string; updatedAt: string }>).map((e) =>
          e.id === entryId
            ? { ...e, entryStatus: status, updatedAt: new Date().toISOString() }
            : e
        ),
      }));
    },
    []
  );

  /** 匯入完整資料（從 JSON） */
  const importData = useCallback((imported: Partial<KnowledgeBaseData>) => {
    setData((prev) => ({
      "00A": imported["00A"] ?? prev["00A"],
      "00B": imported["00B"] ?? prev["00B"],
      "00C": imported["00C"] ?? prev["00C"],
      "00D": imported["00D"] ?? prev["00D"],
      "00E": imported["00E"] ?? prev["00E"],
      lastUpdated: new Date().toISOString(),
      version: KB_DATA_VERSION,
    }));
  }, []);

  /** 匯出完整資料 */
  const exportData = useCallback((): KnowledgeBaseData => {
    return { ...data, lastUpdated: new Date().toISOString() };
  }, [data]);

  /** 清空所有資料 */
  const clearAll = useCallback(() => {
    setData({ ...EMPTY_KB_DATA, lastUpdated: new Date().toISOString() });
  }, []);

  return {
    data,
    hydrated,
    // 00A
    addEntry00A,
    updateEntry00A,
    // 00B
    addEntry00B,
    updateEntry00B,
    // 00C
    addEntry00C,
    updateEntry00C,
    // 00D
    addEntry00D,
    updateEntry00D,
    // 00E
    addEntry00E,
    updateEntry00E,
    // 通用
    deleteEntry,
    updateEntryStatus,
    importData,
    exportData,
    clearAll,
  };
}
