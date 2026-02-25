import { describe, it, expect, vi } from "vitest";
import DocxPage from "../page";

// ── Mock next/navigation redirect ─────────────────────────
const { mockRedirect } = vi.hoisted(() => ({
  mockRedirect: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
}));

// ── Tests ────────────────────────────────────────────────
describe("DocxPage — redirect", () => {
  it("redirect 到 /tools/quality-gate?tab=output", () => {
    DocxPage();
    expect(mockRedirect).toHaveBeenCalledWith("/tools/quality-gate?tab=output");
  });
});
