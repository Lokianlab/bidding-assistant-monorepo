import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { StageFileList } from "../StageFileList";
import { STAGES } from "@/data/config/stages";
import { RULE_MAP } from "@/data/config/prompt-assembly";

// ── Radix Dialog 需要 scrollIntoView ─────────────────────

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

// ── mock toast ────────────────────────────────────────────

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// ── Helper ──────────────────────────────────────────────────

// 取第一個有對應 RULE_MAP 的 stage
const stageWithRule = STAGES.find((s) => RULE_MAP[s.id]);

// ── open=false ─────────────────────────────────────────────

describe("StageFileList — open=false", () => {
  it("open=false 時 Dialog 不顯示內容", () => {
    if (!stageWithRule) return;
    render(
      createElement(StageFileList, {
        stage: stageWithRule,
        open: false,
        onClose: vi.fn(),
      })
    );
    // Dialog 關閉時標題不可見
    expect(screen.queryByText(new RegExp(stageWithRule.id))).toBeNull();
  });
});

// ── open=true ──────────────────────────────────────────────

describe("StageFileList — open=true", () => {
  it("顯示階段標題（ID + name）", () => {
    if (!stageWithRule) return;
    render(
      createElement(StageFileList, {
        stage: stageWithRule,
        open: true,
        onClose: vi.fn(),
      })
    );
    // 標題中包含 stage.id
    expect(screen.getAllByText(new RegExp(stageWithRule.id)).length).toBeGreaterThan(0);
  });

  it("顯示觸發指令", () => {
    if (!stageWithRule) return;
    render(
      createElement(StageFileList, {
        stage: stageWithRule,
        open: true,
        onClose: vi.fn(),
      })
    );
    expect(screen.getByText(new RegExp(stageWithRule.triggerCommand))).toBeTruthy();
  });

  it("顯示「系統核心（永遠載入）」", () => {
    if (!stageWithRule) return;
    render(
      createElement(StageFileList, {
        stage: stageWithRule,
        open: true,
        onClose: vi.fn(),
      })
    );
    expect(screen.getByText("系統核心（永遠載入）")).toBeTruthy();
  });

  it("顯示「階段提示詞」", () => {
    if (!stageWithRule) return;
    render(
      createElement(StageFileList, {
        stage: stageWithRule,
        open: true,
        onClose: vi.fn(),
      })
    );
    expect(screen.getByText("階段提示詞")).toBeTruthy();
  });

  it("顯示「一鍵複製必要檔案」按鈕", () => {
    if (!stageWithRule) return;
    render(
      createElement(StageFileList, {
        stage: stageWithRule,
        open: true,
        onClose: vi.fn(),
      })
    );
    expect(screen.getByText(/一鍵複製必要檔案/)).toBeTruthy();
  });
});

// ── 無對應 RULE_MAP ────────────────────────────────────────

describe("StageFileList — 無對應 rule", () => {
  it("stage 無 RULE_MAP 時 render null", () => {
    const fakeStage = {
      id: "L99",
      name: "不存在的階段",
      phase: "投標" as const,
      triggerCommand: "/test",
      description: "測試",
      promptFile: "test.md",
      expectedOutput: "",
      dialogTips: "",
    };
    const { container } = render(
      createElement(StageFileList, {
        stage: fakeStage,
        open: true,
        onClose: vi.fn(),
      })
    );
    expect(container.firstChild).toBeNull();
  });
});
