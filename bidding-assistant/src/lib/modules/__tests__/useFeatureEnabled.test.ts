import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { SettingsProvider, useSettings } from "@/lib/context/settings-context";
import { useFeatureEnabled, useEnabledFeatures } from "../useFeatureEnabled";
import { FEATURE_REGISTRY } from "../feature-registry";

const STORAGE_KEY = "bidding-assistant-settings";

function wrapper({ children }: { children: ReactNode }) {
  return createElement(SettingsProvider, null, children);
}

beforeEach(() => {
  localStorage.clear();
});

// ── useFeatureEnabled ────────────────────────────────────────

describe("useFeatureEnabled", () => {
  it("returns true for a default-enabled feature", () => {
    const { result } = renderHook(() => useFeatureEnabled("dashboard"), {
      wrapper,
    });
    expect(result.current).toBe(true);
  });

  it("returns false for an unknown feature ID", () => {
    const { result } = renderHook(
      () => useFeatureEnabled("nonexistent-feature"),
      { wrapper },
    );
    expect(result.current).toBe(false);
  });

  it("returns false when feature is explicitly disabled in settings", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ featureToggles: { dashboard: false } }),
    );
    const { result } = renderHook(() => useFeatureEnabled("dashboard"), {
      wrapper,
    });
    expect(result.current).toBe(false);
  });

  it("returns true when feature is explicitly enabled in settings", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ featureToggles: { dashboard: true } }),
    );
    const { result } = renderHook(() => useFeatureEnabled("dashboard"), {
      wrapper,
    });
    expect(result.current).toBe(true);
  });

  it("reacts to settings changes", () => {
    const { result } = renderHook(
      () => {
        const enabled = useFeatureEnabled("quality");
        const { updateSettings } = useSettings();
        return { enabled, updateSettings };
      },
      { wrapper },
    );

    // Initially enabled (default)
    expect(result.current.enabled).toBe(true);

    // Disable via settings update
    act(() => {
      result.current.updateSettings({ featureToggles: { quality: false } });
    });
    expect(result.current.enabled).toBe(false);
  });
});

// ── useEnabledFeatures ───────────────────────────────────────

describe("useEnabledFeatures", () => {
  it("returns all features when no toggles are set (all default-enabled)", () => {
    const { result } = renderHook(() => useEnabledFeatures(), { wrapper });
    // All features in FEATURE_REGISTRY are defaultEnabled: true
    expect(result.current.length).toBe(FEATURE_REGISTRY.length);
  });

  it("excludes a disabled feature", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ featureToggles: { pricing: false } }),
    );
    const { result } = renderHook(() => useEnabledFeatures(), { wrapper });
    const ids = result.current.map((f) => f.id);
    expect(ids).not.toContain("pricing");
    expect(result.current.length).toBe(FEATURE_REGISTRY.length - 1);
  });

  it("excludes multiple disabled features", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        featureToggles: { pricing: false, quality: false, docgen: false },
      }),
    );
    const { result } = renderHook(() => useEnabledFeatures(), { wrapper });
    const ids = result.current.map((f) => f.id);
    expect(ids).not.toContain("pricing");
    expect(ids).not.toContain("quality");
    expect(ids).not.toContain("docgen");
    expect(result.current.length).toBe(FEATURE_REGISTRY.length - 3);
  });

  it("returns FeatureDefinition objects with correct shape", () => {
    const { result } = renderHook(() => useEnabledFeatures(), { wrapper });
    for (const f of result.current) {
      expect(f).toHaveProperty("id");
      expect(f).toHaveProperty("name");
      expect(f).toHaveProperty("routes");
      expect(f).toHaveProperty("section");
    }
  });
});
