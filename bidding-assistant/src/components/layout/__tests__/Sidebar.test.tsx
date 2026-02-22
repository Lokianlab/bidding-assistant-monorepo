// ====== Sidebar 元件測試 ======
// 測試重點：feature gating、pathname 高亮、section 分組、收合狀態

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Sidebar, SidebarProvider, MobileMenuButton } from "../Sidebar";

// ── Mocks ────────────────────────────────────────────────────

let mockPathname = "/";
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [k: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

const mockSettings = { featureToggles: {} as Record<string, boolean> };
vi.mock("@/lib/context/settings-context", () => ({
  useSettings: () => ({ settings: mockSettings }),
}));

vi.mock("@/data/changelog", () => ({
  CHANGELOG: [{ version: "2.0.0", date: "2026-01-01", title: "test", changes: [] }],
}));

// Use real feature-registry for integration-level testing

// ── Helpers ──────────────────────────────────────────────────

function renderSidebar(pathname = "/") {
  mockPathname = pathname;
  return render(
    <SidebarProvider>
      <Sidebar />
    </SidebarProvider>,
  );
}

// ── Tests ────────────────────────────────────────────────────

describe("Sidebar", () => {
  beforeEach(() => {
    mockPathname = "/";
    mockSettings.featureToggles = {};
    localStorage.clear();
  });

  describe("section rendering", () => {
    it("renders all default sections (core + tools + output + settings)", () => {
      renderSidebar();
      // Settings section is always present
      expect(screen.getAllByText("設定").length).toBeGreaterThanOrEqual(1);
    });

    it("renders core features by default", () => {
      renderSidebar();
      expect(screen.getAllByText("備標指揮部").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("提示詞組裝").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("績效檢視").length).toBeGreaterThanOrEqual(1);
    });

    it("renders tools features by default", () => {
      renderSidebar();
      expect(screen.getAllByText("知識庫管理").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("報價驗算").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("品質檢查").length).toBeGreaterThanOrEqual(1);
    });

    it("renders settings section items", () => {
      renderSidebar();
      expect(screen.getAllByText("操作指南").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("外部連線").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("公司資訊").length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("feature gating", () => {
    it("hides feature when toggle is false", () => {
      mockSettings.featureToggles = { performance: false };
      renderSidebar();
      expect(screen.queryByText("績效檢視")).toBeNull();
    });

    it("hides multiple features when toggles are false", () => {
      mockSettings.featureToggles = {
        performance: false,
        pricing: false,
        quality: false,
      };
      renderSidebar();
      expect(screen.queryByText("績效檢視")).toBeNull();
      expect(screen.queryByText("報價驗算")).toBeNull();
      expect(screen.queryByText("品質檢查")).toBeNull();
    });

    it("still shows settings when all features disabled", () => {
      mockSettings.featureToggles = {
        dashboard: false,
        assembly: false,
        performance: false,
        "knowledge-base": false,
        pricing: false,
        quality: false,
        docgen: false,
        "custom-dashboard": false,
        "case-board": false,
        "case-work": false,
        "prompt-library": false,
        intelligence: false,
        "quality-gate": false,
        scan: false,
        strategy: false,
      };
      renderSidebar();
      // Settings items still visible
      expect(screen.getAllByText("操作指南").length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("active route highlighting", () => {
    it("highlights dashboard on root path", () => {
      renderSidebar("/");
      const links = screen.getAllByRole("link");
      const dashboardLink = links.find((l) => l.getAttribute("href") === "/");
      expect(dashboardLink?.className).toContain("bg-sidebar-accent");
    });

    it("highlights performance on /performance path", () => {
      renderSidebar("/performance");
      const links = screen.getAllByRole("link");
      const perfLink = links.find((l) => l.getAttribute("href") === "/performance");
      expect(perfLink?.className).toContain("bg-sidebar-accent");
    });

    it("does not highlight non-active routes", () => {
      renderSidebar("/performance");
      const links = screen.getAllByRole("link");
      const assemblyLink = links.find((l) => l.getAttribute("href") === "/assembly");
      // Active class is "bg-sidebar-accent" (without hover: prefix)
      // Non-active has "hover:bg-sidebar-accent/50" but NOT standalone "bg-sidebar-accent"
      const classes = assemblyLink?.className.split(" ") ?? [];
      expect(classes).not.toContain("bg-sidebar-accent");
    });
  });

  describe("version display", () => {
    it("shows version in footer", () => {
      renderSidebar();
      expect(screen.getAllByText(/v2/).length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("collapse toggle", () => {
    it("renders collapse button with accessible label", () => {
      renderSidebar();
      expect(screen.getAllByLabelText("收合側欄").length).toBeGreaterThanOrEqual(1);
    });

    it("toggles collapse state on button click", () => {
      renderSidebar();
      const collapseBtn = screen.getAllByLabelText("收合側欄")[0];
      fireEvent.click(collapseBtn);
      // After collapse, the label changes to "展開側欄"
      expect(screen.getAllByLabelText("展開側欄").length).toBeGreaterThanOrEqual(1);
    });
  });
});

describe("MobileMenuButton", () => {
  it("renders with accessible label", () => {
    render(
      <SidebarProvider>
        <MobileMenuButton />
      </SidebarProvider>,
    );
    expect(screen.getByLabelText("開啟選單")).toBeTruthy();
  });
});

describe("SidebarProvider", () => {
  it("provides default context values", () => {
    const { container } = render(
      <SidebarProvider>
        <div data-testid="child">test</div>
      </SidebarProvider>,
    );
    expect(screen.getByTestId("child")).toBeTruthy();
    expect(container).toBeTruthy();
  });

  it("reads collapsed state from localStorage", () => {
    localStorage.setItem("sidebar-collapsed", "true");
    renderSidebar();
    // After hydration, should show "展開側欄" button
    expect(screen.getAllByLabelText("展開側欄").length).toBeGreaterThanOrEqual(1);
  });
});
