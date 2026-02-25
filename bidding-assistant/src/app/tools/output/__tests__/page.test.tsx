import { describe, it, expect, vi } from "vitest";
import OutputPage from "../page";

// ── Mock next/navigation redirect ─────────────────────────
const { mockRedirect } = vi.hoisted(() => ({
  mockRedirect: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
}));

// ── Tests ────────────────────────────────────────────────
describe("OutputPage — redirect", () => {
  it("redirect 到 /tools/quality-gate?tab=output", () => {
    OutputPage();
    expect(mockRedirect).toHaveBeenCalledWith("/tools/quality-gate?tab=output");
  });
});
