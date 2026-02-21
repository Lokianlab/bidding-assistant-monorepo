import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useKnowledgeBase } from "../useKnowledgeBase";
import { KB_STORAGE_KEY, KB_DATA_VERSION, EMPTY_KB_DATA } from "../constants";
import type {
  KBEntry00A,
  KBEntry00B,
  KBEntry00C,
  KBEntry00D,
  KBEntry00E,
  KnowledgeBaseData,
} from "../types";

// ── Test data factories ─────────────────────────────────────

function makeEntry00A(overrides: Partial<KBEntry00A> = {}): KBEntry00A {
  return {
    id: "M-001",
    name: "Test Member",
    title: "Engineer",
    status: "在職",
    authorizedRoles: ["計畫主持人"],
    education: [],
    certifications: [],
    experiences: [],
    projects: [],
    additionalCapabilities: "",
    entryStatus: "active",
    updatedAt: "2024-01-01",
    ...overrides,
  };
}

function makeEntry00E(overrides: Partial<KBEntry00E> = {}): KBEntry00E {
  return {
    id: "E-001",
    projectName: "Test Review",
    result: "得標",
    year: "2024",
    bidPhaseReview: "",
    executionReview: "",
    kbUpdateSuggestions: "",
    aiToolFeedback: "",
    oneSentenceSummary: "",
    entryStatus: "active",
    updatedAt: "2024-01-01",
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
});

// ── Initialization ──────────────────────────────────────────

describe("useKnowledgeBase — initialization", () => {
  it("returns empty data when no localStorage", () => {
    const { result } = renderHook(() => useKnowledgeBase());
    expect(result.current.data["00A"]).toEqual([]);
    expect(result.current.data["00B"]).toEqual([]);
    expect(result.current.data["00C"]).toEqual([]);
    expect(result.current.data["00D"]).toEqual([]);
    expect(result.current.data["00E"]).toEqual([]);
    expect(result.current.data.version).toBe(KB_DATA_VERSION);
  });

  it("loads existing data from localStorage", () => {
    const stored: KnowledgeBaseData = {
      ...EMPTY_KB_DATA,
      "00A": [makeEntry00A()],
      lastUpdated: "2024-06-01",
    };
    localStorage.setItem(KB_STORAGE_KEY, JSON.stringify(stored));

    const { result } = renderHook(() => useKnowledgeBase());
    expect(result.current.data["00A"]).toHaveLength(1);
    expect(result.current.data["00A"][0].name).toBe("Test Member");
  });

  it("handles corrupt localStorage gracefully", () => {
    localStorage.setItem(KB_STORAGE_KEY, "not valid json{{{");
    const { result } = renderHook(() => useKnowledgeBase());
    expect(result.current.data["00A"]).toEqual([]);
  });

  it("fills missing keys from partial stored data", () => {
    const partial = { "00A": [makeEntry00A()], version: 1, lastUpdated: "2024-01-01" };
    localStorage.setItem(KB_STORAGE_KEY, JSON.stringify(partial));

    const { result } = renderHook(() => useKnowledgeBase());
    expect(result.current.data["00A"]).toHaveLength(1);
    expect(result.current.data["00B"]).toEqual([]);
    expect(result.current.data["00C"]).toEqual([]);
  });

  it("hydrated is true in jsdom", () => {
    const { result } = renderHook(() => useKnowledgeBase());
    expect(result.current.hydrated).toBe(true);
  });

  it("exposes all CRUD functions", () => {
    const { result } = renderHook(() => useKnowledgeBase());
    expect(typeof result.current.addEntry00A).toBe("function");
    expect(typeof result.current.updateEntry00A).toBe("function");
    expect(typeof result.current.addEntry00B).toBe("function");
    expect(typeof result.current.updateEntry00B).toBe("function");
    expect(typeof result.current.addEntry00C).toBe("function");
    expect(typeof result.current.updateEntry00C).toBe("function");
    expect(typeof result.current.addEntry00D).toBe("function");
    expect(typeof result.current.updateEntry00D).toBe("function");
    expect(typeof result.current.addEntry00E).toBe("function");
    expect(typeof result.current.updateEntry00E).toBe("function");
    expect(typeof result.current.deleteEntry).toBe("function");
    expect(typeof result.current.updateEntryStatus).toBe("function");
    expect(typeof result.current.importData).toBe("function");
    expect(typeof result.current.exportData).toBe("function");
    expect(typeof result.current.clearAll).toBe("function");
  });
});

// ── Add entries ─────────────────────────────────────────────

