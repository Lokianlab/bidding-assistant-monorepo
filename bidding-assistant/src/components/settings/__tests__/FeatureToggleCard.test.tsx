import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { FeatureToggleCard } from "../FeatureToggleCard";
import type { FeatureDefinition } from "@/lib/modules/feature-registry";

// Mock Switch (Radix-based) to avoid jsdom issues
vi.mock("@/components/ui/switch", () => ({
  Switch: ({ checked, onCheckedChange }: { checked: boolean; onCheckedChange: (v: boolean) => void }) =>
    createElement("button", {
      role: "switch",
      "aria-checked": checked,
      onClick: () => onCheckedChange(!checked),
    }, checked ? "ON" : "OFF"),
}));

// ── Helpers ──────────────────────────────────────────────

function makeFeature(overrides: Partial<FeatureDefinition> = {}): FeatureDefinition {
  return {
    id: "test-feature",
    name: "測試模組",
    description: "這是測試模組的說明",
    icon: "🧪",
    routes: ["/test"],
    section: "intelligence",
    defaultEnabled: true,
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────

describe("FeatureToggleCard", () => {
  it("顯示功能名稱", () => {
    render(createElement(FeatureToggleCard, {
      feature: makeFeature({ name: "知識庫管理" }),
      enabled: true,
      onToggle: vi.fn(),
    }));
    expect(screen.getByText("知識庫管理")).toBeTruthy();
  });

  it("顯示功能說明", () => {
    render(createElement(FeatureToggleCard, {
      feature: makeFeature({ description: "管理五類知識庫" }),
      enabled: true,
      onToggle: vi.fn(),
    }));
    expect(screen.getByText("管理五類知識庫")).toBeTruthy();
  });

  it("顯示功能圖示", () => {
    render(createElement(FeatureToggleCard, {
      feature: makeFeature({ icon: "📚" }),
      enabled: true,
      onToggle: vi.fn(),
    }));
    expect(screen.getByText("📚")).toBeTruthy();
  });

  it("啟用時顯示 ON 狀態", () => {
    render(createElement(FeatureToggleCard, {
      feature: makeFeature(),
      enabled: true,
      onToggle: vi.fn(),
    }));
    expect(screen.getByRole("switch").getAttribute("aria-checked")).toBe("true");
  });

  it("停用時顯示 OFF 狀態", () => {
    render(createElement(FeatureToggleCard, {
      feature: makeFeature(),
      enabled: false,
      onToggle: vi.fn(),
    }));
    expect(screen.getByRole("switch").getAttribute("aria-checked")).toBe("false");
  });

  it("有依賴時顯示依賴 badge", () => {
    // strategy depends on intelligence and knowledge-base
    render(createElement(FeatureToggleCard, {
      feature: makeFeature({
        id: "strategy",
        name: "戰略分析",
        dependencies: ["intelligence", "knowledge-base"],
      }),
      enabled: true,
      onToggle: vi.fn(),
    }));
    expect(screen.getByText(/需要：/)).toBeTruthy();
  });

  it("無依賴時不顯示依賴 badge", () => {
    render(createElement(FeatureToggleCard, {
      feature: makeFeature({ dependencies: undefined }),
      enabled: true,
      onToggle: vi.fn(),
    }));
    expect(screen.queryByText(/需要：/)).toBeNull();
  });

  it("dashboard 停用時顯示依賴警告", () => {
    // dashboard has dependents (case-board, custom-dashboard)
    render(createElement(FeatureToggleCard, {
      feature: makeFeature({ id: "dashboard", name: "備標指揮部" }),
      enabled: false,
      onToggle: vi.fn(),
    }));
    expect(screen.getByText(/關閉此模組會影響/)).toBeTruthy();
  });

  it("dashboard 啟用時不顯示依賴警告", () => {
    render(createElement(FeatureToggleCard, {
      feature: makeFeature({ id: "dashboard", name: "備標指揮部" }),
      enabled: true,
      onToggle: vi.fn(),
    }));
    expect(screen.queryByText(/關閉此模組會影響/)).toBeNull();
  });
});
