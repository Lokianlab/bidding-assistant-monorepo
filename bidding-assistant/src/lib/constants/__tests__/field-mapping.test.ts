import { describe, it, expect } from "vitest";
import {
  FIELD_KEYS,
  DEFAULT_FIELD_MAP,
  FIELD_LABELS,
  resolveFieldMap,
} from "../field-mapping";
import type { FieldMappingKey } from "../field-mapping";

// ---------------------------------------------------------------------------
// FIELD_KEYS
// ---------------------------------------------------------------------------

describe("FIELD_KEYS", () => {
  it("has 23 keys", () => {
    expect(FIELD_KEYS).toHaveLength(23);
  });

  it("contains all expected keys", () => {
    const expected = [
      "名稱", "進程", "決策", "截標", "預算", "進度",
      "企劃主筆", "投遞序位", "評審方式", "招標機關",
      "案號", "標案類型", "決標公告", "評選日期", "歸檔號",
      "押標金", "領標費", "檔案型態", "電子投標", "確定協作",
      "唯一碼", "備標期限",
    ];
    for (const key of expected) {
      expect(FIELD_KEYS).toContain(key);
    }
  });

  it("all keys are non-empty strings", () => {
    for (const key of FIELD_KEYS) {
      expect(typeof key).toBe("string");
      expect(key.length).toBeGreaterThan(0);
    }
  });

  it("has no duplicate keys", () => {
    const unique = new Set(FIELD_KEYS);
    expect(unique.size).toBe(FIELD_KEYS.length);
  });
});

// ---------------------------------------------------------------------------
// DEFAULT_FIELD_MAP
// ---------------------------------------------------------------------------

describe("DEFAULT_FIELD_MAP", () => {
  it("has an entry for every FIELD_KEY", () => {
    for (const key of FIELD_KEYS) {
      expect(DEFAULT_FIELD_MAP).toHaveProperty(key);
    }
  });

  it("has exactly the same number of entries as FIELD_KEYS", () => {
    expect(Object.keys(DEFAULT_FIELD_MAP)).toHaveLength(FIELD_KEYS.length);
  });

  it("all values are non-empty strings (valid Notion property names)", () => {
    for (const value of Object.values(DEFAULT_FIELD_MAP)) {
      expect(typeof value).toBe("string");
      expect(value.length).toBeGreaterThan(0);
    }
  });

  it("maps known keys to expected Notion property names", () => {
    expect(DEFAULT_FIELD_MAP["名稱"]).toBe("標案名稱");
    expect(DEFAULT_FIELD_MAP["進程"]).toBe("標案進程");
    expect(DEFAULT_FIELD_MAP["決策"]).toBe("備標決策");
    expect(DEFAULT_FIELD_MAP["截標"]).toBe("截標時間");
    expect(DEFAULT_FIELD_MAP["預算"]).toBe("預算金額");
    expect(DEFAULT_FIELD_MAP["唯一碼"]).toBe("案件唯一碼");
  });
});

// ---------------------------------------------------------------------------
// FIELD_LABELS
// ---------------------------------------------------------------------------

describe("FIELD_LABELS", () => {
  it("has a label for every FIELD_KEY", () => {
    for (const key of FIELD_KEYS) {
      expect(FIELD_LABELS).toHaveProperty(key);
    }
  });

  it("has exactly the same number of entries as FIELD_KEYS", () => {
    expect(Object.keys(FIELD_LABELS)).toHaveLength(FIELD_KEYS.length);
  });

  it("all labels are non-empty strings", () => {
    for (const label of Object.values(FIELD_LABELS)) {
      expect(typeof label).toBe("string");
      expect(label.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// FIELD_LABELS vs DEFAULT_FIELD_MAP consistency
// ---------------------------------------------------------------------------

describe("FIELD_LABELS and DEFAULT_FIELD_MAP key consistency", () => {
  it("have identical key sets", () => {
    const mapKeys = Object.keys(DEFAULT_FIELD_MAP).sort();
    const labelKeys = Object.keys(FIELD_LABELS).sort();
    expect(mapKeys).toEqual(labelKeys);
  });
});

// ---------------------------------------------------------------------------
// resolveFieldMap()
// ---------------------------------------------------------------------------

describe("resolveFieldMap()", () => {
  it("returns DEFAULT_FIELD_MAP when no overrides are provided", () => {
    expect(resolveFieldMap()).toEqual(DEFAULT_FIELD_MAP);
  });

  it("returns DEFAULT_FIELD_MAP when overrides are undefined", () => {
    expect(resolveFieldMap(undefined)).toEqual(DEFAULT_FIELD_MAP);
  });

  it("returns DEFAULT_FIELD_MAP when overrides are an empty object", () => {
    expect(resolveFieldMap({})).toEqual(DEFAULT_FIELD_MAP);
  });

  it("merges user overrides into the default map", () => {
    const overrides: Partial<Record<FieldMappingKey, string>> = {
      "名稱": "My Custom Name",
    };
    const result = resolveFieldMap(overrides);
    expect(result["名稱"]).toBe("My Custom Name");
    // other keys remain default
    expect(result["進程"]).toBe(DEFAULT_FIELD_MAP["進程"]);
  });

  it("overrides multiple keys correctly", () => {
    const overrides: Partial<Record<FieldMappingKey, string>> = {
      "名稱": "Custom Name",
      "預算": "Custom Budget",
    };
    const result = resolveFieldMap(overrides);
    expect(result["名稱"]).toBe("Custom Name");
    expect(result["預算"]).toBe("Custom Budget");
    expect(result["進程"]).toBe(DEFAULT_FIELD_MAP["進程"]);
  });

  it("does not modify the original DEFAULT_FIELD_MAP", () => {
    const originalName = DEFAULT_FIELD_MAP["名稱"];
    resolveFieldMap({ "名稱": "Override" });
    expect(DEFAULT_FIELD_MAP["名稱"]).toBe(originalName);
  });
});
