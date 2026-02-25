import { describe, it, expect, vi } from "vitest";
import QualityPage from "../page";

// ── Mock next/navigation redirect ─────────────────────────
const { mockRedirect } = vi.hoisted(() => ({
  mockRedirect: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
}));

// ── Tests ────────────────────────────────────────────────
describe("QualityPage — redirect", () => {
  it("redirect 到 /tools/quality-gate?tab=text", () => {
    QualityPage();
    expect(mockRedirect).toHaveBeenCalledWith("/tools/quality-gate?tab=text");
  });
});
