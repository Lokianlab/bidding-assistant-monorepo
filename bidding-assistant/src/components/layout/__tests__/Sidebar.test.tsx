import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createElement } from "react";

// ── mock next/navigation ───────────────────────────────────

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

// ── mock next/link ─────────────────────────────────────────

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: unknown; href: string }) =>
    createElement("a", { href }, children as never),
}));

// ── mock useSettings ───────────────────────────────────────

vi.mock("@/lib/context/settings-context", () => ({
  useSettings: () => ({
    settings: { featureToggles: {} },
    updateSettings: vi.fn(),
  }),
}));

// ── mock changelog ─────────────────────────────────────────

vi.mock("@/data/changelog", () => ({
  CHANGELOG: [{ version: "2.0.0", date: "2026-01-01", title: "test", changes: [] }],
}));

// ── helper：帶 SidebarProvider 渲染 ──────────────────────

async function renderSidebar() {
  const mod = await import("../Sidebar");
  const { Sidebar, SidebarProvider } = mod;
  return render(
    createElement(SidebarProvider, null, createElement(Sidebar))
  );
}

// ── 基本渲染 ───────────────────────────────────────────────
// 注意：Sidebar 同時渲染桌面版和手機版（同一個 sidebarContent），
// 所以每個文字/元素會出現兩次，需使用 getAllBy* 系列。

describe("Sidebar — 基本渲染", () => {
  it("顯示應用程式名稱「全能標案助理」", async () => {
    await renderSidebar();
    expect(screen.getAllByText("全能標案助理").length).toBeGreaterThan(0);
  });

  it("顯示「設定」區塊", async () => {
    await renderSidebar();
    // SETTINGS_ITEMS 永遠顯示（精簡後 3 項：外部連線、功能與設定、系統維護）
    expect(screen.getAllByText("功能與設定").length).toBeGreaterThan(0);
    expect(screen.getAllByText("外部連線").length).toBeGreaterThan(0);
  });

  it("顯示版本號", async () => {
    await renderSidebar();
    // 底部顯示 v{version}，桌面+手機各一個
    expect(screen.getAllByText(/^v\d/).length).toBeGreaterThan(0);
  });
});

// ── 收合/展開 ─────────────────────────────────────────────

describe("Sidebar — 收合/展開", () => {
  it("桌面版收合按鈕顯示 aria-label「收合側欄」", async () => {
    await renderSidebar();
    // 桌面版和手機版各有一個收合按鈕（sidebarContent 被用兩次）
    expect(screen.getAllByLabelText("收合側欄").length).toBeGreaterThan(0);
  });
});

// ── SidebarProvider / useSidebar ──────────────────────────

describe("SidebarProvider", () => {
  it("MobileMenuButton 點擊後 mobileOpen = true（不報錯）", async () => {
    const mod = await import("../Sidebar");
    const { SidebarProvider, MobileMenuButton } = mod;
    // 確認 MobileMenuButton 可以 render 且點擊不報錯
    const { container } = render(
      createElement(SidebarProvider, null, createElement(MobileMenuButton))
    );
    const btn = container.querySelector("button")!;
    expect(btn).toBeTruthy();
    fireEvent.click(btn); // 不應拋出錯誤
  });
});