describe("useKnowledgeBase — add", () => {
  it("adds a 00A entry", () => {
    const { result } = renderHook(() => useKnowledgeBase());
    const entry = makeEntry00A({ id: "M-001", name: "Alice" });

    act(() => {
      result.current.addEntry00A(entry);
    });

    expect(result.current.data["00A"]).toHaveLength(1);
    expect(result.current.data["00A"][0].name).toBe("Alice");
  });

  it("adds a 00E entry", () => {
    const { result } = renderHook(() => useKnowledgeBase());
    const entry = makeEntry00E({ id: "E-001", projectName: "My Review" });

    act(() => {
      result.current.addEntry00E(entry);
    });

    expect(result.current.data["00E"]).toHaveLength(1);
    expect(result.current.data["00E"][0].projectName).toBe("My Review");
  });

  it("appends to existing entries", () => {
    const { result } = renderHook(() => useKnowledgeBase());

    act(() => {
      result.current.addEntry00A(makeEntry00A({ id: "M-001", name: "First" }));
    });
    act(() => {
      result.current.addEntry00A(makeEntry00A({ id: "M-002", name: "Second" }));
    });

    expect(result.current.data["00A"]).toHaveLength(2);
    expect(result.current.data["00A"][0].name).toBe("First");
    expect(result.current.data["00A"][1].name).toBe("Second");
  });
});

// ── Update entries ──────────────────────────────────────────

describe("useKnowledgeBase — update", () => {
  it("updates a 00A entry by id", () => {
    const { result } = renderHook(() => useKnowledgeBase());

    act(() => {
      result.current.addEntry00A(makeEntry00A({ id: "M-001", name: "Original" }));
    });
    act(() => {
      result.current.updateEntry00A("M-001", { name: "Updated" });
    });

    expect(result.current.data["00A"][0].name).toBe("Updated");
    // updatedAt should be refreshed
    expect(result.current.data["00A"][0].updatedAt).not.toBe("2024-01-01");
  });

  it("preserves other fields when updating", () => {
    const { result } = renderHook(() => useKnowledgeBase());
    const original = makeEntry00A({ id: "M-001", name: "Alice", title: "PM" });

    act(() => {
      result.current.addEntry00A(original);
    });
    act(() => {
      result.current.updateEntry00A("M-001", { name: "Bob" });
    });

    expect(result.current.data["00A"][0].name).toBe("Bob");
    expect(result.current.data["00A"][0].title).toBe("PM");
  });

  it("does not affect other entries when updating one", () => {
    const { result } = renderHook(() => useKnowledgeBase());

    act(() => {
      result.current.addEntry00A(makeEntry00A({ id: "M-001", name: "Alice" }));
      result.current.addEntry00A(makeEntry00A({ id: "M-002", name: "Bob" }));
    });
    act(() => {
      result.current.updateEntry00A("M-001", { name: "Updated" });
    });

    expect(result.current.data["00A"][0].name).toBe("Updated");
    expect(result.current.data["00A"][1].name).toBe("Bob");
  });

  it("no-op when updating nonexistent id", () => {
    const { result } = renderHook(() => useKnowledgeBase());

    act(() => {
      result.current.addEntry00A(makeEntry00A({ id: "M-001" }));
    });
    act(() => {
      result.current.updateEntry00A("nonexistent", { name: "X" });
    });

    expect(result.current.data["00A"]).toHaveLength(1);
    expect(result.current.data["00A"][0].id).toBe("M-001");
  });
});

// ── Delete entries ──────────────────────────────────────────

describe("useKnowledgeBase — delete", () => {
  it("deletes an entry by kbId + entryId", () => {
    const { result } = renderHook(() => useKnowledgeBase());

    act(() => {
      result.current.addEntry00A(makeEntry00A({ id: "M-001" }));
      result.current.addEntry00A(makeEntry00A({ id: "M-002" }));
    });
    act(() => {
      result.current.deleteEntry("00A", "M-001");
    });

    expect(result.current.data["00A"]).toHaveLength(1);
    expect(result.current.data["00A"][0].id).toBe("M-002");
  });

  it("no-op when deleting nonexistent entry", () => {
    const { result } = renderHook(() => useKnowledgeBase());

    act(() => {
      result.current.addEntry00A(makeEntry00A({ id: "M-001" }));
    });
    act(() => {
      result.current.deleteEntry("00A", "nonexistent");
    });

    expect(result.current.data["00A"]).toHaveLength(1);
  });

  it("does not affect other KB types", () => {
    const { result } = renderHook(() => useKnowledgeBase());

    act(() => {
      result.current.addEntry00A(makeEntry00A({ id: "M-001" }));
      result.current.addEntry00E(makeEntry00E({ id: "E-001" }));
    });
    act(() => {
      result.current.deleteEntry("00A", "M-001");
    });

    expect(result.current.data["00A"]).toHaveLength(0);
    expect(result.current.data["00E"]).toHaveLength(1);
  });
});

