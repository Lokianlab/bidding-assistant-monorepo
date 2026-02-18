"use client";

// ====== 使用者自訂常用選項 Hook ======
// 管理 localStorage 中各欄位的常用選項
// 每個欄位有一組 key，預設值可由程式提供，使用者可以自行增刪

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "bidding-assistant-custom-options";

/** 所有可自訂選項的欄位 key */
export type OptionFieldKey =
  | "00A_roles"       // 00A 授權角色
  | "00B_entity"      // 00B 承接主體
  | "00B_role"        // 00B 本公司角色
  | "00B_status"      // 00B 結案狀態
  | "00C_type"        // 00C 適用類型
  | "00D_risk"        // 00D 風險名稱
  | "00E_result";     // 00E 結果

/** 內建預設選項（使用者刪除後不會再自動出現） */
export const DEFAULT_OPTIONS: Record<OptionFieldKey, string[]> = {
  "00A_roles": ["計畫主持人", "協同主持人", "專案經理", "企劃", "執行人員", "課程講師", "策展人", "設計師"],
  "00B_entity": ["大員洛川股份有限公司", "臺灣鹿山文社"],
  "00B_role": ["得標廠商（與機關簽約）", "協力廠商", "聯合承攬", "轉包廠商"],
  "00B_status": ["已驗收結案", "履約中", "未得標", "已解約"],
  "00C_type": ["展覽策展", "活動企劃", "行銷推廣", "教育訓練", "研究調查", "影片製作", "出版印刷"],
  "00D_risk": ["醫療緊急事件", "天候異常", "場地設備故障", "人員異動", "交通中斷", "供應商違約", "活動取消", "資安事件"],
  "00E_result": ["得標", "未得標", "流標", "廢標", "撤回投標"],
};

type AllOptions = Partial<Record<OptionFieldKey, string[]>>;

function loadOptions(): AllOptions {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as AllOptions;
  } catch {
    return {};
  }
}

function saveOptions(data: AllOptions): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn("自訂選項儲存失敗：", err);
  }
}

export function useCustomOptions() {
  const [options, setOptions] = useState<AllOptions>(() => loadOptions());
  const [hydrated] = useState(() => typeof window !== "undefined");

  useEffect(() => {
    if (hydrated) {
      saveOptions(options);
    }
  }, [options, hydrated]);

  /** 取得某欄位的選項列表（使用者自訂 > 預設） */
  const getOptions = useCallback(
    (key: OptionFieldKey): string[] => {
      // 使用者有存過就用使用者的，否則用預設
      return options[key] ?? DEFAULT_OPTIONS[key] ?? [];
    },
    [options]
  );

  /** 新增一個選項到指定欄位 */
  const addOption = useCallback((key: OptionFieldKey, value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setOptions((prev) => {
      const current = prev[key] ?? DEFAULT_OPTIONS[key] ?? [];
      if (current.includes(trimmed)) return prev;
      return { ...prev, [key]: [...current, trimmed] };
    });
  }, []);

  /** 從指定欄位移除一個選項 */
  const removeOption = useCallback((key: OptionFieldKey, value: string) => {
    setOptions((prev) => {
      const current = prev[key] ?? DEFAULT_OPTIONS[key] ?? [];
      const filtered = current.filter((o) => o !== value);
      return { ...prev, [key]: filtered };
    });
  }, []);

  /** 重設某欄位回預設值 */
  const resetOptions = useCallback((key: OptionFieldKey) => {
    setOptions((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  return {
    hydrated,
    getOptions,
    addOption,
    removeOption,
    resetOptions,
  };
}
