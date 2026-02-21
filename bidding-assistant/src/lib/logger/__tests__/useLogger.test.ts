import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLogger } from "../useLogger";
import { logger } from "../index";

beforeEach(() => {
  logger.clear();
});

// ── Initialization ──────────────────────────────────────────

describe("useLogger — initialization", () => {
  it("returns empty entries when no logs", () => {
    const { result } = renderHook(() => useLogger());
    expect(result.current.entries).toEqual([]);
  });

  it("exposes log, clear, exportJson", () => {
    const { result } = renderHook(() => useLogger());
    expect(typeof result.current.log).toBe("function");
    expect(typeof result.current.clear).toBe("function");
    expect(typeof result.current.exportJson).toBe("function");
  });
});

// ── Logging ─────────────────────────────────────────────────

describe("useLogger — log", () => {
  it("adds an entry and re-renders", () => {
    const { result } = renderHook(() => useLogger());

    act(() => {
      result.current.log("info", "api", "Test message");
    });

    expect(result.current.entries).toHaveLength(1);
    expect(result.current.entries[0].message).toBe("Test message");
    expect(result.current.entries[0].level).toBe("info");
    expect(result.current.entries[0].category).toBe("api");
  });

  it("includes optional details and source", () => {
    const { result } = renderHook(() => useLogger());

    act(() => {
      result.current.log("error", "system", "Crash", "stack trace", "app.tsx");
    });

    expect(result.current.entries[0].details).toBe("stack trace");
    expect(result.current.entries[0].source).toBe("app.tsx");
  });

  it("accumulates multiple entries (newest first)", () => {
    const { result } = renderHook(() => useLogger());

    act(() => {
      result.current.log("info", "api", "first");
      result.current.log("warn", "cache", "second");
    });

    expect(result.current.entries).toHaveLength(2);
    expect(result.current.entries[0].message).toBe("second");
    expect(result.current.entries[1].message).toBe("first");
  });
});

// ── Clear ───────────────────────────────────────────────────

describe("useLogger — clear", () => {
  it("removes all entries", () => {
    const { result } = renderHook(() => useLogger());

    act(() => {
      result.current.log("info", "api", "msg");
    });
    expect(result.current.entries).toHaveLength(1);

    act(() => {
      result.current.clear();
    });
    expect(result.current.entries).toHaveLength(0);
  });
});

// ── Export ───────────────────────────────────────────────────

describe("useLogger — exportJson", () => {
  it("returns valid JSON of entries", () => {
    const { result } = renderHook(() => useLogger());

    act(() => {
      result.current.log("info", "api", "export test");
    });

    let json = "";
    act(() => {
      json = result.current.exportJson();
    });

    const parsed = JSON.parse(json);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].message).toBe("export test");
  });

  it("returns '[]' when empty", () => {
    const { result } = renderHook(() => useLogger());

    let json = "";
    act(() => {
      json = result.current.exportJson();
    });
    expect(json).toBe("[]");
  });
});

// ── Filtering ───────────────────────────────────────────────

describe("useLogger — filtering", () => {
  it("filters by level", () => {
    const { result: unfiltered } = renderHook(() => useLogger());

    act(() => {
      unfiltered.current.log("info", "api", "info msg");
      unfiltered.current.log("error", "api", "error msg");
    });

    const { result: filtered } = renderHook(() =>
      useLogger({ level: "error" })
    );

    expect(filtered.current.entries).toHaveLength(1);
    expect(filtered.current.entries[0].level).toBe("error");
  });

  it("filters by category", () => {
    const { result: unfiltered } = renderHook(() => useLogger());

    act(() => {
      unfiltered.current.log("info", "api", "api msg");
      unfiltered.current.log("info", "cache", "cache msg");
    });

    const { result: filtered } = renderHook(() =>
      useLogger({ category: "cache" })
    );

    expect(filtered.current.entries).toHaveLength(1);
    expect(filtered.current.entries[0].category).toBe("cache");
  });
});
