import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createElement } from "react";
import { EmergencyCopyPanel } from "../EmergencyCopyPanel";
import { STAGES } from "@/data/config/stages";

// ── mock toast ────────────────────────────────────────────

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// ── 基本渲染 ───────────────────────────────────────────────

describe("EmergencyCopyPanel — 基本渲染", () => {
  it("顯示「選擇階段」標籤", () => {
    render(createElement(EmergencyCopyPanel, {}));
    expect(screen.getByText("選擇階段")).toBeTruthy();
  });

  it("顯示所有階段按鈕", () => {
    render(createElement(EmergencyCopyPanel, {}));
    for (const stage of STAGES) {
      expect(screen.getByText(stage.name)).toBeTruthy();
    }
  });

  it("顯示階段 ID badge", () => {
    render(createElement(EmergencyCopyPanel, {}));
    // STAGES 中每個階段都有 ID badge（如 L1, L2...）
    expect(screen.getAllByText("L1").length).toBeGreaterThan(0);
  });

  it("初始選中 L1（戰略分析）", () => {
    render(createElement(EmergencyCopyPanel, {}));
    // L1 的名稱「戰略分析」應顯示在右側面板
    expect(screen.getByText("戰略分析")).toBeTruthy();
  });

  it("顯示「組裝並複製到剪貼簿」按鈕", () => {
    render(createElement(EmergencyCopyPanel, {}));
    expect(screen.getByText("組裝並複製到剪貼簿")).toBeTruthy();
  });

  it("顯示「將載入的檔案」標籤", () => {
    render(createElement(EmergencyCopyPanel, {}));
    expect(screen.getByText(/將載入的檔案/)).toBeTruthy();
  });

  it("顯示「複製後請到 Claude.ai 貼上使用」提示", () => {
    render(createElement(EmergencyCopyPanel, {}));
    expect(screen.getByText(/Claude\.ai/)).toBeTruthy();
  });
});

// ── 階段切換 ────────────────────────────────────────────────

describe("EmergencyCopyPanel — 階段切換", () => {
  it("點擊其他階段按鈕切換選中", () => {
    render(createElement(EmergencyCopyPanel, {}));
    // 找 L2 的階段按鈕
    const l2Stage = STAGES.find((s) => s.id === "L2");
    if (!l2Stage) return;
    const l2Btn = screen.getByText(l2Stage.name).closest("button");
    fireEvent.click(l2Btn!);
    // L2 的名稱應顯示在右側面板 heading
    const heading = screen.getByText(l2Stage.name);
    expect(heading).toBeTruthy();
  });
});
