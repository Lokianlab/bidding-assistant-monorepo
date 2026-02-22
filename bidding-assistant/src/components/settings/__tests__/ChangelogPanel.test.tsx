import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import type { ReactNode } from "react";
import { vi } from "vitest";
import { ChangelogPanel } from "../ChangelogPanel";

// Mock ScrollArea (Radix-based)
vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: ReactNode }) =>
    createElement("div", null, children),
}));

// ── Tests ────────────────────────────────────────────────

describe("ChangelogPanel", () => {
  it("顯示標題「更新日誌」", () => {
    render(createElement(ChangelogPanel));
    expect(screen.getByText("更新日誌")).toBeTruthy();
  });

  it("顯示版本號", () => {
    render(createElement(ChangelogPanel));
    expect(screen.getByText("v1.1.0")).toBeTruthy();
    expect(screen.getByText("v1.0.0")).toBeTruthy();
  });

  it("顯示版本標題", () => {
    render(createElement(ChangelogPanel));
    expect(screen.getByText("自訂儀表板佈局 + 系統日誌")).toBeTruthy();
    expect(screen.getByText("初始版本")).toBeTruthy();
  });

  it("顯示變更類型 badge", () => {
    render(createElement(ChangelogPanel));
    // v1.1.0 has feature and improve types
    expect(screen.getAllByText("新功能").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("改進").length).toBeGreaterThanOrEqual(1);
  });

  it("顯示變更說明", () => {
    render(createElement(ChangelogPanel));
    expect(screen.getByText("儀表板卡片可自由拖曳排列和調整大小")).toBeTruthy();
  });

  it("顯示日期", () => {
    render(createElement(ChangelogPanel));
    expect(screen.getByText("2026-02-16")).toBeTruthy();
    expect(screen.getByText("2025-12-01")).toBeTruthy();
  });
});
