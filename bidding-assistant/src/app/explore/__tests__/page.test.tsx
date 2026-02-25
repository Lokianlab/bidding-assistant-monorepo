import { describe, it, expect, vi } from "vitest";
import ExplorePage from "../page";

// ── Mock next/navigation redirect ─────────────────────────
const { mockRedirect } = vi.hoisted(() => ({
  mockRedirect: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
}));

// ── Tests ────────────────────────────────────────────────
describe("ExplorePage — redirect", () => {
  it("redirect 到 /intelligence?tab=explore", () => {
    ExplorePage();
    expect(mockRedirect).toHaveBeenCalledWith("/intelligence?tab=explore");
  });
});
