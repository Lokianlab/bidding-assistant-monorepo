import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { SettingsProvider } from "@/lib/context/settings-context";
import { FeatureGuard } from "../FeatureGuard";

const STORAGE_KEY = "bidding-assistant-settings";

// Mock next/navigation
const mockPathname = vi.fn<() => string>().mockReturnValue("/");
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
}));

// Mock next/link to render a simple anchor
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) =>
    createElement("a", { href }, children),
}));

function renderWithProvider(pathname: string, featureToggles?: Record<string, boolean>) {
  mockPathname.mockReturnValue(pathname);
  if (featureToggles) {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ featureToggles }),
    );
  }
  return render(
    createElement(
      SettingsProvider,
      null,
      createElement(FeatureGuard, null, createElement("div", { "data-testid": "child" }, "子內容")),
    ),
  );
}

beforeEach(() => {
  localStorage.clear();
  mockPathname.mockReturnValue("/");
});

describe("FeatureGuard", () => {
  it("renders children for a default-enabled feature route", () => {
    renderWithProvider("/");
    expect(screen.getByTestId("child")).toBeTruthy();
    expect(screen.getByText("子內容")).toBeTruthy();
  });

  it("renders children for a route not in any feature (unguarded)", () => {
    renderWithProvider("/settings/modules");
    expect(screen.getByTestId("child")).toBeTruthy();
  });

  it("shows disabled message when feature is explicitly disabled", () => {
    renderWithProvider("/tools/quality-gate", { "quality-gate": false });
    expect(screen.queryByTestId("child")).toBeNull();
    expect(screen.getByText(/模組已關閉/)).toBeTruthy();
  });

  it("disabled message contains a link to settings", () => {
    renderWithProvider("/tools/quality-gate", { "quality-gate": false });
    const link = screen.getByText(/前往功能模組管理/);
    expect(link.closest("a")?.getAttribute("href")).toBe("/settings/modules");
  });

  it("shows feature name in the disabled message", () => {
    renderWithProvider("/tools/quality-gate", { "quality-gate": false });
    expect(screen.getByText(/品質閘門/)).toBeTruthy();
  });

  it("renders children for a deep sub-route of enabled feature", () => {
    // /tools/quality-gate/something should match quality-gate feature (prefix match)
    renderWithProvider("/tools/quality-gate/details");
    expect(screen.getByTestId("child")).toBeTruthy();
  });

  it("blocks a deep sub-route of disabled feature", () => {
    renderWithProvider("/tools/quality-gate/details", { "quality-gate": false });
    expect(screen.queryByTestId("child")).toBeNull();
    expect(screen.getByText(/模組已關閉/)).toBeTruthy();
  });

  it("renders children when multiple features are enabled", () => {
    renderWithProvider("/performance", {
      dashboard: true,
      performance: true,
    });
    expect(screen.getByTestId("child")).toBeTruthy();
  });
});
