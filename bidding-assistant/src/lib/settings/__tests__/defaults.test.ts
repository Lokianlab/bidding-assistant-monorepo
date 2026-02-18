import { describe, it, expect } from "vitest";
import { DEFAULT_SETTINGS } from "../defaults";

// ---------------------------------------------------------------------------
// Top-level structure
// ---------------------------------------------------------------------------

describe("DEFAULT_SETTINGS", () => {
  it("has all expected top-level sections", () => {
    expect(DEFAULT_SETTINGS).toHaveProperty("document");
    expect(DEFAULT_SETTINGS).toHaveProperty("connections");
    expect(DEFAULT_SETTINGS).toHaveProperty("company");
    expect(DEFAULT_SETTINGS).toHaveProperty("modules");
    expect(DEFAULT_SETTINGS).toHaveProperty("workflow");
    expect(DEFAULT_SETTINGS).toHaveProperty("dashboardLayout");
  });

  it("yearlyGoal is defined and is a number", () => {
    expect(typeof DEFAULT_SETTINGS.yearlyGoal).toBe("number");
  });
});

// ---------------------------------------------------------------------------
// document section
// ---------------------------------------------------------------------------

describe("DEFAULT_SETTINGS.document", () => {
  const doc = DEFAULT_SETTINGS.document;

  it("has fonts with all required keys", () => {
    expect(typeof doc.fonts.body).toBe("string");
    expect(typeof doc.fonts.heading).toBe("string");
    expect(typeof doc.fonts.headerFooter).toBe("string");
    expect(Array.isArray(doc.fonts.customFonts)).toBe(true);
  });

  it("has fontSize with all heading levels", () => {
    expect(typeof doc.fontSize.body).toBe("number");
    expect(typeof doc.fontSize.h1).toBe("number");
    expect(typeof doc.fontSize.h2).toBe("number");
    expect(typeof doc.fontSize.h3).toBe("number");
    expect(typeof doc.fontSize.h4).toBe("number");
  });

  it("font sizes are in reasonable range (8-36)", () => {
    for (const size of Object.values(doc.fontSize)) {
      expect(size).toBeGreaterThanOrEqual(8);
      expect(size).toBeLessThanOrEqual(36);
    }
  });

  it("heading sizes decrease from h1 to h4", () => {
    expect(doc.fontSize.h1).toBeGreaterThanOrEqual(doc.fontSize.h2);
    expect(doc.fontSize.h2).toBeGreaterThanOrEqual(doc.fontSize.h3);
    expect(doc.fontSize.h3).toBeGreaterThanOrEqual(doc.fontSize.h4);
  });

  it("has page settings with valid defaults", () => {
    expect(doc.page.size).toBe("A4");
    expect(doc.page.lineSpacing).toBeGreaterThan(0);
    expect(doc.page.margins.top).toBeGreaterThan(0);
    expect(doc.page.margins.bottom).toBeGreaterThan(0);
    expect(doc.page.margins.left).toBeGreaterThan(0);
    expect(doc.page.margins.right).toBeGreaterThan(0);
  });

  it("has header and footer templates", () => {
    expect(typeof doc.header.template).toBe("string");
    expect(doc.header.template.length).toBeGreaterThan(0);
    expect(typeof doc.footer.template).toBe("string");
    expect(doc.footer.template.length).toBeGreaterThan(0);
  });

  it("has a driveNamingRule string", () => {
    expect(typeof doc.driveNamingRule).toBe("string");
    expect(doc.driveNamingRule.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// connections section
// ---------------------------------------------------------------------------

describe("DEFAULT_SETTINGS.connections", () => {
  const conn = DEFAULT_SETTINGS.connections;

  it("has notion connection with token and databaseId", () => {
    expect(conn.notion).toHaveProperty("token");
    expect(conn.notion).toHaveProperty("databaseId");
    expect(typeof conn.notion.token).toBe("string");
    expect(typeof conn.notion.databaseId).toBe("string");
  });

  it("has googleDrive connection settings", () => {
    expect(conn.googleDrive).toHaveProperty("refreshToken");
    expect(conn.googleDrive).toHaveProperty("sharedDriveFolderId");
  });

  it("has smugmug connection settings", () => {
    expect(conn.smugmug).toHaveProperty("apiKey");
    expect(conn.smugmug).toHaveProperty("apiSecret");
    expect(conn.smugmug).toHaveProperty("accessToken");
    expect(conn.smugmug).toHaveProperty("tokenSecret");
  });

  it("default connection values are empty strings (not undefined/null)", () => {
    expect(conn.notion.token).toBe("");
    expect(conn.notion.databaseId).toBe("");
    expect(conn.googleDrive.refreshToken).toBe("");
    expect(conn.smugmug.apiKey).toBe("");
  });
});

// ---------------------------------------------------------------------------
// company section
// ---------------------------------------------------------------------------

describe("DEFAULT_SETTINGS.company", () => {
  const co = DEFAULT_SETTINGS.company;

  it("has required company fields", () => {
    expect(typeof co.name).toBe("string");
    expect(co.name.length).toBeGreaterThan(0);
    expect(typeof co.taxId).toBe("string");
    expect(typeof co.brand).toBe("string");
    expect(co.brand.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// modules section
// ---------------------------------------------------------------------------

describe("DEFAULT_SETTINGS.modules", () => {
  const mod = DEFAULT_SETTINGS.modules;

  it("has kbMatrix that is a non-empty object", () => {
    expect(typeof mod.kbMatrix).toBe("object");
    expect(Object.keys(mod.kbMatrix).length).toBeGreaterThan(0);
  });

  describe("qualityRules", () => {
    it("has a non-empty blacklist", () => {
      expect(Array.isArray(mod.qualityRules.blacklist)).toBe(true);
      expect(mod.qualityRules.blacklist.length).toBeGreaterThan(0);
    });

    it("all blacklist entries are non-empty strings", () => {
      for (const word of mod.qualityRules.blacklist) {
        expect(typeof word).toBe("string");
        expect(word.length).toBeGreaterThan(0);
      }
    });

    it("has a non-empty terminology list", () => {
      expect(Array.isArray(mod.qualityRules.terminology)).toBe(true);
      expect(mod.qualityRules.terminology.length).toBeGreaterThan(0);
    });

    it("each terminology entry has wrong and correct fields", () => {
      for (const entry of mod.qualityRules.terminology) {
        expect(typeof entry.wrong).toBe("string");
        expect(typeof entry.correct).toBe("string");
        expect(entry.wrong.length).toBeGreaterThan(0);
        expect(entry.correct.length).toBeGreaterThan(0);
      }
    });

    it("ironLawEnabled has boolean values", () => {
      for (const value of Object.values(mod.qualityRules.ironLawEnabled)) {
        expect(typeof value).toBe("boolean");
      }
    });

    it("customRules is an empty array by default", () => {
      expect(mod.qualityRules.customRules).toEqual([]);
    });
  });

  describe("pricing", () => {
    it("has valid taxRate and managementFeeRate", () => {
      expect(typeof mod.pricing.taxRate).toBe("number");
      expect(mod.pricing.taxRate).toBeGreaterThan(0);
      expect(mod.pricing.taxRate).toBeLessThan(1);

      expect(typeof mod.pricing.managementFeeRate).toBe("number");
      expect(mod.pricing.managementFeeRate).toBeGreaterThan(0);
      expect(mod.pricing.managementFeeRate).toBeLessThan(1);
    });

    it("marketRates is an object (empty by default)", () => {
      expect(typeof mod.pricing.marketRates).toBe("object");
    });
  });
});

// ---------------------------------------------------------------------------
// workflow section
// ---------------------------------------------------------------------------

describe("DEFAULT_SETTINGS.workflow", () => {
  const wf = DEFAULT_SETTINGS.workflow;

  it("has stages array matching STAGES config (8 stages)", () => {
    expect(Array.isArray(wf.stages)).toBe(true);
    expect(wf.stages).toHaveLength(8);
  });

  it("each stage has id, name, triggerCommand, and guidanceText", () => {
    for (const stage of wf.stages) {
      expect(typeof stage.id).toBe("string");
      expect(stage.id.length).toBeGreaterThan(0);
      expect(typeof stage.name).toBe("string");
      expect(stage.name.length).toBeGreaterThan(0);
      expect(typeof stage.triggerCommand).toBe("string");
      expect(stage.triggerCommand.length).toBeGreaterThan(0);
      expect(typeof stage.guidanceText).toBe("string");
    }
  });

  it("stage IDs are L1 through L8", () => {
    const stageIds = wf.stages.map((s) => s.id);
    for (let i = 1; i <= 8; i++) {
      expect(stageIds).toContain(`L${i}`);
    }
  });

  it("has autoStatusRules array with 8 rules", () => {
    expect(Array.isArray(wf.autoStatusRules)).toBe(true);
    expect(wf.autoStatusRules).toHaveLength(8);
  });

  it("each autoStatusRule has id, trigger, actions, and enabled", () => {
    for (const rule of wf.autoStatusRules) {
      expect(typeof rule.id).toBe("string");
      expect(typeof rule.trigger).toBe("string");
      expect(Array.isArray(rule.actions)).toBe(true);
      expect(rule.actions.length).toBeGreaterThan(0);
      expect(typeof rule.enabled).toBe("boolean");
    }
  });

  it("viewOverrides is an empty object by default", () => {
    expect(wf.viewOverrides).toEqual({});
  });

  it("customViews is an empty array by default", () => {
    expect(wf.customViews).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// dashboardLayout
// ---------------------------------------------------------------------------

describe("DEFAULT_SETTINGS.dashboardLayout", () => {
  it("is defined and not null", () => {
    expect(DEFAULT_SETTINGS.dashboardLayout).toBeDefined();
    expect(DEFAULT_SETTINGS.dashboardLayout).not.toBeNull();
  });
});
