import { describe, it, expect } from "vitest";
import { COST_CATEGORIES } from "../constants";

describe("COST_CATEGORIES", () => {
  it("包含三個費用類別", () => {
    expect(COST_CATEGORIES).toHaveLength(3);
  });

  it("包含人事費、業務費、雜支", () => {
    expect(COST_CATEGORIES).toContain("人事費");
    expect(COST_CATEGORIES).toContain("業務費");
    expect(COST_CATEGORIES).toContain("雜支");
  });
});
