"use client";

import { useSettings } from "@/lib/context/settings-context";
import {
  isFeatureEnabled,
  getEnabledFeatures,
  type FeatureDefinition,
} from "./feature-registry";

/** 查詢單一模組是否啟用 */
export function useFeatureEnabled(featureId: string): boolean {
  const { settings } = useSettings();
  return isFeatureEnabled(featureId, settings.featureToggles ?? {});
}

/** 取得所有已啟用的模組清單 */
export function useEnabledFeatures(): FeatureDefinition[] {
  const { settings } = useSettings();
  return getEnabledFeatures(settings.featureToggles ?? {});
}
