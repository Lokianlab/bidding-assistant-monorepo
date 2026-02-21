import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCustomOptions, DEFAULT_OPTIONS, type OptionFieldKey } from "../useCustomOptions";

const STORAGE_KEY = "bidding-assistant-custom-options";

beforeEach(() => {
  localStorage.clear();
});

// ── Initialization ──────────────────────────────────────────

describe("useCustomOptions — initialization", () => {
  it("hydrated is true in jsdom", () => {
    const { result } = renderHook(() => useCustomOptions());
    expect(result.current.hydrated).toBe(true);
  });

  it("exposes getOptions, addOption, removeOption, resetOptions", () => {
    const { result } = renderHook(() => useCustomOptions());
    expect(typeof result.current.getOptions).toBe("function");
    expect(typeof result.current.addOption).toBe("function");
    expect(typeof result.current.removeOption).toBe("function");
    expect(typeof result.current.resetOptions).toBe("function");
  });
});

// ── getOptions ──────────────────────────────────────────────

describe("useCustomOptions — getOptions", () => {
  it("returns default options when nothing stored", () => {
    const { result } = renderHook(() => useCustomOptions());
    const roles = result.current.getOptions("00A_roles");
    expect(roles).toEqual(DEFAULT_OPTIONS["00A_roles"]);
  });

  it("returns defaults for all defined keys", () => {
    const { result } = renderHook(() => useCustomOptions());
    const keys: OptionFieldKey[] = [
      "00A_roles", "00B_entity", "00B_role", "00B_status",
      "00C_type", "00D_risk", "00E_result",
    ];
    for (const key of keys) {
      expect(result.current.getOptions(key)).toEqual(DEFAULT_OPTIONS[key]);
    }
  });

  it("returns user-stored options over defaults", () => {
    const custom = { "00A_roles": ["Custom Role"] };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(custom));

    const { result } = renderHook(() => useCustomOptions());
    expect(result.current.getOptions("00A_roles")).toEqual(["Custom Role"]);
  });
});

// ── addOption ───────────────────────────────────────────────

describe("useCustomOptions — addOption", () => {
  it("adds a new option to a field", () => {
    const { result } = renderHook(() => useCustomOptions());

    act(() => {
      result.current.addOption("00A_roles", "New Role");
    });

    const options = result.current.getOptions("00A_roles");
    expect(options).toContain("New Role");
    // Should also keep existing defaults
    expect(options.length).toBe(DEFAULT_OPTIONS["00A_roles"].length + 1);
  });

  it("does not add duplicate option", () => {
    const { result } = renderHook(() => useCustomOptions());

    act(() => {
      result.current.addOption("00A_roles", "計畫主持人");
    });

    // "計畫主持人" is already in defaults, so count should stay the same
    const options = result.current.getOptions("00A_roles");
    expect(options.filter((o) => o === "計畫主持人")).toHaveLength(1);
  });

  it("trims whitespace before adding", () => {
    const { result } = renderHook(() => useCustomOptions());

    act(() => {
      result.current.addOption("00E_result", "  新結果  ");
    });

    const options = result.current.getOptions("00E_result");
    expect(options).toContain("新結果");
    expect(options).not.toContain("  新結果  ");
  });

  it("ignores empty or whitespace-only values", () => {
    const { result } = renderHook(() => useCustomOptions());
    const before = result.current.getOptions("00A_roles");

    act(() => {
      result.current.addOption("00A_roles", "");
    });
    act(() => {
      result.current.addOption("00A_roles", "   ");
    });

    expect(result.current.getOptions("00A_roles")).toEqual(before);
  });
});

// ── removeOption ────────────────────────────────────────────

describe("useCustomOptions — removeOption", () => {
  it("removes an option from a field", () => {
    const { result } = renderHook(() => useCustomOptions());

    act(() => {
      result.current.removeOption("00A_roles", "計畫主持人");
    });

    const options = result.current.getOptions("00A_roles");
    expect(options).not.toContain("計畫主持人");
    expect(options.length).toBe(DEFAULT_OPTIONS["00A_roles"].length - 1);
  });

  it("no-op when removing nonexistent option", () => {
    const { result } = renderHook(() => useCustomOptions());

    act(() => {
      result.current.removeOption("00A_roles", "不存在的選項");
    });

    // Should still have all defaults (now stored as custom copy without the nonexistent)
    const options = result.current.getOptions("00A_roles");
    expect(options.length).toBe(DEFAULT_OPTIONS["00A_roles"].length);
  });
});

// ── resetOptions ────────────────────────────────────────────

describe("useCustomOptions — resetOptions", () => {
  it("resets a modified field back to defaults", () => {
    const { result } = renderHook(() => useCustomOptions());

    act(() => {
      result.current.addOption("00A_roles", "Extra Role");
    });
    expect(result.current.getOptions("00A_roles")).toContain("Extra Role");

    act(() => {
      result.current.resetOptions("00A_roles");
    });
    expect(result.current.getOptions("00A_roles")).toEqual(DEFAULT_OPTIONS["00A_roles"]);
  });

  it("does not affect other fields when resetting one", () => {
    const { result } = renderHook(() => useCustomOptions());

    act(() => {
      result.current.addOption("00A_roles", "Extra Role");
      result.current.addOption("00E_result", "Extra Result");
    });

    act(() => {
      result.current.resetOptions("00A_roles");
    });

    // 00A back to defaults
    expect(result.current.getOptions("00A_roles")).toEqual(DEFAULT_OPTIONS["00A_roles"]);
    // 00E still has custom
    expect(result.current.getOptions("00E_result")).toContain("Extra Result");
  });
});

// ── localStorage persistence ────────────────────────────────

describe("useCustomOptions — persistence", () => {
  it("saves custom options to localStorage", () => {
    const { result } = renderHook(() => useCustomOptions());

    act(() => {
      result.current.addOption("00E_result", "Custom Result");
    });

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    expect(stored["00E_result"]).toContain("Custom Result");
  });

  it("loads stored options on init", () => {
    const custom = { "00B_entity": ["Stored Corp"] };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(custom));

    const { result } = renderHook(() => useCustomOptions());
    expect(result.current.getOptions("00B_entity")).toEqual(["Stored Corp"]);
  });

  it("handles corrupt localStorage gracefully", () => {
    localStorage.setItem(STORAGE_KEY, "{invalid json");
    const { result } = renderHook(() => useCustomOptions());
    // Falls back to defaults
    expect(result.current.getOptions("00A_roles")).toEqual(DEFAULT_OPTIONS["00A_roles"]);
  });
});
