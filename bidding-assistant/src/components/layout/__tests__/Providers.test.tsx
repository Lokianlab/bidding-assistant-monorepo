import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { createElement } from "react";
import { Providers } from "../Providers";

// ── mock 依賴元件 ─────────────────────────────────────────

vi.mock("@/components/ui/tooltip", () => ({
  TooltipProvider: ({ children }: { children: unknown }) =>
    createElement("div", { "data-testid": "tooltip-provider" }, children as never),
}));

vi.mock("@/components/ui/sonner", () => ({
  Toaster: () => createElement("div", { "data-testid": "toaster" }),
}));

vi.mock("@/lib/context/settings-context", () => ({
  SettingsProvider: ({ children }: { children: unknown }) =>
    createElement("div", { "data-testid": "settings-provider" }, children as never),
}));

// ── 測試 ───────────────────────────────────────────────────

describe("Providers", () => {
  it("SettingsProvider 始終包裹 children", async () => {
    await act(async () => {
      render(createElement(Providers, null, createElement("span", { "data-testid": "child" })));
    });

    const settingsProvider = screen.getByTestId("settings-provider");
    expect(settingsProvider).toBeTruthy();
    expect(screen.getByTestId("child")).toBeTruthy();
  });

  it("mount 後渲染 TooltipProvider", async () => {
    await act(async () => {
      render(createElement(Providers, null, createElement("span", null, "content")));
    });

    expect(screen.getByTestId("tooltip-provider")).toBeTruthy();
  });

  it("mount 後渲染 Toaster", async () => {
    await act(async () => {
      render(createElement(Providers, null, createElement("span", null, "content")));
    });

    expect(screen.getByTestId("toaster")).toBeTruthy();
  });

  it("children 的文字內容在 mount 後可見", async () => {
    await act(async () => {
      render(createElement(Providers, null, "子元件文字"));
    });

    expect(screen.getByText("子元件文字")).toBeTruthy();
  });
});
