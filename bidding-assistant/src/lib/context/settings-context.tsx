"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { AppSettings } from "@/lib/settings/types";
import { DEFAULT_SETTINGS } from "@/lib/settings/defaults";
import { logger } from "@/lib/logger";

const STORAGE_KEY = "bidding-assistant-settings";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deepMerge<T>(defaults: T, overrides: any): T {
  if (!defaults || typeof defaults !== "object" || Array.isArray(defaults)) return overrides ?? defaults;
  const result = { ...defaults } as Record<string, unknown>;
  for (const key of Object.keys(defaults as Record<string, unknown>)) {
    const dVal = (defaults as Record<string, unknown>)[key];
    const oVal = overrides?.[key];
    if (oVal === undefined) continue;
    if (dVal && typeof dVal === "object" && !Array.isArray(dVal) && oVal && typeof oVal === "object" && !Array.isArray(oVal)) {
      result[key] = deepMerge(dVal, oVal);
    } else {
      result[key] = oVal;
    }
  }
  // Preserve extra keys from overrides (optional fields like featureToggles, fieldMapping)
  if (overrides && typeof overrides === "object") {
    for (const key of Object.keys(overrides)) {
      if (!(key in result)) {
        result[key] = overrides[key];
      }
    }
  }
  return result as T;
}

function loadSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return deepMerge(DEFAULT_SETTINGS, JSON.parse(raw));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function persistSettings(settings: AppSettings) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

interface SettingsContextValue {
  settings: AppSettings;
  hydrated: boolean;
  updateSettings: (patch: Partial<AppSettings>) => void;
  updateSection: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [hydrated] = useState(() => typeof window !== "undefined");

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      persistSettings(next);
      logger.info("settings", "更新設定", JSON.stringify(Object.keys(patch)), "settings-context");
      return next;
    });
  }, []);

  const updateSection = useCallback(<K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      persistSettings(next);
      logger.info("settings", `更新設定區塊: ${String(key)}`, undefined, "settings-context");
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    persistSettings(DEFAULT_SETTINGS);
    logger.warn("settings", "設定已還原為預設值", undefined, "settings-context");
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, hydrated, updateSettings, updateSection, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