// ── Update entry status ─────────────────────────────────────

describe("useKnowledgeBase — updateEntryStatus", () => {
  it("changes entry status to archived", () => {
    const { result } = renderHook(() => useKnowledgeBase());

    act(() => {
      result.current.addEntry00A(makeEntry00A({ id: "M-001", entryStatus: "active" }));
    });
    act(() => {
      result.current.updateEntryStatus("00A", "M-001", "archived");
    });

    expect(result.current.data["00A"][0].entryStatus).toBe("archived");
    expect(result.current.data["00A"][0].updatedAt).not.toBe("2024-01-01");
  });

  it("changes entry status to draft", () => {
    const { result } = renderHook(() => useKnowledgeBase());

    act(() => {
      result.current.addEntry00E(makeEntry00E({ id: "E-001", entryStatus: "active" }));
    });
    act(() => {
      result.current.updateEntryStatus("00E", "E-001", "draft");
    });

    expect(result.current.data["00E"][0].entryStatus).toBe("draft");
  });
});

// ── Import / Export ─────────────────────────────────────────

describe("useKnowledgeBase — import/export", () => {
  it("imports partial data (merges with existing)", () => {
    const { result } = renderHook(() => useKnowledgeBase());

    act(() => {
      result.current.addEntry00A(makeEntry00A({ id: "M-001" }));
    });

    const imported = {
      "00E": [makeEntry00E({ id: "E-001", projectName: "Imported" })],
    };
    act(() => {
      result.current.importData(imported);
    });

    // 00A should be preserved (import only had 00E)
    expect(result.current.data["00A"]).toHaveLength(1);
    expect(result.current.data["00E"]).toHaveLength(1);
    expect(result.current.data["00E"][0].projectName).toBe("Imported");
  });

  it("overwrites existing KB when imported data includes that KB", () => {
    const { result } = renderHook(() => useKnowledgeBase());

    act(() => {
      result.current.addEntry00A(makeEntry00A({ id: "M-001", name: "Old" }));
    });

    const imported = {
      "00A": [makeEntry00A({ id: "M-999", name: "New" })],
    };
    act(() => {
      result.current.importData(imported);
    });

    expect(result.current.data["00A"]).toHaveLength(1);
    expect(result.current.data["00A"][0].name).toBe("New");
  });

  it("exports current data as a new object", () => {
    const { result } = renderHook(() => useKnowledgeBase());

    act(() => {
      result.current.addEntry00A(makeEntry00A({ id: "M-001", name: "Alice" }));
    });

    let exported: KnowledgeBaseData | undefined;
    act(() => {
      exported = result.current.exportData();
    });

    expect(exported).toBeDefined();
    expect(exported!["00A"]).toHaveLength(1);
    expect(exported!["00A"][0].name).toBe("Alice");
    expect(exported!.version).toBe(KB_DATA_VERSION);
  });
});

// ── Clear all ───────────────────────────────────────────────

describe("useKnowledgeBase — clearAll", () => {
  it("clears all entries", () => {
    const { result } = renderHook(() => useKnowledgeBase());

    act(() => {
      result.current.addEntry00A(makeEntry00A({ id: "M-001" }));
      result.current.addEntry00E(makeEntry00E({ id: "E-001" }));
    });

    expect(result.current.data["00A"]).toHaveLength(1);
    expect(result.current.data["00E"]).toHaveLength(1);

    act(() => {
      result.current.clearAll();
    });

    expect(result.current.data["00A"]).toEqual([]);
    expect(result.current.data["00B"]).toEqual([]);
    expect(result.current.data["00C"]).toEqual([]);
    expect(result.current.data["00D"]).toEqual([]);
    expect(result.current.data["00E"]).toEqual([]);
  });
});

// ── localStorage persistence ────────────────────────────────

describe("useKnowledgeBase — persistence", () => {
  it("saves to localStorage on state change", () => {
    const { result } = renderHook(() => useKnowledgeBase());

    act(() => {
      result.current.addEntry00A(makeEntry00A({ id: "M-001", name: "Persisted" }));
    });

    const stored = JSON.parse(localStorage.getItem(KB_STORAGE_KEY) || "{}");
    expect(stored["00A"]).toHaveLength(1);
    expect(stored["00A"][0].name).toBe("Persisted");
  });
});
