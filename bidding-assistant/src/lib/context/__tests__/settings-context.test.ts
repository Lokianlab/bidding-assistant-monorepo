import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { SettingsProvider, useSettings } from "../settings-context";
import { DEFAULT_SETTINGS } from "@/lib/settings/defaults";

const STORAGE_KEY = "bidding-assistant-settings";

function wrapper({ children }: { children: ReactNode }) {
  return createElement(SettingsProvider, null, children);
}

beforeEach(() => {
  localStorage.clear();
});

// ── Initialization ──────────────────────────────────────────

describe("SettingsProvider — initialization", () => {
  it("returns DEFAULT_SETTINGS when localStorage is empty", () => {
    const { result } = renderHook(() => useSettings(), { wrapper });
    expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
  });

  it("merges stored settings with defaults", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ yearlyGoal: 5000000 }));
    const { result } = renderHook(() => useSettings(), { wrapper });
    expect(result.current.settings.yearlyGoal).toBe(5000000);
    // Other fields should still have defaults
    expect(result.current.settings.company).toEqual(DEFAULT_SETTINGS.company);
  });

  it("falls back to defaults on corrupted localStorage", () => {
    localStorage.setItem(STORAGE_KEY, "not-valid-json{{{");
    const { result } = renderHook(() => useSettings(), { wrapper });
    expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
  });

  it("hydrated is true in jsdom environment", () => {
    const { result } = renderHook(() => useSettings(), { wrapper });
    expect(result.current.hydrated).toBe(true);
  });
});

// ── useSettings outside provider ────────────────────────────

describe("useSettings — outside provider", () => {
  it("throws when used without SettingsProvider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => {
      renderHook(() => useSettings());
    }).toThrow("useSettings must be used within SettingsProvider");
    spy.mockRestore();
  });
});

// ── updateSettings ──────────────────────────────────────────

describe("SettingsProvider — updateSettings", () => {
  it("merges partial update into settings", () => {
    const { result } = renderHook(() => useSettings(), { wrapper });

    act(() => {
      result.current.updateSettings({ yearlyGoal: 8000000 });
    });

    expect(result.current.settings.yearlyGoal).toBe(8000000);
    // Other fields preserved
    expect(result.current.settings.company).toEqual(DEFAULT_SETTINGS.company);
  });

  it("persists to localStorage", () => {
    const { result } = renderHook(() => useSettings(), { wrapper });

    act(() => {
      result.current.updateSettings({ yearlyGoal: 3000000 });
    });

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.yearlyGoal).toBe(3000000);
  });
});

// ── updateSection ───────────────────────────────────────────

describe("SettingsProvider — updateSection", () => {
  it("replaces an entire section", () => {
    const { result } = renderHook(() => useSettings(), { wrapper });
    const newCompany = {
      ...DEFAULT_SETTINGS.company,
      name: "新公司名稱",
    };

    act(() => {
      result.current.updateSection("company", newCompany);
    });

    expect(result.current.settings.company.name).toBe("新公司名稱");
  });

  it("persists section change to localStorage", () => {
    const { result } = renderHook(() => useSettings(), { wrapper });

    act(() => {
      result.current.updateSection("yearlyGoal", 9999999);
    });

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.yearlyGoal).toBe(9999999);
  });
});

// ── deep merge behaviour ─────────────────────────────────────

describe("SettingsProvider — deep merge on load", () => {
  it("填入部分 smugmug 設定，缺少的欄位使用預設值（bug regression: apiKey undefined）", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        connections: {
          smugmug: { apiKey: "my-key" },
        },
      })
    );
    const { result } = renderHook(() => useSettings(), { wrapper });
    expect(result.current.settings.connections.smugmug.apiKey).toBe("my-key");
    expect(result.current.settings.connections.smugmug.apiSecret).toBe("");
    expect(result.current.settings.connections.smugmug.accessToken).toBe("");
    expect(result.current.settings.connections.smugmug.tokenSecret).toBe("");
  });

  it("只存了 notion，googleDrive 和 smugmug 整段缺漏時使用預設值", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        connections: {
          notion: { token: "my-token", databaseId: "my-db" },
        },
      })
    );
    const { result } = renderHook(() => useSettings(), { wrapper });
    expect(result.current.settings.connections.notion.token).toBe("my-token");
    expect(result.current.settings.connections.googleDrive).toEqual(
      DEFAULT_SETTINGS.connections.googleDrive
    );
    expect(result.current.settings.connections.smugmug).toEqual(
      DEFAULT_SETTINGS.connections.smugmug
    );
  });

  it("淺層欄位覆蓋不影響其他同層欄位", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ yearlyGoal: 5000000 })
    );
    const { result } = renderHook(() => useSettings(), { wrapper });
    expect(result.current.settings.yearlyGoal).toBe(5000000);
    expect(result.current.settings.connections).toEqual(DEFAULT_SETTINGS.connections);
    expect(result.current.settings.company).toEqual(DEFAULT_SETTINGS.company);
  });
});

// ── resetSettings ───────────────────────────────────────────

describe("SettingsProvider — resetSettings", () => {
  it("restores all settings to defaults", () => {
    const { result } = renderHook(() => useSettings(), { wrapper });

    act(() => {
      result.current.updateSettings({ yearlyGoal: 1234567 });
    });
    expect(result.current.settings.yearlyGoal).toBe(1234567);

    act(() => {
      result.current.resetSettings();
    });

    expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
  });

  it("persists defaults to localStorage after reset", () => {
    const { result } = renderHook(() => useSettings(), { wrapper });

    act(() => {
      result.current.updateSettings({ yearlyGoal: 1111111 });
    });

    act(() => {
      result.current.resetSettings();
    });

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.yearlyGoal).toBe(DEFAULT_SETTINGS.yearlyGoal);
  });
});
