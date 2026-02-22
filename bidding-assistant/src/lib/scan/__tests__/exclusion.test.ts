import { describe, it, expect, beforeEach } from "vitest";
import {
  addExclusion,
  removeExclusion,
  isExcluded,
  filterExcluded,
  clearExclusions,
  getExcludedJobNumbers,
  addCreatedCase,
  getCreatedJobNumbers,
  clearCreatedCases,
} from "../exclusion";
import type { ScanResult } from "../types";

// jsdom 提供 localStorage，每次測試前清空
beforeEach(() => {
  localStorage.clear();
});

// ── 測試資料 ──────────────────────────────────────────────────

const makeResult = (jobNumber: string): ScanResult => ({
  tender: {
    title: `標案 ${jobNumber}`,
    unit: "測試機關",
    jobNumber,
    budget: 100_000,
    deadline: "2026-03-31",
    publishDate: "2026-02-28",
    url: `https://pcc.example/tender/${jobNumber}`,
  },
  classification: {
    category: "must",
    matchedLabel: "食農教育",
    matchedKeywords: ["食農教育"],
  },
});

// ── addExclusion / isExcluded ─────────────────────────────────

describe("addExclusion / isExcluded", () => {
  it("加入後 isExcluded 為 true", () => {
    addExclusion("J001");
    expect(isExcluded("J001")).toBe(true);
  });

  it("未加入的案號 isExcluded 為 false", () => {
    expect(isExcluded("J999")).toBe(false);
  });

  it("可以加入多個案號", () => {
    addExclusion("J001");
    addExclusion("J002");
    expect(isExcluded("J001")).toBe(true);
    expect(isExcluded("J002")).toBe(true);
    expect(isExcluded("J003")).toBe(false);
  });

  it("重複加入同一案號不重複計算", () => {
    addExclusion("J001");
    addExclusion("J001");
    expect(isExcluded("J001")).toBe(true);
    expect(getExcludedJobNumbers()).toHaveLength(1);
  });
});

// ── removeExclusion ───────────────────────────────────────────

describe("removeExclusion", () => {
  it("移除後 isExcluded 為 false", () => {
    addExclusion("J001");
    removeExclusion("J001");
    expect(isExcluded("J001")).toBe(false);
  });

  it("移除不存在的案號不報錯", () => {
    expect(() => removeExclusion("J999")).not.toThrow();
  });

  it("移除其中一個不影響其他", () => {
    addExclusion("J001");
    addExclusion("J002");
    removeExclusion("J001");
    expect(isExcluded("J001")).toBe(false);
    expect(isExcluded("J002")).toBe(true);
  });
});

// ── filterExcluded ────────────────────────────────────────────

describe("filterExcluded", () => {
  it("空排除清單回傳全部結果", () => {
    const results = [makeResult("J001"), makeResult("J002")];
    expect(filterExcluded(results)).toHaveLength(2);
  });

  it("過濾掉排除的案號", () => {
    addExclusion("J001");
    const results = [makeResult("J001"), makeResult("J002"), makeResult("J003")];
    const filtered = filterExcluded(results);
    expect(filtered).toHaveLength(2);
    expect(filtered.map((r) => r.tender.jobNumber)).toEqual(["J002", "J003"]);
  });

  it("全部排除回傳空陣列", () => {
    addExclusion("J001");
    addExclusion("J002");
    const results = [makeResult("J001"), makeResult("J002")];
    expect(filterExcluded(results)).toHaveLength(0);
  });

  it("空輸入回傳空陣列", () => {
    expect(filterExcluded([])).toEqual([]);
  });
});

// ── clearExclusions ───────────────────────────────────────────

describe("clearExclusions", () => {
  it("清空後所有案號不再被排除", () => {
    addExclusion("J001");
    addExclusion("J002");
    clearExclusions();
    expect(isExcluded("J001")).toBe(false);
    expect(isExcluded("J002")).toBe(false);
  });

  it("清空空清單不報錯", () => {
    expect(() => clearExclusions()).not.toThrow();
  });
});

// ── getExcludedJobNumbers ─────────────────────────────────────

describe("getExcludedJobNumbers", () => {
  it("回傳所有排除案號", () => {
    addExclusion("J001");
    addExclusion("J002");
    const result = getExcludedJobNumbers();
    expect(result).toHaveLength(2);
    expect(result).toContain("J001");
    expect(result).toContain("J002");
  });

  it("空清單回傳空陣列", () => {
    expect(getExcludedJobNumbers()).toEqual([]);
  });
});

// ── localStorage 損毀容錯 ──────────────────────────────────────

describe("localStorage 損毀容錯", () => {
  it("存入非陣列 JSON 時 isExcluded 回傳 false", () => {
    localStorage.setItem("scan-excluded", JSON.stringify({ broken: true }));
    expect(isExcluded("J001")).toBe(false);
  });

  it("存入非 JSON 時 isExcluded 回傳 false", () => {
    localStorage.setItem("scan-excluded", "not-json");
    expect(isExcluded("J001")).toBe(false);
  });

  it("存入非 JSON 後仍可正常寫入", () => {
    localStorage.setItem("scan-excluded", "not-json");
    addExclusion("J001");
    expect(isExcluded("J001")).toBe(true);
  });
});

// ── 建案記憶（addCreatedCase / getCreatedJobNumbers） ──────────

describe("addCreatedCase / getCreatedJobNumbers", () => {
  it("加入後可讀取", () => {
    addCreatedCase("J001");
    expect(getCreatedJobNumbers()).toContain("J001");
  });

  it("空狀態回傳空陣列", () => {
    expect(getCreatedJobNumbers()).toEqual([]);
  });

  it("多個案號不重複", () => {
    addCreatedCase("J001");
    addCreatedCase("J001");
    addCreatedCase("J002");
    const result = getCreatedJobNumbers();
    expect(result).toHaveLength(2);
    expect(result).toContain("J001");
    expect(result).toContain("J002");
  });

  it("建案記憶與排除記憶互不影響", () => {
    addCreatedCase("J001");
    addExclusion("J002");
    expect(getCreatedJobNumbers()).toEqual(["J001"]);
    expect(getExcludedJobNumbers()).toEqual(["J002"]);
  });

  it("localStorage 損毀時 getCreatedJobNumbers 回傳空陣列", () => {
    localStorage.setItem("scan-created", "not-json");
    expect(getCreatedJobNumbers()).toEqual([]);
  });
});

// ── clearCreatedCases ─────────────────────────────────────────

describe("clearCreatedCases", () => {
  it("清空後 getCreatedJobNumbers 回傳空陣列", () => {
    addCreatedCase("J001");
    addCreatedCase("J002");
    clearCreatedCases();
    expect(getCreatedJobNumbers()).toEqual([]);
  });

  it("清空空清單不報錯", () => {
    expect(() => clearCreatedCases()).not.toThrow();
  });

  it("清空建案記憶不影響排除記憶", () => {
    addCreatedCase("J001");
    addExclusion("J002");
    clearCreatedCases();
    expect(getCreatedJobNumbers()).toEqual([]);
    expect(getExcludedJobNumbers()).toContain("J002");
  });
});
