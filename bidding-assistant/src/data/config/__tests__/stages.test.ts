import { describe, it, expect } from "vitest";
import { STAGES, STAGE_MAP } from "../stages";

// ---------------------------------------------------------------------------
// STAGES array
// ---------------------------------------------------------------------------

describe("STAGES", () => {
  it("has 8 stages (L1 through L8)", () => {
    expect(STAGES).toHaveLength(8);
  });

  it("IDs are L1 through L8 in order", () => {
    for (let i = 0; i < 8; i++) {
      expect(STAGES[i].id).toBe(`L${i + 1}`);
    }
  });

  it("all IDs are unique", () => {
    const ids = STAGES.map((s) => s.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("every stage has all required fields", () => {
    for (const stage of STAGES) {
      expect(typeof stage.id).toBe("string");
      expect(stage.id.length).toBeGreaterThan(0);

      expect(typeof stage.name).toBe("string");
      expect(stage.name.length).toBeGreaterThan(0);

      expect(typeof stage.phase).toBe("string");
      expect(["投標", "評選"]).toContain(stage.phase);

      expect(typeof stage.triggerCommand).toBe("string");
      expect(stage.triggerCommand.length).toBeGreaterThan(0);

      expect(typeof stage.description).toBe("string");
      expect(stage.description.length).toBeGreaterThan(0);

      expect(typeof stage.promptFile).toBe("string");
      expect(stage.promptFile.length).toBeGreaterThan(0);

      expect(typeof stage.expectedOutput).toBe("string");
      expect(stage.expectedOutput.length).toBeGreaterThan(0);

      expect(typeof stage.dialogTips).toBe("string");
      expect(stage.dialogTips.length).toBeGreaterThan(0);
    }
  });

  it("trigger commands all start with /", () => {
    for (const stage of STAGES) {
      expect(stage.triggerCommand.startsWith("/")).toBe(true);
    }
  });

  it("trigger commands are unique", () => {
    const commands = STAGES.map((s) => s.triggerCommand);
    const uniqueCommands = new Set(commands);
    expect(uniqueCommands.size).toBe(commands.length);
  });

  it("names are unique", () => {
    const names = STAGES.map((s) => s.name);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
  });

  it("prompt files follow the stages/NN.md naming pattern", () => {
    for (const stage of STAGES) {
      expect(stage.promptFile).toMatch(/^stages\/\d{2}\.md$/);
    }
  });

  it("phases are correctly assigned (L1-L4 = bidding, L5-L8 = selection)", () => {
    for (let i = 0; i < 4; i++) {
      expect(STAGES[i].phase).toBe("投標");
    }
    for (let i = 4; i < 8; i++) {
      expect(STAGES[i].phase).toBe("評選");
    }
  });
});

// ---------------------------------------------------------------------------
// STAGE_MAP
// ---------------------------------------------------------------------------

describe("STAGE_MAP", () => {
  it("has an entry for every stage ID", () => {
    for (const stage of STAGES) {
      expect(STAGE_MAP).toHaveProperty(stage.id);
    }
  });

  it("has exactly 8 entries", () => {
    expect(Object.keys(STAGE_MAP)).toHaveLength(8);
  });

  it("maps each ID to the correct stage object", () => {
    for (const stage of STAGES) {
      expect(STAGE_MAP[stage.id]).toBe(stage);
    }
  });

  it("allows quick lookup by stage ID", () => {
    const l1 = STAGE_MAP["L1"];
    expect(l1).toBeDefined();
    expect(l1.name).toBe("戰略分析");
    expect(l1.triggerCommand).toBe("/分析");

    const l8 = STAGE_MAP["L8"];
    expect(l8).toBeDefined();
    expect(l8.name).toBe("模擬演練");
    expect(l8.triggerCommand).toBe("/模擬演練");
  });
});
