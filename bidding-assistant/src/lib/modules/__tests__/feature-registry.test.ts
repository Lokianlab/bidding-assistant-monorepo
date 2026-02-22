import { describe, it, expect } from "vitest";
import {
  FEATURE_REGISTRY,
  SECTION_LABELS,
  isFeatureEnabled,
  getDefaultToggles,
  getFeatureByRoute,
  getEnabledFeatures,
  getDependents,
} from "../feature-registry";

// ---------------------------------------------------------------------------
// SECTION_LABELS
// ---------------------------------------------------------------------------

describe("SECTION_LABELS", () => {
  it("has labels for all section types", () => {
    expect(SECTION_LABELS.core).toBe("核心功能");
    expect(SECTION_LABELS.tools).toBe("工具箱");
    expect(SECTION_LABELS.output).toBe("輸出");
  });
});

// ---------------------------------------------------------------------------
// FEATURE_REGISTRY structure
// ---------------------------------------------------------------------------

describe("FEATURE_REGISTRY", () => {
  it("is a non-empty array", () => {
    expect(Array.isArray(FEATURE_REGISTRY)).toBe(true);
    expect(FEATURE_REGISTRY.length).toBeGreaterThan(0);
  });

  it("has 16 registered features", () => {
    expect(FEATURE_REGISTRY).toHaveLength(16);
  });

  it("every feature has all required fields", () => {
    for (const feature of FEATURE_REGISTRY) {
      expect(typeof feature.id).toBe("string");
      expect(feature.id.length).toBeGreaterThan(0);

      expect(typeof feature.name).toBe("string");
      expect(feature.name.length).toBeGreaterThan(0);

      expect(typeof feature.description).toBe("string");
      expect(feature.description.length).toBeGreaterThan(0);

      expect(typeof feature.icon).toBe("string");
      expect(feature.icon.length).toBeGreaterThan(0);

      expect(Array.isArray(feature.routes)).toBe(true);

      expect(["core", "tools", "output"]).toContain(feature.section);

      expect(typeof feature.defaultEnabled).toBe("boolean");
    }
  });

  it("has no duplicate feature IDs", () => {
    const ids = FEATURE_REGISTRY.map((f) => f.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("all route paths start with /", () => {
    for (const feature of FEATURE_REGISTRY) {
      for (const route of feature.routes) {
        expect(route.startsWith("/")).toBe(true);
      }
    }
  });

  it("dependencies reference existing feature IDs", () => {
    const allIds = new Set(FEATURE_REGISTRY.map((f) => f.id));
    for (const feature of FEATURE_REGISTRY) {
      if (feature.dependencies) {
        for (const depId of feature.dependencies) {
          expect(allIds.has(depId)).toBe(true);
        }
      }
    }
  });

  it("contains expected feature IDs", () => {
    const ids = FEATURE_REGISTRY.map((f) => f.id);
    expect(ids).toContain("dashboard");
    expect(ids).toContain("assembly");
    expect(ids).toContain("performance");
    expect(ids).toContain("knowledge-base");
    expect(ids).toContain("pricing");
    expect(ids).toContain("quality");
    expect(ids).toContain("docgen");
    expect(ids).toContain("custom-dashboard");
    expect(ids).toContain("case-board");
    expect(ids).toContain("prompt-library");
    expect(ids).toContain("intelligence");
    expect(ids).toContain("explore");
    expect(ids).toContain("scan");
    expect(ids).toContain("case-work");
    expect(ids).toContain("strategy");
    expect(ids).toContain("quality-gate");
  });
});

// ---------------------------------------------------------------------------
// isFeatureEnabled()
// ---------------------------------------------------------------------------

describe("isFeatureEnabled()", () => {
  it("returns defaultEnabled when toggle is not set", () => {
    const toggles: Record<string, boolean> = {};
    // All features in the registry default to true
    for (const feature of FEATURE_REGISTRY) {
      expect(isFeatureEnabled(feature.id, toggles)).toBe(feature.defaultEnabled);
    }
  });

  it("returns the toggle value when explicitly set", () => {
    expect(isFeatureEnabled("dashboard", { dashboard: false })).toBe(false);
    expect(isFeatureEnabled("dashboard", { dashboard: true })).toBe(true);
  });

  it("returns false for an unknown feature ID", () => {
    expect(isFeatureEnabled("non-existent", {})).toBe(false);
    expect(isFeatureEnabled("non-existent", { "non-existent": true })).toBe(false);
  });

  it("ignores toggles for non-existent features", () => {
    // Even if toggle says true, if it's not in registry, returns false
    expect(isFeatureEnabled("fake-feature", { "fake-feature": true })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getDefaultToggles()
// ---------------------------------------------------------------------------

describe("getDefaultToggles()", () => {
  it("returns a toggle for every registered feature", () => {
    const toggles = getDefaultToggles();
    for (const feature of FEATURE_REGISTRY) {
      expect(toggles).toHaveProperty(feature.id);
    }
  });

  it("each toggle matches the feature defaultEnabled", () => {
    const toggles = getDefaultToggles();
    for (const feature of FEATURE_REGISTRY) {
      expect(toggles[feature.id]).toBe(feature.defaultEnabled);
    }
  });

  it("has the same number of entries as FEATURE_REGISTRY", () => {
    const toggles = getDefaultToggles();
    expect(Object.keys(toggles)).toHaveLength(FEATURE_REGISTRY.length);
  });
});

// ---------------------------------------------------------------------------
// getFeatureByRoute()
// ---------------------------------------------------------------------------

describe("getFeatureByRoute()", () => {
  it("returns the dashboard feature for '/'", () => {
    const feature = getFeatureByRoute("/");
    expect(feature).toBeDefined();
    expect(feature!.id).toBe("dashboard");
  });

  it("returns the correct feature for exact route match", () => {
    const feature = getFeatureByRoute("/assembly");
    expect(feature).toBeDefined();
    expect(feature!.id).toBe("assembly");
  });

  it("returns the correct feature via prefix match", () => {
    const feature = getFeatureByRoute("/tools/pricing/detail");
    expect(feature).toBeDefined();
    expect(feature!.id).toBe("pricing");
  });

  it("returns the case-board feature for /case-board", () => {
    const feature = getFeatureByRoute("/case-board");
    expect(feature).toBeDefined();
    expect(feature!.id).toBe("case-board");
  });

  it("returns the prompt-library feature for /prompt-library", () => {
    const feature = getFeatureByRoute("/prompt-library");
    expect(feature).toBeDefined();
    expect(feature!.id).toBe("prompt-library");
  });

  it("returns the explore feature for /explore", () => {
    const feature = getFeatureByRoute("/explore");
    expect(feature).toBeDefined();
    expect(feature!.id).toBe("explore");
  });

  it("returns undefined for unregistered routes", () => {
    expect(getFeatureByRoute("/settings")).toBeUndefined();
    expect(getFeatureByRoute("/unknown-page")).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// getEnabledFeatures()
// ---------------------------------------------------------------------------

describe("getEnabledFeatures()", () => {
  it("returns all features when using default toggles", () => {
    const toggles = getDefaultToggles();
    const enabled = getEnabledFeatures(toggles);
    // All defaults are true in the current registry
    expect(enabled).toHaveLength(FEATURE_REGISTRY.length);
  });

  it("excludes disabled features", () => {
    const toggles = { ...getDefaultToggles(), dashboard: false };
    const enabled = getEnabledFeatures(toggles);
    expect(enabled.find((f) => f.id === "dashboard")).toBeUndefined();
    expect(enabled.length).toBe(FEATURE_REGISTRY.length - 1);
  });
});

// ---------------------------------------------------------------------------
// getDependents()
// ---------------------------------------------------------------------------

describe("getDependents()", () => {
  it("returns features that depend on the given feature", () => {
    const dependents = getDependents("dashboard");
    expect(dependents.length).toBeGreaterThan(0);
    expect(dependents.some((f) => f.id === "custom-dashboard")).toBe(true);
    expect(dependents.some((f) => f.id === "case-board")).toBe(true);
  });

  it("returns features that depend on knowledge-base", () => {
    const dependents = getDependents("knowledge-base");
    expect(dependents.some((f) => f.id === "pricing")).toBe(true);
  });

  it("returns dependents of quality (quality-gate depends on it)", () => {
    const dependents = getDependents("quality");
    expect(dependents.some((f) => f.id === "quality-gate")).toBe(true);
  });

  it("returns empty array for a feature with no dependents", () => {
    const dependents = getDependents("docgen");
    expect(dependents).toHaveLength(0);
  });

  it("returns empty array for unknown feature ID", () => {
    const dependents = getDependents("non-existent");
    expect(dependents).toHaveLength(0);
  });
});
